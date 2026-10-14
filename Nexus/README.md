# Nexus

## Project layout

- `frontend/` contains the React/Vite application and npm dependencies.
- `backend/` contains the Flask API, database schema, and Python dependencies.

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

Configured data sources are stored in `dbo.NexusDataSources`, linked to the signed-in user. API keys, OAuth access tokens, and connector passwords are encrypted before they are written to MSSQL and are never returned to the browser.

## Frontend structure

The React source is organized by responsibility:

- `frontend/src/pages/` contains the landing and dashboard pages.
- `frontend/src/components/` contains reusable presentation components.
- `frontend/src/features/` contains authentication and datasource-specific state/storage helpers.
- `frontend/src/data/` contains datasource provider metadata and logo mappings.
- `frontend/src/services/` contains API communication helpers.

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

Site24x7 uses an API URL and OAuth access token. Cato uses an API URL, API key, account ID, and one or more comma-separated site IDs.

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

## Production deployment

Build the frontend from `frontend/` and deploy `frontend/dist/` to a static web
host:

```powershell
npm ci
npm run build
```

Deploy the backend separately. Install `backend/requirements.txt`, provide the
database and encryption settings as environment variables, and set
`API_HOST=0.0.0.0`, `PORT` (or `API_PORT`), and `FRONTEND_ORIGIN` to the deployed
frontend's origin. Start Waitress from `backend/` with:

```powershell
python serve.py
```

Set `VITE_API_BASE_URL` to the deployed API origin before building the frontend
when the API is hosted on a separate origin. Never put credentials or other
secrets in `VITE_*` variables.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
