from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.services.auth_service import AuthService
from backend.app.schemas.auth import LoginRequest, LoginResponse, AlterarSenhaRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.login(payload.usuario, payload.senha)

@router.post("/alterar-senha")
def alterar_senha(
    payload: AlterarSenhaRequest,
    admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    service = AuthService(db)
    service.alterar_senha(admin["user_id"], payload.senha_atual, payload.nova_senha)
    return {"sucesso": True, "mensagem": "Senha alterada com sucesso."}

@router.get("/me", response_model=UserResponse)
def me(admin=Depends(get_current_admin)):
    return {"usuario": admin["username"], "autenticado": True}
