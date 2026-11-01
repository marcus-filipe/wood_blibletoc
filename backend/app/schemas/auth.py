from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    usuario: str = Field(..., min_length=1)
    senha: str = Field(..., min_length=1)

class LoginResponse(BaseModel):
    token: str
    usuario: str
    mensagem: str

class AlterarSenhaRequest(BaseModel):
    senha_atual: str
    nova_senha: str = Field(..., min_length=4)

class UserResponse(BaseModel):
    usuario: str
    autenticado: bool
