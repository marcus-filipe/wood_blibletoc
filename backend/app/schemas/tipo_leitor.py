from pydantic import BaseModel, Field

class TipoLeitorBase(BaseModel):
    codigo: str
    nome: str
    prazo_dias: int = Field(gt=0)
    limite_emprestimos: int = Field(gt=0)
    max_renovacoes: int = Field(ge=0)

class TipoLeitorUpdate(BaseModel):
    nome: str | None = None
    prazo_dias: int | None = Field(None, gt=0)
    limite_emprestimos: int | None = Field(None, gt=0)
    max_renovacoes: int | None = Field(None, ge=0)

class TipoLeitorResponse(TipoLeitorBase):
    id: str

    class Config:
        from_attributes = True
