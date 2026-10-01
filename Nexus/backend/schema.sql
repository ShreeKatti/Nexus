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

IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = 'NexusDataSources'
)
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
        createdAt DATETIME2 NOT NULL,
        updatedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_NexusDataSources_NexusUsers
            FOREIGN KEY (ownerUniqueID) REFERENCES dbo.NexusUsers(uniqueID)
    )
END

IF COL_LENGTH('dbo.NexusDataSources', 'UniqueID') IS NULL
   AND COL_LENGTH('dbo.NexusDataSources', 'datasourceID') IS NOT NULL
BEGIN
    EXEC sp_rename 'dbo.NexusDataSources.datasourceID', 'UniqueID', 'COLUMN'
END

IF COL_LENGTH('dbo.NexusDataSources', 'CATO_API_URL') IS NULL
    ALTER TABLE dbo.NexusDataSources ADD CATO_API_URL NVARCHAR(500) NULL

IF COL_LENGTH('dbo.NexusDataSources', 'CATO_API_KEY') IS NULL
    ALTER TABLE dbo.NexusDataSources ADD CATO_API_KEY NVARCHAR(500) NULL

IF COL_LENGTH('dbo.NexusDataSources', 'CATO_ACCOUNT_ID') IS NULL
    ALTER TABLE dbo.NexusDataSources ADD CATO_ACCOUNT_ID NVARCHAR(100) NULL

IF COL_LENGTH('dbo.NexusDataSources', 'CATO_SITE_IDS') IS NULL
    ALTER TABLE dbo.NexusDataSources ADD CATO_SITE_IDS NVARCHAR(MAX) NULL
