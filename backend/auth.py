import os
import time
import jwt
import bcrypt


JWT_ALG = "HS256"


def _get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "").strip()
    if not secret:
        raise RuntimeError("JWT_SECRET is missing")
    return secret


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw, salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(username: str, ttl_seconds: int = 60 * 60 * 24 * 7) -> str:
    now = int(time.time())
    payload = {"sub": username, "iat": now, "exp": now + ttl_seconds}
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALG)


def verify_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALG])
        return payload.get("sub")
    except Exception:
        return None

