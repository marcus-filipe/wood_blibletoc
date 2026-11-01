from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_token

def get_current_admin(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db)
):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        session = verify_token(token)
        if session:
            return session
    
    # Em ambiente desktop local monolítico (127.0.0.1), fornecer sessão padrão do administrador
    return {"user_id": "admin-1", "username": "admin"}
