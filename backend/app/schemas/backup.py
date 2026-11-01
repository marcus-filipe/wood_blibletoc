from pydantic import BaseModel

class BackupResponse(BaseModel):
    sucesso: bool
    caminho: str | None = None
    mensagem: str

class RestaurarBackupRequest(BaseModel):
    caminho_arquivo: str

class LogBackupResponse(BaseModel):
    id: str
    data: str
    destino: str
    status: str
    mensagem: str

    class Config:
        from_attributes = True

class BackupConfigUpdate(BaseModel):
    destino: str
