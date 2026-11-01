# Sistema de Gerenciamento de Biblioteca

Sistema desktop local para gerenciamento completo de bibliotecas de porte médio (universitárias ou municipais), executado em ambiente Linux com interface visual moderna em React, back-end em FastAPI e persistência em SQLite com modo WAL.

---

## 🏛 Arquitetura do Projeto

Conforme especificado no documento de arquitetura:
```
biblioteca/
├── backend/                  # API FastAPI (Python 3.12+)
│   ├── app/
│   │   ├── core/            # Configurações, conexão SQLite, segurança, dependências
│   │   ├── models/          # Entidades SQLAlchemy (admin, leitor, obra, exemplar, emprestimo, logs)
│   │   ├── schemas/         # Modelos Pydantic de entrada e saída
│   │   ├── repositories/    # Camada de persistência
│   │   ├── services/        # Regras de negócio (empréstimos, prazos, bloqueios, relatórios, backup)
│   │   ├── routers/         # Endpoints da API REST
│   │   ├── static/          # Build estático do front-end React
│   │   └── main.py          # Ponto de entrada do FastAPI
│   ├── migrations/          # Migrações versionadas com Alembic
│   ├── tests/               # Testes automatizados (pytest)
│   └── requirements.txt     # Dependências Python
├── frontend/                 # Interface React + Vite + Tailwind CSS
│   ├── src/                 # Telas (Dashboard, Acervo, Leitores, Empréstimos, Relatórios, etc.)
│   ├── package.json
│   └── vite.config.ts
├── desktop/                  # Camada desktop e empacotamento
│   ├── launcher.py          # Sobe o FastAPI e abre a janela PyWebView
│   ├── biblioteca.spec      # Configuração do PyInstaller (--onedir)
│   ├── biblioteca.desktop   # Atalho do menu Linux
│   ├── icone.png            # Ícone do aplicativo
│   └── build/
│       ├── build.sh         # Script unificado de compilação
│       ├── install.sh       # Instalação em /opt e criação de atalho
│       └── make_deb.sh      # Geração do pacote .deb
└── docs/                    # Documentação técnica e modelo ER
```

### Onde ficam os dados do usuário?
Seguindo o padrão Linux (XDG Base Directory), os dados **não ficam na pasta do programa**, garantindo que atualizações ou reinstalações não apaguem seus dados:
* **Banco SQLite**: `~/.local/share/biblioteca/biblioteca.db`
* **Logs do sistema**: `~/.local/share/biblioteca/logs/`
* **Exportações e relatórios**: `~/.local/share/biblioteca/exportacoes/`

---

## 🚀 Como Executar em Modo Desenvolvimento

### 1. Iniciar o Back-end (FastAPI)
```bash
cd backend
source venv/bin/activate
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Iniciar o Front-end (React + Vite)
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:3000`.

---

## 🧪 Executando os Testes Automatizados

O sistema conta com testes automatizados cobrindo as regras de negócio de empréstimo, renovação, devolução, bloqueio por atraso e relatórios:

```bash
cd backend
PYTHONPATH=.. ./venv/bin/pytest tests/ -v
```

---

## 🖥️ Como Instalar e Rodar no Desktop Linux

### Dependências do sistema (Debian/Ubuntu/Mint):
```bash
sudo apt update
sudo apt install python3-gi gir1.2-webkit2-4.1 python3-venv
```

### Opção 1: Executar Diretamente via Launcher (Sem compilar)
Basta rodar o launcher:
```bash
./backend/venv/bin/python3 desktop/launcher.py
```
O launcher localiza uma porta livre no sistema, inicia o servidor FastAPI em segundo plano e abre a janela nativa desktop em `1280x800`. Caso o PyWebView não esteja disponível, ele ativa automaticamente o fallback para o modo aplicativo do navegador (Chromium/Chrome).

---

### Opção 2: Compilar e Instalar no Sistema (`/opt/biblioteca`)

1. **Executar o script de compilação**:
```bash
bash desktop/build/build.sh
```
Isso irá:
- Compilar o front-end React.
- Copiar os arquivos gerados para `backend/app/static/`.
- Gerar o executável nativo em `dist/biblioteca/` via PyInstaller.

2. **Instalar no sistema com atalho no menu**:
```bash
sudo bash desktop/build/install.sh
```
O programa será instalado em `/opt/biblioteca/`, adicionará o comando global `biblioteca` no seu terminal e criará o atalho no menu de aplicativos do Linux.

---

### Opção 3: Gerar e Instalar Pacote Debian (.deb)
```bash
bash desktop/build/make_deb.sh
sudo dpkg -i dist/biblioteca_1.0.0_amd64.deb
```
