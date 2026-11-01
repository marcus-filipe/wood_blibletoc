from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Leitor(Base):
    __tablename__ = "leitor"

    id = Column(String, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    matricula = Column(String, nullable=True, index=True)
    tipo_leitor_id = Column(String, ForeignKey("tipo_leitor.id"), nullable=False)
    ano = Column(String, nullable=True)
    sala = Column(String, nullable=True)
    contato = Column(String, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)

    tipo_leitor = relationship("TipoLeitor")
    emprestimos = relationship("Emprestimo", back_populates="leitor")
