from pydantic import BaseModel, Field

class ExemplarBase(BaseModel):
    obra_id: str
    codigo_barras: str = Field(..., min_length=1)
    status: str = "disponivel"  # disponivel, emprestado, perdido, danificado

class ExemplarCreate(ExemplarBase):
    pass

class ExemplarStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(disponivel|emprestado|perdido|danificado)$")

class ExemplarResponse(ExemplarBase):
    id: str

    class Config:
        from_attributes = True
