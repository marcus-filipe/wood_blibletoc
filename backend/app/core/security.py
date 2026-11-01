import hashlib
import hmac
import secrets
import time
from backend.app.core.config import SECRET_KEY, SESSION_EXPIRE_HOURS

def get_password_hash(password: str) -> str:
    """Gera hash seguro com salt usando SHA256 / PBKDF2 (compatível e resiliente)."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100_000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha contra o hash armazenado."""
    if not hashed_password:
        return False
    try:
        parts = hashed_password.split('$')
        if len(parts) == 3 and parts[0] == "pbkdf2:sha256:100000":
            salt = parts[1]
            key = parts[2]
            computed = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100_000).hex()
            return hmac.compare_digest(key, computed)
    except Exception:
        pass
    # Suporte legado caso senha esteja em texto plano no primeiro setup
    return plain_password == hashed_password

# Armazenamento em memória para sessões ativas
_ACTIVE_SESSIONS: dict[str, dict] = {}

def create_access_token(user_id: str, username: str) -> str:
    token = secrets.token_urlsafe(32)
    expire_at = time.time() + (SESSION_EXPIRE_HOURS * 3600)
    _ACTIVE_SESSIONS[token] = {
        "user_id": user_id,
        "username": username,
        "expire_at": expire_at
    }
    return token

def verify_token(token: str) -> dict | None:
    if not token:
        return None
    session = _ACTIVE_SESSIONS.get(token)
    if not session:
        return None
    if time.time() > session["expire_at"]:
        _ACTIVE_SESSIONS.pop(token, None)
        return None
    return session

def revoke_token(token: str) -> bool:
    if token in _ACTIVE_SESSIONS:
        del _ACTIVE_SESSIONS[token]
        return True
    return False
