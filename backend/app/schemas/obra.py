from pydantic import BaseModel, Field

class ObraBase(BaseModel):
    titulo: str = Field(..., min_length=1)
    autor: str = Field(..., min_length=1)
    editora: str | None = None
    ano_publicacao: int | None = None
    isbn: str | None = None
    categoria: str | None = None
    tipo_material: str = "livro"  # livro, periodico, midia
    ativo: bool = True

class ObraCreate(ObraBase):
    pass

class ObraUpdate(BaseModel):
    titulo: str | None = None
    autor: str | None = None
    editora: str | None = None
    ano_publicacao: int | None = None
    isbn: str | None = None
    categoria: str | None = None
    tipo_material: str | None = None
    ativo: bool | None = None

class ObraResponse(ObraBase):
    id: str

    class Config:
        from_attributes = True
