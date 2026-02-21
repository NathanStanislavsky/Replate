import os
from dotenv import load_dotenv

load_dotenv()


def _database_uri():
    url = os.environ.get("DATABASE_URL")

    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
