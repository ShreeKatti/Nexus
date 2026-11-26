import os

from nexus_api import app, initialize_database


if __name__ == "__main__":
    initialize_database()
    # Keep the fallback aligned with Vite's development proxy.
    app.run(host=os.getenv("API_HOST", "127.0.0.1"), port=int(os.getenv("API_PORT", "5001")))
