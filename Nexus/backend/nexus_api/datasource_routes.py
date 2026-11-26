import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from .database import get_connection
from .datasource_service import (
    datasource_response_new,
    encrypt_secrets,
    encrypt_secret_value,
    parse_user_id,
    validate_datasource_payload,
)
from .site24x7_service import (
    persist_site24x7_metrics,
    test_site24x7_connection,
)

datasource_blueprint = Blueprint("datasources", __name__)


@datasource_blueprint.get("/api/datasources")
def list_datasources():
    user_id = parse_user_id(request.args.get("userId"))
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT UniqueID, displayName, provider, endpoint, logoUrl, settingsJson, secretsEncrypted, CATO_API_KEY, CATO_ACCOUNT_ID, CATO_SITE_IDS, 
                   SITE24X7_ACCESS_TOKEN, SOLARWINDS_USERNAME, updatedAt
            FROM dbo.NexusDataSources
            WHERE ownerUniqueID = ?
            ORDER BY updatedAt DESC
            """,
            user_id,
        )
        datasources = [datasource_response_new(row) for row in cursor.fetchall()]
    return jsonify({"datasources": datasources})


@datasource_blueprint.get("/api/dashboard/overview")
def dashboard_overview():
    user_id = parse_user_id(request.args.get("userId"))
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            WITH LatestMetrics AS (
                SELECT metrics.datasourceID, metrics.monitorID, metrics.hostName, metrics.metricName,
                       metrics.metricValue, metrics.status, metrics.recordedAt,
                       ROW_NUMBER() OVER (
                           PARTITION BY metrics.datasourceID, metrics.monitorID, metrics.metricName
                           ORDER BY metrics.recordedAt DESC, metrics.metricID DESC
                       ) AS readingRank
                FROM dbo.NexusSite24x7Metrics AS metrics
                INNER JOIN dbo.NexusDataSources AS sources
                    ON sources.UniqueID = metrics.datasourceID
                WHERE sources.ownerUniqueID = ?
                  AND sources.provider = ?
                  AND metrics.monitorID IS NOT NULL
            )
            SELECT
                COUNT(CASE WHEN metricName = 'Monitor status' THEN 1 END),
                COALESCE(SUM(CASE WHEN metricName = 'Monitor status' AND status = 'UP' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN metricName = 'Monitor status' AND status <> 'UP' THEN 1 ELSE 0 END), 0),
                AVG(CASE WHEN metricName = 'Availability' THEN metricValue END),
                MAX(recordedAt)
            FROM LatestMetrics
            WHERE readingRank = 1
            """,
            user_id,
            "Site24x7",
        )
        overview = cursor.fetchone()

    return jsonify({
        "monitors": {
            "total": overview[0],
            "up": overview[1],
            "alerts": overview[2],
        },
        "availability": round(overview[3], 1) if overview[3] is not None else None,
        "lastSyncedAt": overview[4].isoformat(sep=" ", timespec="seconds")
        if overview[4]
        else None,
    })


