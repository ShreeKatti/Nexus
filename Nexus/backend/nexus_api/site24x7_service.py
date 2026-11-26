import logging
import math
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit

import requests

from .database import get_connection
from .datasource_service import decrypt_secret_value, decrypt_secrets

logger = logging.getLogger(__name__)
REQUEST_TIMEOUT_SECONDS = 30
AVAILABILITY_PERIOD = 5
AVAILABILITY_SYNC_INTERVAL_SECONDS = 300


class Site24x7APIError(RuntimeError):
    pass


def _zoho_domain(endpoint):
    host = urlsplit(endpoint).hostname or ""
    return {
        "www.site24x7.com": "zoho.com",
        "www.site24x7.in": "zoho.in",
        "www.site24x7.eu": "zoho.eu",
        "www.site24x7.com.au": "zoho.com.au",
        "www.site24x7.com.sg": "zoho.com.sg",
        "www.site24x7.sa": "zoho.sa",
        "www.site24x7.cn": "zoho.com.cn",
    }[host]


def refresh_access_token(credentials, endpoint):
    token_url = f"https://accounts.{_zoho_domain(endpoint)}/oauth/v2/token"
    try:
        response = requests.post(
            token_url,
            data={
                "client_id": credentials["clientId"],
                "client_secret": credentials["clientSecret"],
                "refresh_token": credentials["refreshToken"],
                "grant_type": "refresh_token",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        raise Site24x7APIError(
            "Site24x7 OAuth failed. Check the client credentials, refresh token, and data-center region."
        ) from error

    access_token = payload.get("access_token") if isinstance(payload, dict) else None
    if not isinstance(access_token, str) or not access_token:
        raise Site24x7APIError("Site24x7 OAuth did not return an access token.")
    return access_token


def _get_headers(access_token):
    return {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Accept": "application/json; version=2.0",
    }


def fetch_monitors(access_token, endpoint):
    api_url = f"{endpoint.rstrip('/')}/monitors"
    try:
        response = requests.get(
            api_url,
            headers=_get_headers(access_token),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        raise Site24x7APIError(
            "Unable to retrieve monitors from Site24x7. Check the token permissions and API region."
        ) from error

    monitors = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(monitors, list):
        raise Site24x7APIError("Site24x7 returned an unexpected monitors response.")
    return monitors


def test_site24x7_connection(credentials, endpoint):
    access_token = refresh_access_token(credentials, endpoint)
    return access_token, fetch_monitors(access_token, endpoint)


def _number(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _monitor_status(state):
    normalized = str(state).strip().lower()
    if normalized in {"0", "up", "healthy", "ok"}:
        return 1.0, "UP"
    if normalized in {"1", "down", "critical"}:
        return 0.0, "DOWN"
    return -1.0, "Unknown"


def _availability(access_token, endpoint, monitor_id):
    url = f"{endpoint.rstrip('/')}/availability/monitor/{quote(str(monitor_id), safe='')}"
    try:
        response = requests.get(
            url,
            headers=_get_headers(access_token),
            params={"period": AVAILABILITY_PERIOD},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data") or {} if isinstance(payload, dict) else {}
        summary = data.get("summary_details") or {} if isinstance(data, dict) else {}
        value = _number(summary.get("availability_percentage"))
    except (requests.RequestException, ValueError, TypeError, AttributeError) as error:
        logger.warning("Site24x7 availability lookup failed for monitor %s: %s", monitor_id, error)
        return None

    if value is None or not 0 <= value <= 100:
        logger.warning("Site24x7 returned an invalid availability value for monitor %s.", monitor_id)
        return None
    return value


def _metric_rows(monitor, access_token, endpoint, include_availability):
    monitor_id = monitor.get("monitor_id")
    if monitor_id is None:
        logger.warning("Skipping a Site24x7 monitor without a monitor ID.")
        return []

    monitor_id = str(monitor_id)[:100]
    host_name = str(monitor.get("display_name") or monitor_id)[:150]
    status_value, status = _monitor_status(monitor.get("state"))
    rows = [(monitor_id, host_name, "Monitor status", status_value, "state", status)]

    response_time = _number(monitor.get("response_time"))
    if response_time is not None:
        rows.append((monitor_id, host_name, "Response time", response_time, "ms", status))

    availability = _number(
        monitor.get("availability_percentage", monitor.get("availability"))
    )
    if include_availability:
        availability = _availability(access_token, endpoint, monitor_id)
        time.sleep(0.1)
    if availability is not None and 0 <= availability <= 100:
        rows.append((monitor_id, host_name, "Availability", availability, "%", status))
    return rows


def persist_site24x7_metrics(cursor, datasource_id, monitors, access_token, endpoint, recorded_at, include_availability=False):
    metric_rows = []
    for monitor in monitors:
        if not isinstance(monitor, dict):
            logger.warning("Skipping a malformed Site24x7 monitor record.")
            continue
        metric_rows.extend(
            _metric_rows(monitor, access_token, endpoint, include_availability)
        )

    if not metric_rows:
        return

    cursor.executemany(
        """
        INSERT INTO dbo.NexusSite24x7Metrics
            (metricID, datasourceID, monitorID, hostName, metricName, metricValue, unit, status, recordedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                str(uuid.uuid4()),
                datasource_id,
                monitor_id,
                host_name,
                metric_name,
                metric_value,
                unit,
                status,
                recorded_at,
            )
            for monitor_id, host_name, metric_name, metric_value, unit, status in metric_rows
        ],
    )


def _credentials_from_row(encrypted_secrets, encrypted_access_token):
    if encrypted_secrets:
        credentials = decrypt_secrets(encrypted_secrets)
        if all(credentials.get(key) for key in ("clientId", "clientSecret", "refreshToken")):
            return credentials, None
    if encrypted_access_token:
        return None, decrypt_secret_value(encrypted_access_token)
    raise Site24x7APIError("Site24x7 credentials are missing. Reconfigure this data source.")


def sync_site24x7_datasource(datasource_id, include_availability=False):
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT secretsEncrypted, SITE24X7_ACCESS_TOKEN, SITE24X7_ENDPOINT
            FROM dbo.NexusDataSources
            WHERE UniqueID = ? AND provider = ?
            """,
            datasource_id,
            "Site24x7",
        )
        datasource = cursor.fetchone()
        if not datasource:
            return

        encrypted_secrets, encrypted_access_token, endpoint = datasource
        credentials, legacy_access_token = _credentials_from_row(
            encrypted_secrets, encrypted_access_token
        )
        access_token = (
            refresh_access_token(credentials, endpoint)
            if credentials
            else legacy_access_token
        )
        monitors = fetch_monitors(access_token, endpoint)
        recorded_at = datetime.now(timezone.utc).replace(tzinfo=None)
        persist_site24x7_metrics(
            cursor,
            datasource_id,
            monitors,
            access_token,
            endpoint,
            recorded_at,
            include_availability=include_availability,
        )
        connection.commit()


def _configured_sync_interval():
    try:
        return max(30, int(os.getenv("SITE24X7_SYNC_INTERVAL_SECONDS", "60")))
    except ValueError as error:
        raise RuntimeError("SITE24X7_SYNC_INTERVAL_SECONDS must be an integer.") from error


def _sync_loop(app, interval):
    last_availability_sync = {}

    while True:
        try:
            with app.app_context():
                with get_connection() as connection:
                    cursor = connection.cursor()
                    cursor.execute(
                        """
                        SELECT UniqueID
                        FROM dbo.NexusDataSources
                        WHERE provider = ?
                        """,
                        "Site24x7",
                    )
                    datasource_ids = [str(row[0]) for row in cursor.fetchall()]

                now = time.monotonic()
                for datasource_id in datasource_ids:
                    include_availability = (
                        now - last_availability_sync.get(datasource_id, 0)
                        >= AVAILABILITY_SYNC_INTERVAL_SECONDS
                    )
                    try:
                        sync_site24x7_datasource(
                            datasource_id,
                            include_availability=include_availability,
                        )
                    except Exception:
                        app.logger.exception(
                            "Site24x7 sync failed for datasource %s.", datasource_id
                        )
                    else:
                        if include_availability:
                            last_availability_sync[datasource_id] = now

                stale_ids = set(last_availability_sync) - set(datasource_ids)
                for datasource_id in stale_ids:
                    del last_availability_sync[datasource_id]
        except Exception:
            app.logger.exception("Site24x7 polling cycle failed.")

        time.sleep(interval)


_worker_lock = threading.Lock()
_worker_started = False


def start_site24x7_sync_worker(app):
    global _worker_started
    interval = _configured_sync_interval()
    with _worker_lock:
        if _worker_started:
            return
        worker = threading.Thread(
            target=_sync_loop,
            args=(app, interval),
            name="site24x7-sync",
            daemon=True,
        )
        worker.start()
        _worker_started = True
