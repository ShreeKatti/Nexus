import os
from pathlib import Path

import pyodbc
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")}})

from .auth_routes import auth_blueprint
from .datasource_routes import datasource_blueprint
from .database import ensure_database_tables
from .site24x7_service import Site24x7APIError, start_site24x7_sync_worker

app.register_blueprint(auth_blueprint)
app.register_blueprint(datasource_blueprint)


@app.errorhandler(RuntimeError)
def handle_runtime_error(error):
    return jsonify({"message": str(error)}), 500

@app.errorhandler(Site24x7APIError)
def handle_site24x7_error(error):
    return jsonify({"message": str(error)}), 502

@app.errorhandler(pyodbc.Error)
def handle_database_error(error):
    app.logger.warning("Database request failed: %s", error)
    return jsonify({
        "message": "The API is running, but it cannot connect to SQL Server. Check the MSSQL settings in backend/.env and that the SQL Server instance is available."
    }), 503

@app.errorhandler(ValueError)
def handle_value_error(error):
    return jsonify({"message": str(error)}), 400


def initialize_database():
    try:
        ensure_database_tables()
    except pyodbc.Error as error:
        app.logger.warning(
            "Database initialization failed; API will remain available: %s", error
        )
    else:
        start_site24x7_sync_worker(app)


__all__ = ["app", "initialize_database"]