@datasource_blueprint.post("/api/datasources")
def create_datasource():
    payload = request.get_json(silent=True) or {}
    result = validate_datasource_payload(payload)
    user_id, name, provider = result[0], result[1], result[2]
    endpoint = result[3]
    api_key_or_token = result[4]
    account_id = result[5]
    site_ids = result[6]
    
    datasource_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    site24x7_access_token = None
    site24x7_monitors = None
    if provider == "Site24x7":
        site24x7_access_token, site24x7_monitors = test_site24x7_connection(
            api_key_or_token, endpoint
        )

    with get_connection() as connection:
        cursor = connection.cursor()
        
        if provider == "Cato":
            cursor.execute(
                """
                INSERT INTO dbo.NexusDataSources
                    (UniqueID, ownerUniqueID, displayName, provider, endpoint, logoUrl, settingsJson, secretsEncrypted,
                     CATO_API_URL, CATO_API_KEY, CATO_ACCOUNT_ID, CATO_SITE_IDS, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                datasource_id, user_id, name, provider, endpoint, None, None, None,
                endpoint, encrypt_secret_value(api_key_or_token), account_id, site_ids,
                now, now,
            )
            settings = {"accountId": account_id, "siteIds": site_ids}
        
        elif provider == "Site24x7":
            cursor.execute(
                """
                INSERT INTO dbo.NexusDataSources
                    (UniqueID, ownerUniqueID, displayName, provider, endpoint, logoUrl, settingsJson, secretsEncrypted,
                     SITE24X7_ENDPOINT, SITE24X7_ACCESS_TOKEN, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                datasource_id, user_id, name, provider, endpoint, None, None, encrypt_secrets(api_key_or_token),
                endpoint, None,
                now, now,
            )
            persist_site24x7_metrics(
                cursor,
                datasource_id,
                site24x7_monitors,
                site24x7_access_token,
                endpoint,
                now,
            )
            settings = {}
        
        elif provider == "Solarwinds":
            cursor.execute(
                """
                INSERT INTO dbo.NexusDataSources
                    (UniqueID, ownerUniqueID, displayName, provider, endpoint, logoUrl, settingsJson, secretsEncrypted,
                     SOLARWINDS_ENDPOINT, SOLARWINDS_USERNAME, SOLARWINDS_PASSWORD, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                datasource_id, user_id, name, provider, endpoint, None, None, None,
                endpoint, encrypt_secret_value(api_key_or_token), encrypt_secret_value(account_id),
                now, now,
            )
            settings = {}
        
        connection.commit()

    response_datasource = {
        "id": datasource_id,
        "databaseId": True,
        "name": name,
        "type": provider,
        "endpoint": endpoint,
        "logoUrl": None,
        "settings": settings,
        "configuredAt": now.isoformat(sep=" ", timespec="seconds"),
    }
    if provider != "Site24x7":
        response_datasource["demoData"] = {
            "hosts": 3,
            "metrics": 12,
            "status": "Demo data imported",
        }
    return jsonify({"datasource": response_datasource}), 201

@datasource_blueprint.put("/api/datasources/<datasource_id>")
def update_datasource(datasource_id):
    payload = request.get_json(silent=True) or {}
    result = validate_datasource_payload(payload)
    user_id, name, provider = result[0], result[1], result[2]
    endpoint = result[3]
    api_key_or_token = result[4]
    account_id = result[5]
    site_ids = result[6]
    
    datasource_id = str(uuid.UUID(datasource_id))
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT UniqueID FROM dbo.NexusDataSources
            WHERE UniqueID = ? AND ownerUniqueID = ?
            """,
            datasource_id, user_id,
        )
        if not cursor.fetchone():
            return jsonify({"message": "Data source was not found."}), 404

        if provider == "Cato":
            cursor.execute(
                """
                UPDATE dbo.NexusDataSources
                SET displayName = ?, provider = ?, endpoint = ?, CATO_API_URL = ?, CATO_API_KEY = ?, 
                    CATO_ACCOUNT_ID = ?, CATO_SITE_IDS = ?, updatedAt = ?
                WHERE UniqueID = ? AND ownerUniqueID = ?
                """,
                name, provider, endpoint, endpoint, encrypt_secret_value(api_key_or_token), account_id, site_ids, now,
                datasource_id, user_id,
            )
            settings = {"accountId": account_id, "siteIds": site_ids}
        
        elif provider == "Site24x7":
            access_token, monitors = test_site24x7_connection(
                api_key_or_token, endpoint
            )
            cursor.execute(
                """
                UPDATE dbo.NexusDataSources
                SET displayName = ?, provider = ?, endpoint = ?, secretsEncrypted = ?,
                    SITE24X7_ENDPOINT = ?, SITE24X7_ACCESS_TOKEN = NULL, updatedAt = ?
                WHERE UniqueID = ? AND ownerUniqueID = ?
                """,
                name, provider, endpoint, encrypt_secrets(api_key_or_token), endpoint, now,
                datasource_id, user_id,
            )
            persist_site24x7_metrics(
                cursor, datasource_id, monitors, access_token, endpoint, now
            )
            settings = {}
        
        elif provider == "Solarwinds":
            cursor.execute(
                """
                UPDATE dbo.NexusDataSources
                SET displayName = ?, provider = ?, endpoint = ?, SOLARWINDS_ENDPOINT = ?, SOLARWINDS_USERNAME = ?, SOLARWINDS_PASSWORD = ?, updatedAt = ?
                WHERE UniqueID = ? AND ownerUniqueID = ?
                """,
                name, provider, endpoint, endpoint, encrypt_secret_value(api_key_or_token), encrypt_secret_value(account_id), now,
                datasource_id, user_id,
            )
            settings = {}
        
        connection.commit()

    response_datasource = {
        "id": str(datasource_id),
        "databaseId": True,
        "name": name,
        "type": provider,
        "endpoint": endpoint,
        "logoUrl": None,
        "settings": settings,
        "configuredAt": now.isoformat(sep=" ", timespec="seconds"),
    }
    if provider != "Site24x7":
        response_datasource["demoData"] = {
            "hosts": 3,
            "metrics": 12,
            "status": "Demo data imported",
        }
    return jsonify({"datasource": response_datasource})

@datasource_blueprint.get("/api/datasources/<datasource_id>/analysis")
def analyse_datasource(datasource_id):
    user_id = parse_user_id(request.args.get("userId"))
    datasource_id = str(uuid.UUID(datasource_id))

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT displayName, provider
            FROM dbo.NexusDataSources
            WHERE UniqueID = ? AND ownerUniqueID = ?
            """,
            datasource_id,
            user_id,
        )
        datasource = cursor.fetchone()
        if not datasource:
            return jsonify({"message": "Data source was not found."}), 404
        if datasource[1] != "Site24x7":
            return jsonify({"message": "Analysis is currently available for Site24x7 data sources."}), 400

        cursor.execute(
            """
            WITH LatestMetrics AS (
                SELECT monitorID, hostName, metricName, metricValue, unit, status, recordedAt,
                       ROW_NUMBER() OVER (
                           PARTITION BY monitorID, metricName
                           ORDER BY recordedAt DESC, metricID DESC
                       ) AS readingRank
                FROM dbo.NexusSite24x7Metrics
                WHERE datasourceID = ? AND monitorID IS NOT NULL
            )
            SELECT hostName, metricName, metricValue, unit, status, recordedAt
            FROM LatestMetrics
            WHERE readingRank = 1
            ORDER BY hostName, metricName
            """,
            datasource_id,
        )
        metrics = [
            {
                "host": row[0],
                "name": row[1],
                "value": row[2],
                "unit": row[3],
                "status": row[4],
                "recordedAt": row[5].isoformat(sep=" ", timespec="seconds"),
            }
            for row in cursor.fetchall()
        ]
        cursor.execute(
            "SELECT MAX(recordedAt) FROM dbo.NexusSite24x7Metrics WHERE datasourceID = ? AND monitorID IS NOT NULL",
            datasource_id,
        )
        last_synced_at = cursor.fetchone()[0]
        connection.commit()

    return jsonify({
        "datasource": {
            "id": datasource_id,
            "name": datasource[0],
            "lastSyncedAt": last_synced_at.isoformat(sep=" ", timespec="seconds")
            if last_synced_at
            else None,
        },
        "metrics": metrics,
    })

@datasource_blueprint.delete("/api/datasources/<datasource_id>")
def delete_datasource(datasource_id):
    user_id = parse_user_id(request.args.get("userId"))
    datasource_id = str(uuid.UUID(datasource_id))
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT 1 FROM dbo.NexusDataSources WHERE UniqueID = ? AND ownerUniqueID = ?",
            datasource_id,
            user_id,
        )
        datasource = cursor.fetchone()
        if not datasource:
            return jsonify({"message": "Data source was not found."}), 404
        cursor.execute(
            "DELETE FROM dbo.NexusDataSources WHERE UniqueID = ? AND ownerUniqueID = ?",
            datasource_id,
            user_id,
        )
        connection.commit()
    return jsonify({"message": "Data source deleted."})
