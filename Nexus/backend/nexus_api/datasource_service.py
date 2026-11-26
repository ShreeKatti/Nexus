import json
import os
import uuid
from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken


def get_secret_cipher():
    encryption_key = os.getenv("DATASOURCE_ENCRYPTION_KEY")
    if not encryption_key:
        raise RuntimeError(
            "Missing DATASOURCE_ENCRYPTION_KEY. Add a Fernet key to backend/.env before saving data source credentials."
        )
    try:
        return Fernet(encryption_key.encode())
    except (TypeError, ValueError):
        raise RuntimeError("DATASOURCE_ENCRYPTION_KEY is invalid. Generate a valid Fernet key and update backend/.env.")

def encrypt_secrets(secrets):
    return get_secret_cipher().encrypt(json.dumps(secrets).encode()).decode()

def encrypt_secret_value(value):
    return get_secret_cipher().encrypt(value.encode()).decode()

def decrypt_secret_value(encrypted_value):
    if not encrypted_value:
        return ""
    try:
        return get_secret_cipher().decrypt(encrypted_value.encode()).decode()
    except (InvalidToken, UnicodeDecodeError):
        raise RuntimeError("Saved data source credentials could not be decrypted.")

def decrypt_secrets(encrypted_secrets):
    if not encrypted_secrets:
        return {}
    try:
        return json.loads(get_secret_cipher().decrypt(encrypted_secrets.encode()).decode())
    except (InvalidToken, json.JSONDecodeError, UnicodeDecodeError):
        raise RuntimeError("Saved data source credentials could not be decrypted.")

def parse_user_id(value):
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        raise ValueError("A valid userId is required.")

def datasource_response_new(row):
    datasource_id, name, provider, endpoint, logo_url, settings_json, secrets_encrypted, cato_key, cato_account, cato_sites, site24x7_token, solarwinds_user, updated_at = row
    settings = {}
    
    if provider == "Cato":
        settings = {"accountId": cato_account, "siteIds": cato_sites}
    elif provider == "Site24x7":
        settings = {}
    elif provider == "Solarwinds":
        settings = {}
    
    response = {
        "id": str(datasource_id),
        "databaseId": True,
        "name": name,
        "type": provider,
        "endpoint": endpoint,
        "logoUrl": logo_url,
        "settings": settings,
        "configuredAt": updated_at.isoformat(sep=" ", timespec="seconds"),
    }
    if provider != "Site24x7":
        response["demoData"] = {"hosts": 3, "metrics": 12, "status": "Demo data imported"}
    return response

def validate_datasource_payload(payload):
    user_id = parse_user_id(payload.get("userId"))
    name = (payload.get("name") or "").strip()
    provider = (payload.get("provider") or "").strip()
    endpoint = (payload.get("endpoint") or "").strip()
    
    if not name or not provider:
        raise ValueError("Name and provider are required.")

    if provider == "Cato":
        # Dummy CATO URL
        api_url = "https://api.catonetworks.com/api/v1/graphql2"
        
        # Extract from cato object or secrets object
        cato_obj = payload.get("cato") or {}
        secrets_obj = payload.get("secrets") or {}
        
        api_key = (cato_obj.get("CATO_API_KEY") or secrets_obj.get("apiKey") or "").strip()
        account_id = (cato_obj.get("CATO_ACCOUNT_ID") or "").strip()
        site_ids = (cato_obj.get("CATO_SITE_IDS") or "").strip()
        
        if not api_key or not account_id or not site_ids:
            raise ValueError("API Key, Account ID, and Site IDs are all required for Cato.")
        
        return user_id, name, provider, api_url, api_key, account_id, site_ids
    
    elif provider == "Site24x7":
        secrets_obj = payload.get("secrets") or {}
        client_id = (secrets_obj.get("clientId") or "").strip()
        client_secret = (secrets_obj.get("clientSecret") or "").strip()
        refresh_token = (secrets_obj.get("refreshToken") or "").strip()
        
        if not client_id or not client_secret or not refresh_token:
            raise ValueError("Client ID, client secret, and refresh token are required for Site24x7.")

        parsed_endpoint = urlsplit(endpoint)
        allowed_hosts = {
            "www.site24x7.com",
            "www.site24x7.in",
            "www.site24x7.eu",
            "www.site24x7.com.au",
            "www.site24x7.com.sg",
            "www.site24x7.sa",
            "www.site24x7.cn",
        }
        if (
            parsed_endpoint.scheme != "https"
            or parsed_endpoint.hostname not in allowed_hosts
            or parsed_endpoint.username
            or parsed_endpoint.password
            or parsed_endpoint.port
            or parsed_endpoint.query
            or parsed_endpoint.fragment
            or parsed_endpoint.path.rstrip("/") != "/api"
        ):
            raise ValueError("Use a supported Site24x7 HTTPS API URL ending in /api.")
        
        credentials = {
            "clientId": client_id,
            "clientSecret": client_secret,
            "refreshToken": refresh_token,
        }
        return user_id, name, provider, endpoint, credentials, None, None
    
    elif provider == "Solarwinds":
        secrets_obj = payload.get("secrets") or {}
        username = (secrets_obj.get("username") or "").strip()
        password = (secrets_obj.get("password") or "").strip()
        
        if not username or not password:
            raise ValueError("Username and password are required for Solarwinds.")
        
        return user_id, name, provider, endpoint, username, password, None
    
    else:
        raise ValueError(f"Provider '{provider}' is not yet supported.")
