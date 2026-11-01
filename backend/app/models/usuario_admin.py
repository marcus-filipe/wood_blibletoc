from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from backend.app.core.database import Base

class UsuarioAdmin(Base):
    __tablename__ = "usuario_admin"

    id = Column(String, primary_key=True, index=True)
    usuario = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))
