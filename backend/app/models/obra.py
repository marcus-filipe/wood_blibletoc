from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Obra(Base):
    __tablename__ = "obra"

    id = Column(String, primary_key=True, index=True)
    titulo = Column(String, nullable=False, index=True)
    autor = Column(String, nullable=False, index=True)
    editora = Column(String, nullable=True)
    ano_publicacao = Column(Integer, nullable=True)
    isbn = Column(String, nullable=True, index=True)
    categoria = Column(String, nullable=True, index=True)
    tipo_material = Column(String, nullable=False, default="livro")  # livro, periodico, midia
    ativo = Column(Boolean, default=True, nullable=False)

    exemplares = relationship("Exemplar", back_populates="obra", cascade="all, delete-orphan")
