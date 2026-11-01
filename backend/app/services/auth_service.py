import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.usuario_admin import UsuarioAdmin
from backend.app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    revoke_token
)

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def ensure_default_admin(self):
        """Garante a existência do usuário administrador padrão caso ainda não exista."""
        admin = self.db.query(UsuarioAdmin).first()
        if not admin:
            default_admin = UsuarioAdmin(
                id=str(uuid.uuid4()),
                usuario="admin",
                senha_hash=get_password_hash("admin123")
            )
            self.db.add(default_admin)
            self.db.commit()
            return default_admin
        return admin

    def login(self, usuario: str, senha: str) -> dict:
        self.ensure_default_admin()
        admin = self.db.query(UsuarioAdmin).filter(UsuarioAdmin.usuario == usuario).first()
        if not admin or not verify_password(senha, admin.senha_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário ou senha inválidos."
            )
        
        token = create_access_token(admin.id, admin.usuario)
        return {
            "token": token,
            "usuario": admin.usuario,
            "mensagem": "Login realizado com sucesso."
        }

    def alterar_senha(self, admin_id: str, senha_atual: str, nova_senha: str) -> bool:
        admin = self.db.query(UsuarioAdmin).filter(UsuarioAdmin.id == admin_id).first()
        if not admin or not verify_password(senha_atual, admin.senha_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta."
            )
        
        admin.senha_hash = get_password_hash(nova_senha)
        self.db.commit()
        return True
