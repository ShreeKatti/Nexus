# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

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

Add a Fernet encryption key to `backend/.env` before starting the backend. Generate one once with:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Then set:

```env
DATASOURCE_ENCRYPTION_KEY=the_generated_key
```

Site24x7 uses an API URL and OAuth access token. Cato uses an API URL, API key, account ID, and one or more comma-separated site IDs.

Setup:

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The frontend development server proxies `/api` calls to
`http://127.0.0.1:5001`. Keep the Python process running while using the
frontend. If you choose a different `API_PORT` in `backend/.env`, update the
matching target in `vite.config.js` and restart Vite.

Put your MSSQL values in `backend/.env`:

```env
MSSQL_SERVER=your_server_name
MSSQL_DATABASE=your_database_name
MSSQL_USERNAME=your_database_username
MSSQL_PASSWORD=your_database_password
```

In another terminal, run the frontend:

```powershell
npm run dev
```

`npm run dev` starts both Flask and Vite. To run only Vite (for example, when
the API is already running in a debugger), use `npm run dev:vite`.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
