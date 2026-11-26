import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from .database import get_connection

auth_blueprint = Blueprint("auth", __name__)


@auth_blueprint.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@auth_blueprint.get("/api/users/count")
def user_count():
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.NexusUsers")
        count = cursor.fetchone()[0]
    return jsonify({"count": count})

@auth_blueprint.post("/api/signup")
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

@auth_blueprint.post("/api/login")
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
