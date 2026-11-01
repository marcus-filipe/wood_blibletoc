from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Exemplar(Base):
    __tablename__ = "exemplar"

    id = Column(String, primary_key=True, index=True)
    obra_id = Column(String, ForeignKey("obra.id"), nullable=False)
    codigo_barras = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, nullable=False, default="disponivel")  # disponivel, emprestado, perdido, danificado

    obra = relationship("Obra", back_populates="exemplares")
    emprestimos = relationship("Emprestimo", back_populates="exemplar")
