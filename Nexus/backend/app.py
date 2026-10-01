import os
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path

import pyodbc
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")}})


def get_connection():
    driver = os.getenv("MSSQL_DRIVER", "ODBC Driver 17 for SQL Server")
    server = os.getenv("MSSQL_SERVER")
    database = os.getenv("MSSQL_DATABASE")
    username = os.getenv("MSSQL_USERNAME")
    password = os.getenv("MSSQL_PASSWORD")
    encrypt = os.getenv("MSSQL_ENCRYPT", "yes")
    trust_server_certificate = os.getenv("MSSQL_TRUST_SERVER_CERTIFICATE", "yes")
    application_name = os.getenv("MSSQL_APPLICATION_NAME", "Nexus")
    connection_timeout = int(os.getenv("MSSQL_CONNECTION_TIMEOUT", "15"))

    missing = [
        name
        for name, value in {
            "MSSQL_SERVER": server,
            "MSSQL_DATABASE": database,
            "MSSQL_USERNAME": username,
            "MSSQL_PASSWORD": password,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing database environment values: {', '.join(missing)}")

    connection_string = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        f"Encrypt={encrypt};"
        f"TrustServerCertificate={trust_server_certificate};"
        f"APP={application_name};"
    )
    return pyodbc.connect(connection_string, timeout=connection_timeout)


def ensure_database_tables():
    with get_connection() as connection:
        cursor = connection.cursor()
        
        # Create NexusUsers table if not exists
        cursor.execute(
            """
            IF NOT EXISTS (
                SELECT 1
                FROM sys.tables
                WHERE name = 'NexusUsers'
            )
            BEGIN
                CREATE TABLE dbo.NexusUsers (
                    uniqueID UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    username NVARCHAR(100) NOT NULL UNIQUE,
                    passwordHash NVARCHAR(255) NOT NULL,
                    createdAt DATETIME2 NOT NULL
                )
            END
            """
        )
        connection.commit()
        
        # Forcefully drop and recreate NexusDataSources
        cursor.execute("EXEC sp_executesql N'DROP TABLE IF EXISTS dbo.NexusDataSources'")
        connection.commit()
        
        # Create fresh NexusDataSources table with all columns
        cursor.execute(
            """
            CREATE TABLE dbo.NexusDataSources (
                UniqueID UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                ownerUniqueID UNIQUEIDENTIFIER NOT NULL,
                displayName NVARCHAR(150) NOT NULL,
                provider NVARCHAR(100) NOT NULL,
                endpoint NVARCHAR(500) NOT NULL,
                logoUrl NVARCHAR(500) NULL,
                settingsJson NVARCHAR(MAX) NULL,
                secretsEncrypted NVARCHAR(MAX) NULL,
                CATO_API_URL NVARCHAR(500) NULL,
                CATO_API_KEY NVARCHAR(500) NULL,
                CATO_ACCOUNT_ID NVARCHAR(100) NULL,
                CATO_SITE_IDS NVARCHAR(MAX) NULL,
                SITE24X7_ENDPOINT NVARCHAR(500) NULL,
                SITE24X7_ACCESS_TOKEN NVARCHAR(500) NULL,
                SOLARWINDS_ENDPOINT NVARCHAR(500) NULL,
                SOLARWINDS_USERNAME NVARCHAR(255) NULL,
                SOLARWINDS_PASSWORD NVARCHAR(500) NULL,
                createdAt DATETIME2 NOT NULL,
                updatedAt DATETIME2 NOT NULL,
                CONSTRAINT FK_NexusDataSources_NexusUsers
                    FOREIGN KEY (ownerUniqueID) REFERENCES dbo.NexusUsers(uniqueID)
            )
            """
        )
        connection.commit()


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
    
    return {
        "id": str(datasource_id),
        "databaseId": True,
        "name": name,
        "type": provider,
        "endpoint": endpoint,
        "logoUrl": logo_url,
        "settings": settings,
        "configuredAt": updated_at.isoformat(sep=" ", timespec="seconds"),
        "demoData": {"hosts": 3, "metrics": 12, "status": "Demo data imported"},
    }


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
        access_token = (secrets_obj.get("accessToken") or "").strip()
        
        if not access_token:
            raise ValueError("Access Token is required for Site24x7.")
        
        return user_id, name, provider, endpoint, access_token, None, None
    
    elif provider == "Solarwinds":
        secrets_obj = payload.get("secrets") or {}
        username = (secrets_obj.get("username") or "").strip()
        password = (secrets_obj.get("password") or "").strip()
        
        if not username or not password:
            raise ValueError("Username and password are required for Solarwinds.")
        
        return user_id, name, provider, endpoint, username, password, None
    
    else:
        raise ValueError(f"Provider '{provider}' is not yet supported.")


@app.errorhandler(RuntimeError)
def handle_runtime_error(error):
    return jsonify({"message": str(error)}), 500


@app.errorhandler(pyodbc.Error)
def handle_database_error(error):
    app.logger.warning("Database request failed: %s", error)
    return jsonify({
        "message": "The API is running, but it cannot connect to SQL Server. Check the MSSQL settings in backend/.env and that the SQL Server instance is available."
    }), 503


@app.errorhandler(ValueError)
def handle_value_error(error):
    return jsonify({"message": str(error)}), 400


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/users/count")
def user_count():
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.NexusUsers")
        count = cursor.fetchone()[0]
    return jsonify({"count": count})


@app.post("/api/signup")
def signup():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()

    if not username or not password:
        return jsonify({"message": "Please enter both a username and password."}), 400

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM dbo.NexusUsers WHERE username = ?", username)
        if cursor.fetchone():
            return jsonify({"message": "Username already exists. Please sign in or choose another username."}), 409

        unique_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO dbo.NexusUsers (uniqueID, username, passwordHash, createdAt)
            VALUES (?, ?, ?, ?)
            """,
            unique_id,
            username,
            generate_password_hash(password),
            datetime.now(timezone.utc).replace(tzinfo=None),
        )
        connection.commit()

    return jsonify({"uniqueID": unique_id, "username": username}), 201


@app.post("/api/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()

    if not username or not password:
        return jsonify({"message": "Please enter both a username and password."}), 400

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT uniqueID, username, passwordHash FROM dbo.NexusUsers WHERE username = ?",
            username,
        )
        user = cursor.fetchone()

    if not user:
        return jsonify({"message": "No account was found with this username. Please create an account first."}), 404

    unique_id, saved_username, password_hash = user
    if not check_password_hash(password_hash, password):
        return jsonify({"message": "Incorrect password. Please try again."}), 401

    return jsonify({"uniqueID": str(unique_id), "username": saved_username})


@app.get("/api/datasources")
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


@app.post("/api/datasources")
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
                datasource_id, user_id, name, provider, endpoint, None, None, None,
                endpoint, encrypt_secret_value(api_key_or_token),
                now, now,
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

    return jsonify({"datasource": {
        "id": datasource_id,
        "databaseId": True,
        "name": name,
        "type": provider,
        "endpoint": endpoint,
        "logoUrl": None,
        "settings": settings,
        "configuredAt": now.isoformat(sep=" ", timespec="seconds"),
        "demoData": {"hosts": 3, "metrics": 12, "status": "Demo data imported"},
    }}), 201


@app.put("/api/datasources/<datasource_id>")
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
            cursor.execute(
                """
                UPDATE dbo.NexusDataSources
                SET displayName = ?, provider = ?, endpoint = ?, SITE24X7_ENDPOINT = ?, SITE24X7_ACCESS_TOKEN = ?, updatedAt = ?
                WHERE UniqueID = ? AND ownerUniqueID = ?
                """,
                name, provider, endpoint, endpoint, encrypt_secret_value(api_key_or_token), now,
                datasource_id, user_id,
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

    return jsonify({"datasource": {
        "id": str(datasource_id),
        "databaseId": True,
        "name": name,
        "type": provider,
        "endpoint": endpoint,
        "logoUrl": None,
        "settings": settings,
        "configuredAt": now.isoformat(sep=" ", timespec="seconds"),
        "demoData": {"hosts": 3, "metrics": 12, "status": "Demo data imported"},
    }})


@app.delete("/api/datasources/<datasource_id>")
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


if __name__ == "__main__":
    try:
        ensure_database_tables()
    except pyodbc.Error as error:
        # Do not make the frontend report a proxy connection refusal when the
        # database is temporarily unavailable. Requests will receive the 503
        # response from handle_database_error until SQL Server is reachable.
        app.logger.warning("Database initialization failed; API will remain available: %s", error)
    # Keep the fallback aligned with Vite's development proxy.  This also means
    # the API works out of the box when no backend/.env file is present yet.
    app.run(host=os.getenv("API_HOST", "127.0.0.1"), port=int(os.getenv("API_PORT", "5001")))
