from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Emprestimo(Base):
    __tablename__ = "emprestimo"

    id = Column(String, primary_key=True, index=True)
    exemplar_id = Column(String, ForeignKey("exemplar.id"), nullable=False)
    leitor_id = Column(String, ForeignKey("leitor.id"), nullable=False)
    data_emprestimo = Column(String, nullable=False, index=True)   # YYYY-MM-DD
    data_prevista = Column(String, nullable=False, index=True)     # YYYY-MM-DD
    data_devolucao = Column(String, nullable=True, index=True)     # YYYY-MM-DD
    renovacoes = Column(Integer, default=0, nullable=False)
    ano_leitor = Column(String, nullable=True)                     # Snapshot histórico da turma
    sala_leitor = Column(String, nullable=True)                    # Snapshot histórico da sala

    exemplar = relationship("Exemplar", back_populates="emprestimos")
    leitor = relationship("Leitor", back_populates="emprestimos")
