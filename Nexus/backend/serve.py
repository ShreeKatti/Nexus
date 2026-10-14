import os

from waitress import serve

from app import app, initialize_database


initialize_database()

serve(
    app,
    host=os.getenv("API_HOST", "0.0.0.0"),
    port=int(os.getenv("PORT", os.getenv("API_PORT", "5001"))),
)