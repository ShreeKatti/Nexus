import os

import pyodbc


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
        
        # Create the data-source table only once; never erase saved user data on startup.
        cursor.execute(
            """
            IF OBJECT_ID('dbo.NexusDataSources', 'U') IS NULL
            BEGIN
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
            END
            """
        )

        # Add columns introduced by newer versions without replacing existing rows.
        cursor.execute(
            """
            IF COL_LENGTH('dbo.NexusDataSources', 'UniqueID') IS NULL
               AND COL_LENGTH('dbo.NexusDataSources', 'datasourceID') IS NOT NULL
                EXEC sp_rename 'dbo.NexusDataSources.datasourceID', 'UniqueID', 'COLUMN'

            IF COL_LENGTH('dbo.NexusDataSources', 'logoUrl') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD logoUrl NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'settingsJson') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD settingsJson NVARCHAR(MAX) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'secretsEncrypted') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD secretsEncrypted NVARCHAR(MAX) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'CATO_API_URL') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD CATO_API_URL NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'CATO_API_KEY') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD CATO_API_KEY NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'CATO_ACCOUNT_ID') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD CATO_ACCOUNT_ID NVARCHAR(100) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'CATO_SITE_IDS') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD CATO_SITE_IDS NVARCHAR(MAX) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'SITE24X7_ENDPOINT') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD SITE24X7_ENDPOINT NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'SITE24X7_ACCESS_TOKEN') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD SITE24X7_ACCESS_TOKEN NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'SOLARWINDS_ENDPOINT') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD SOLARWINDS_ENDPOINT NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'SOLARWINDS_USERNAME') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD SOLARWINDS_USERNAME NVARCHAR(255) NULL
            IF COL_LENGTH('dbo.NexusDataSources', 'SOLARWINDS_PASSWORD') IS NULL
                ALTER TABLE dbo.NexusDataSources ADD SOLARWINDS_PASSWORD NVARCHAR(500) NULL
            """
        )
        cursor.execute(
            """
            IF OBJECT_ID('dbo.NexusSite24x7Metrics', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.NexusSite24x7Metrics (
                    metricID UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    datasourceID UNIQUEIDENTIFIER NOT NULL,
                    monitorID NVARCHAR(100) NULL,
                    hostName NVARCHAR(150) NOT NULL,
                    metricName NVARCHAR(100) NOT NULL,
                    metricValue FLOAT NOT NULL,
                    unit NVARCHAR(30) NOT NULL,
                    status NVARCHAR(30) NOT NULL,
                    recordedAt DATETIME2 NOT NULL,
                    CONSTRAINT FK_NexusSite24x7Metrics_NexusDataSources
                        FOREIGN KEY (datasourceID) REFERENCES dbo.NexusDataSources(UniqueID) ON DELETE CASCADE
                )
            END

            IF COL_LENGTH('dbo.NexusSite24x7Metrics', 'monitorID') IS NULL
                ALTER TABLE dbo.NexusSite24x7Metrics ADD monitorID NVARCHAR(100) NULL
            """
        )
        cursor.execute(
            """
            IF NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = 'IX_NexusSite24x7Metrics_Latest'
                  AND object_id = OBJECT_ID('dbo.NexusSite24x7Metrics')
            )
                CREATE INDEX IX_NexusSite24x7Metrics_Latest
            ON dbo.NexusSite24x7Metrics (datasourceID, monitorID, metricName, recordedAt DESC)
            INCLUDE (hostName, metricValue, unit, status)
            """
        )
        connection.commit()
