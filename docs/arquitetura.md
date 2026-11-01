# Arquitetura do Sistema de Biblioteca

## 1. Visão Geral
Sistema monolítico local em camadas empacotado como aplicativo desktop para Linux.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (SPA compilado para build estático).
- **Backend**: Python 3.12+ com FastAPI, Uvicorn, SQLAlchemy 2, Pydantic, Passlib / PBKDF2 / Bcrypt.
- **Banco de Dados**: SQLite local em `~/.local/share/biblioteca/biblioteca.db` com modo WAL e integridade referencial ativa (`foreign_keys = ON`).
- **Camada Desktop**: Launcher Python com PyWebView (janela nativa desktop 1280x800) e fallback para modo aplicativo do navegador (Chromium).
- **Empacotamento**: PyInstaller no modo `--onedir`, empacotado como script de instalação (`install.sh`) ou pacote `.deb`.

## 2. Camadas do Backend
| Camada | Responsabilidade |
|---|---|
| `routers` | Endpoints HTTP, validação de entrada e saída com schemas Pydantic |
| `services` | Regras de negócio (empréstimos, atrasos, renovações, importação, relatórios, backup) |
| `repositories` | Abstração de acesso aos dados via SQLAlchemy |
| `models` | Entidades mapeadas no banco SQLite |
| `schemas` | Modelos de dados e validações Pydantic |
| `core` | Configurações, conexão com SQLite, segurança e dependências de autenticação |

## 3. Segurança e Isolamento
- API escuta estritamente em `127.0.0.1` em porta atribuída dinamicamente.
- Banco de dados e logs gravados fora da pasta do executável em `~/.local/share/biblioteca/`.
