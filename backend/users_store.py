import json
import os
from pathlib import Path
from cryptography.fernet import Fernet, InvalidToken


DATA_PATH = Path(__file__).resolve().parent / "users.enc"


def _get_fernet() -> Fernet:
    key = os.environ.get("USERS_FERNET_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "USERS_FERNET_KEY is missing. Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode("utf-8"))


def load_users() -> dict:
    if not DATA_PATH.exists():
        return {}
    blob = DATA_PATH.read_bytes()
    if not blob:
        return {}
    f = _get_fernet()
    try:
        decrypted = f.decrypt(blob)
        return json.loads(decrypted.decode("utf-8"))
    except (InvalidToken, json.JSONDecodeError):
        raise RuntimeError("Failed to decrypt users database (wrong key or corrupted file)")


def save_users(users: dict) -> None:
    f = _get_fernet()
    raw = json.dumps(users, ensure_ascii=False).encode("utf-8")
    encrypted = f.encrypt(raw)
    DATA_PATH.write_bytes(encrypted)


def get_user(username: str) -> dict | None:
    users = load_users()
    return users.get(username)


def create_user(username: str, password_hash: str) -> dict:
    users = load_users()
    if username in users:
        raise ValueError("User already exists")
    users[username] = {
        "username": username,
        "password_hash": password_hash,
        "wins": 0,
        "losses": 0,
        "assassinHits": 0,
        "gamesPlayed": 0,
    }
    save_users(users)
    return users[username]


def update_user_stats(username: str, *, win: bool, assassin_hit: bool = False) -> None:
    users = load_users()
    u = users.get(username)
    if not u:
        return
    u["gamesPlayed"] = int(u.get("gamesPlayed", 0)) + 1
    if win:
        u["wins"] = int(u.get("wins", 0)) + 1
    else:
        u["losses"] = int(u.get("losses", 0)) + 1
    if assassin_hit:
        u["assassinHits"] = int(u.get("assassinHits", 0)) + 1
    save_users(users)

