from pydantic import BaseModel

class ItemPrevia(BaseModel):
    linha: int
    titulo: str
    autor: str
    editora: str | None = None
    ano: int | None = None
    isbn: str | None = None
    categoria: str | None = None
    tipo_material: str = "livro"
    codigo_barras: str
    valido: bool
    erros: list[str] = []

class PreviaResponse(BaseModel):
    arquivo: str
    total_linhas: int
    linhas_validas: int
    linhas_com_erro: int
    itens: list[ItemPrevia]

class ImportarConfirmRequest(BaseModel):
    arquivo: str
    itens: list[ItemPrevia]

class ImportarResponse(BaseModel):
    sucesso: bool
    importados: int
    erros: int
    mensagem: str
