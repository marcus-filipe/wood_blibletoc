from sqlalchemy import Column, String, Integer
from backend.app.core.database import Base

class TipoLeitor(Base):
    __tablename__ = "tipo_leitor"

    id = Column(String, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    prazo_dias = Column(Integer, nullable=False, default=7)
    limite_emprestimos = Column(Integer, nullable=False, default=3)
    max_renovacoes = Column(Integer, nullable=False, default=2)
