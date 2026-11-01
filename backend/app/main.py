import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.core.database import engine, Base, SessionLocal
from backend.app.services.auth_service import AuthService
from backend.app.services.leitor_service import LeitorService
from backend.app.core.seed import seed_sample_data_if_empty

# Importar routers
from backend.app.routers import (
    auth,
    obras,
    exemplares,
    leitores,
    tipos_leitor,
    emprestimos,
    importacao,
    relatorios,
    backup,
    sync
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Criar tabelas se não existirem
    Base.metadata.create_all(bind=engine)
    
    # Inicializar dados padrão (Admin e Tipos de leitor)
    db = SessionLocal()
    try:
        auth_service = AuthService(db)
        auth_service.ensure_default_admin()

        leitor_service = LeitorService(db)
        leitor_service.ensure_default_tipos()

        seed_sample_data_if_empty(db)
    finally:
        db.close()

    yield

app = FastAPI(
    title="Sistema de Biblioteca",
    description="Sistema de gerenciamento de biblioteca desktop - Linha de comando e interface gráfica",
    version="1.0.0",
    lifespan=lifespan
)

# Configuração de CORS para dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos roteadores da API
app.include_router(auth.router)
app.include_router(obras.router)
app.include_router(exemplares.router)
app.include_router(leitores.router)
app.include_router(tipos_leitor.router)
app.include_router(emprestimos.router)
app.include_router(importacao.router)
app.include_router(relatorios.router)
app.include_router(backup.router)
app.include_router(sync.router)

# Rota de healthcheck
@app.get("/api/health")
def healthcheck():
    return {"status": "ok", "app": "Sistema de Biblioteca", "version": "1.0.0"}

# Montar arquivos estáticos do React (Seção 14.2)
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static-assets")

    # Fallback para o SPA React Router
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"erro": "Frontend estático não encontrado em backend/app/static."}
