from sqlalchemy import Column, String, Integer, Text
from backend.app.core.database import Base

class LogBackup(Base):
    __tablename__ = "log_backup"

    id = Column(String, primary_key=True, index=True)
    data = Column(String, nullable=False, index=True)
    destino = Column(String, nullable=False)
    status = Column(String, nullable=False)  # sucesso, falha
    mensagem = Column(String, nullable=False)

class LogImportacao(Base):
    __tablename__ = "log_importacao"

    id = Column(String, primary_key=True, index=True)
    data = Column(String, nullable=False, index=True)
    arquivo = Column(String, nullable=False)
    linhas_ok = Column(Integer, nullable=False, default=0)
    linhas_erro = Column(Integer, nullable=False, default=0)
    detalhes = Column(Text, nullable=True)
