# Nexus

## Project layout

- `frontend/` contains the React/Vite application and npm dependencies.
- `backend/` contains the Flask entry point, database schema, and Python
  dependencies. The `nexus_api/` package separates route blueprints, data-source
  services, and database access.

Build and deploy these applications independently. Serve the frontend build
(`frontend/dist/`) from a static host or reverse proxy. The backend includes
Waitress as its production WSGI server; do not use Flask's development server
for deployment.

## MSSQL auth backend

The React app now calls a Python API for signup and login. User records are saved in the `dbo.NexusUsers` table with this shape:

```sql
uniqueID UNIQUEIDENTIFIER PRIMARY KEY
username NVARCHAR(100) UNIQUE
passwordHash NVARCHAR(255)
createdAt DATETIME2
```

Passwords are hashed before storing. The database connection username and password must be kept in environment variables.

## MSSQL data source configurations

Configured data sources are stored in `dbo.NexusDataSources`, linked to the signed-in user. API keys, OAuth refresh credentials, and connector passwords are encrypted before they are written to MSSQL and are never returned to the browser.

## Source structure

The source is grouped by application area and shared code:

```text
backend/
  app.py
  serve.py
  schema.sql
  nexus_api/
    auth_routes.py
    database.py
    datasource_routes.py
    datasource_service.py
    site24x7_service.py
frontend/
  src/
    App.jsx
    main.jsx
    pages/
      LandingPage.jsx
    features/
      auth/
      dashboard/
        DashboardPage.jsx
        DashboardLayout.jsx
        DashboardRoutes.jsx
        useDashboardController.js
        pages/
      datasources/
        catalog.js
        storage.js
    shared/
      components/brand/
      services/
    assets/
    App.css
    index.css
```

Keep feature-specific screens and logic within their feature folder. Put UI and
services reused across features in `shared/`; keep application entry points,
global styles, and static assets at the `src/` level.

Set `VITE_API_BASE_URL` only when the API is hosted on a separate origin. Leave it
unset when using the included Vite `/api` proxy. Do not put credentials or other
secrets in `VITE_*` variables; Vite exposes them to the browser bundle.

Add a Fernet encryption key to `backend/.env` before starting the backend. Generate one once with:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Then set:

```env
DATASOURCE_ENCRYPTION_KEY=the_generated_key
```

Site24x7 uses its regional HTTPS API URL and OAuth client ID, client secret, and
refresh token. Nexus encrypts those credentials in SQL Server, refreshes the
access token on the backend, writes live monitor status every 60 seconds, and
refreshes availability every five minutes. The analysis page reloads stored
measurements every 30 seconds. Set `SITE24X7_SYNC_INTERVAL_SECONDS` in
`backend/.env` to adjust the polling interval (minimum 30 seconds). Cato uses an
API URL, API key, account ID, and one or more comma-separated site IDs.

The Site24x7 collector runs in the backend process and needs outbound HTTPS
access to the selected Site24x7/Zoho data-center endpoints. No Site24x7
credentials belong in the frontend or a `VITE_*` setting.

## Local development

Create the backend environment and install its dependencies:

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The frontend development server proxies `/api` calls to
`http://127.0.0.1:5001`. If you choose a different `API_PORT` in
`backend/.env`, update the matching target in `frontend/vite.config.js`.

Put your MSSQL values in `backend/.env`:

```env
MSSQL_SERVER=your_server_name
MSSQL_DATABASE=your_database_name
MSSQL_USERNAME=your_database_username
MSSQL_PASSWORD=your_database_password
```

Install and run the frontend from its directory:

```powershell
cd frontend
npm ci
npm run dev
```

`npm run dev` starts both Flask and Vite; `npm run dev:vite` starts only Vite.

## Deploy with Vercel and Render

The deployment configuration is split across `frontend/vercel.json`, the
repository-root `render.yaml`, and `backend/Dockerfile`. Render builds the API
image with Microsoft's ODBC Driver 18; Vercel hosts the static Vite frontend.

1. Create a reachable SQL Server database (Azure SQL is one option). Ensure its
	firewall allows connections from the Render service, and keep its credentials
	out of source control.
2. Import the Git repository into Vercel and set the project root directory to
	`Nexus/frontend`. Deploy once to get the production frontend URL.
3. Create a Render Blueprint from the repository root using `render.yaml`. Enter
	the prompted SQL Server values, set `FRONTEND_ORIGIN` to the Vercel production
	origin, and generate `DATASOURCE_ENCRYPTION_KEY` with the command above.
	`PORT` is supplied by Render; the service binds to `0.0.0.0` and uses the
	`/api/health` health check.
4. Copy the Render service URL and set Vercel's `VITE_API_BASE_URL` environment
	variable to that origin for Production. Redeploy the frontend so the API
	origin is included in its build.

The Vercel config uses `npm ci`, `npm run build`, and `dist/`. Never put database
credentials or encryption keys in Vercel variables or any `VITE_*` variable.
Vercel `VITE_*` values are public in the browser bundle. Render's `sync: false`
values are entered in the Render dashboard and are not committed to this repo.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
