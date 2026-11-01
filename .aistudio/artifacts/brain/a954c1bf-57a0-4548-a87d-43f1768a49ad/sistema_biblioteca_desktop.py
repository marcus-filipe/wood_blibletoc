#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Gerenciamento de Biblioteca - Executável Local Desktop
Documento de Arquitetura v1.0

Tecnologias:
- Python 3.10+
- FastAPI & Uvicorn (escuta em 127.0.0.1 em porta livre)
- SQLite local em modo WAL (~/.local/share/biblioteca/biblioteca.db)
- PyWebView (janela nativa) ou abertura automática no navegador padrão
- Interface HTML5 + Tailwind CSS completa e responsiva embutida

Como executar no seu notebook:
1. Instale os pacotes necessários:
   pip install fastapi uvicorn pywebview

2. Execute este arquivo:
   python sistema_biblioteca_desktop.py
"""

import os
import sys
import json
import sqlite3
import socket
import threading
import time
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path

# Tentativa de importação dos frameworks necessários
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import HTMLResponse, JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print("\n[AVISO] Pacotes necessários não encontrados!")
    print("Para instalar automaticamente, execute no seu terminal:")
    print("    pip install fastapi uvicorn pywebview\n")
    sys.exit(1)

# Caminho dos dados conforme Seção 5.1 do Documento de Arquitetura
DATA_DIR = Path.home() / ".local" / "share" / "biblioteca"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "biblioteca.db"

# ==============================================================================
# INICIALIZAÇÃO DO BANCO SQLITE (WAL e Chaves Estrangeiras ativas)
# ==============================================================================
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. usuario_admin
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuario_admin (
            id TEXT PRIMARY KEY,
            usuario TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            criado_em TEXT NOT NULL
        );
        """)

        # 2. tipo_leitor (políticas)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tipo_leitor (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            codigo TEXT UNIQUE NOT NULL,
            prazo_dias INTEGER NOT NULL,
            limite_emprestimos INTEGER NOT NULL,
            max_renovacoes INTEGER NOT NULL
        );
        """)

        # 3. leitor
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS leitor (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            matricula TEXT UNIQUE NOT NULL,
            tipo_leitor_id TEXT NOT NULL,
            ano TEXT,
            sala TEXT,
            contato TEXT,
            ativo INTEGER DEFAULT 1,
            FOREIGN KEY (tipo_leitor_id) REFERENCES tipo_leitor (id)
        );
        """)

        # 4. obra
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS obra (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            autor TEXT NOT NULL,
            editora TEXT,
            ano_publicacao INTEGER,
            isbn TEXT,
            categoria TEXT,
            tipo_material TEXT NOT NULL,
            ativo INTEGER DEFAULT 1
        );
        """)

        # 5. exemplar
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exemplar (
            id TEXT PRIMARY KEY,
            obra_id TEXT NOT NULL,
            codigo_barras TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (obra_id) REFERENCES obra (id)
        );
        """)

        # 6. emprestimo (com snapshot de ano e sala)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS emprestimo (
            id TEXT PRIMARY KEY,
            exemplar_id TEXT NOT NULL,
            leitor_id TEXT NOT NULL,
            data_emprestimo TEXT NOT NULL,
            data_prevista TEXT NOT NULL,
            data_devolucao TEXT,
            renovacoes INTEGER DEFAULT 0,
            ano_leitor TEXT,
            sala_leitor TEXT,
            FOREIGN KEY (exemplar_id) REFERENCES exemplar (id),
            FOREIGN KEY (leitor_id) REFERENCES leitor (id)
        );
        """)

        # 7. logs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS log_backup (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            destino TEXT NOT NULL,
            status TEXT NOT NULL,
            mensagem TEXT
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS log_importacao (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            arquivo TEXT NOT NULL,
            linhas_ok INTEGER,
            linhas_erro INTEGER,
            detalhes TEXT
        );
        """)

        # Carga inicial se vazio
        cursor.execute("SELECT COUNT(*) FROM usuario_admin;")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO usuario_admin VALUES ('admin-1', 'admin', 'admin123', datetime('now'));")

            # Políticas padrão (Seção 7.5)
            cursor.execute("INSERT INTO tipo_leitor VALUES ('tipo-aluno', 'Aluno', 'aluno', 7, 3, 2);")
            cursor.execute("INSERT INTO tipo_leitor VALUES ('tipo-professor', 'Professor', 'professor', 15, 5, 3);")
            cursor.execute("INSERT INTO tipo_leitor VALUES ('tipo-publico', 'Público Geral', 'publico', 7, 2, 1);")

            # Obras de exemplo
            cursor.execute("INSERT INTO obra VALUES ('obra-1', 'Dom Casmurro', 'Machado de Assis', 'Garnier', 1899, '978-8572329381', 'Literatura Brasileira', 'livro', 1);")
            cursor.execute("INSERT INTO obra VALUES ('obra-2', 'Algoritmos: Teoria e Prática', 'Thomas Cormen', 'Elsevier', 2012, '978-8535236995', 'Computação', 'livro', 1);")
            cursor.execute("INSERT INTO obra VALUES ('obra-3', 'Cálculo Vol 1', 'James Stewart', 'Cengage', 2016, '978-8522112586', 'Matemática', 'livro', 1);")

            # Exemplares
            cursor.execute("INSERT INTO exemplar VALUES ('ex-1', 'obra-1', 'TOMBO-1001', 'disponivel');")
            cursor.execute("INSERT INTO exemplar VALUES ('ex-2', 'obra-1', 'TOMBO-1002', 'disponivel');")
            cursor.execute("INSERT INTO exemplar VALUES ('ex-3', 'obra-2', 'TOMBO-2001', 'disponivel');")
            cursor.execute("INSERT INTO exemplar VALUES ('ex-4', 'obra-3', 'TOMBO-3001', 'disponivel');")

            # Leitores
            cursor.execute("INSERT INTO leitor VALUES ('lei-1', 'Lucas Silva Pereira', 'MAT-2024-01', 'tipo-aluno', '2º Ano', 'Turma A', 'lucas@email.com', 1);")
            cursor.execute("INSERT INTO leitor VALUES ('lei-2', 'Beatriz Costa Miranda', 'MAT-2023-02', 'tipo-aluno', '3º Ano', 'Turma B', 'beatriz@email.com', 1);")
            cursor.execute("INSERT INTO leitor VALUES ('lei-3', 'Prof. Carlos Mendes', 'PROF-1090', 'tipo-professor', NULL, NULL, 'carlos@uni.edu.br', 1);")

            # Empréstimo em dia para teste
            hoje = datetime.now().strftime("%Y-%m-%d")
            venc_futuro = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            cursor.execute("INSERT INTO emprestimo VALUES ('emp-1', 'ex-1', 'lei-1', ?, ?, NULL, 0, '2º Ano', 'Turma A');", (hoje, venc_futuro))
            cursor.execute("UPDATE exemplar SET status = 'emprestado' WHERE id = 'ex-1';")

            conn.commit()

init_database()

# ==============================================================================
# FASTAPI BACKEND & ENDPOINTS
# ==============================================================================
app = FastAPI(title="Sistema de Biblioteca", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/login")
def login(data: dict):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuario_admin WHERE usuario = ?;", (data.get("usuario"),))
        row = cursor.fetchone()
        if row and row["senha_hash"] == data.get("senha"):
            return {"status": "ok", "token": "local-token-admin", "usuario": row["usuario"]}
    raise HTTPException(status_code=401, detail="Credenciais inválidas")

@app.get("/api/obras")
def listar_obras():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM obra ORDER BY titulo ASC;")
        obras = [dict(row) for row in cursor.fetchall()]
        for obra in obras:
            cursor.execute("SELECT * FROM exemplar WHERE obra_id = ?;", (obra["id"],))
            obra["exemplares"] = [dict(e) for e in cursor.fetchall()]
        return obras

@app.get("/api/leitores")
def listar_leitores():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT l.*, t.nome as tipo_nome, t.prazo_dias, t.limite_emprestimos, t.max_renovacoes
            FROM leitor l
            JOIN tipo_leitor t ON l.tipo_leitor_id = t.id
            ORDER BY l.nome ASC;
        """)
        return [dict(row) for row in cursor.fetchall()]

@app.get("/api/emprestimos")
def listar_emprestimos():
    hoje = datetime.now().strftime("%Y-%m-%d")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT e.*, l.nome as leitor_nome, l.matricula, ex.codigo_barras, o.titulo as obra_titulo,
                   t.prazo_dias, t.max_renovacoes,
                   CASE WHEN e.data_devolucao IS NULL AND e.data_prevista < ? THEN 1 ELSE 0 END as em_atraso
            FROM emprestimo e
            JOIN leitor l ON e.leitor_id = l.id
            JOIN exemplar ex ON e.exemplar_id = ex.id
            JOIN obra o ON ex.obra_id = o.id
            JOIN tipo_leitor t ON l.tipo_leitor_id = t.id
            ORDER BY e.data_emprestimo DESC;
        """, (hoje,))
        return [dict(row) for row in cursor.fetchall()]

@app.post("/api/emprestimos")
def criar_emprestimo(data: dict):
    leitor_id = data.get("leitor_id")
    exemplar_id = data.get("exemplar_id")
    hoje = datetime.now().strftime("%Y-%m-%d")

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Leitor ativo
        cursor.execute("SELECT * FROM leitor WHERE id = ?;", (leitor_id,))
        leitor = cursor.fetchone()
        if not leitor or not leitor["ativo"]:
            raise HTTPException(status_code=400, detail="Leitor não encontrado ou inativo.")

        # 2. Verificar atrasos pendentes (RF07)
        cursor.execute("""
            SELECT COUNT(*) FROM emprestimo
            WHERE leitor_id = ? AND data_devolucao IS NULL AND data_prevista < ?;
        """, (leitor_id, hoje))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="BLOQUEIO DE ATRASO: O leitor possui livros em atraso pendentes.")

        # 3. Limite de itens
        cursor.execute("SELECT * FROM tipo_leitor WHERE id = ?;", (leitor["tipo_leitor_id"],))
        tipo = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) FROM emprestimo WHERE leitor_id = ? AND data_devolucao IS NULL;", (leitor_id,))
        if cursor.fetchone()[0] >= tipo["limite_emprestimos"]:
            raise HTTPException(status_code=400, detail="LIMITE ATINGIDO: Limite de empréstimos atingido para este leitor.")

        # 4. Exemplar disponível
        cursor.execute("SELECT * FROM exemplar WHERE id = ?;", (exemplar_id,))
        exemplar = cursor.fetchone()
        if not exemplar or exemplar["status"] != "disponivel":
            raise HTTPException(status_code=400, detail="Exemplar não disponível para empréstimo.")

        # Gravar com snapshot
        prazo_dias = tipo["prazo_dias"]
        data_prevista = (datetime.now() + timedelta(days=prazo_dias)).strftime("%Y-%m-%d")
        novo_id = f"emp-{int(time.time() * 1000)}"

        cursor.execute("""
            INSERT INTO emprestimo (id, exemplar_id, leitor_id, data_emprestimo, data_prevista, renovacoes, ano_leitor, sala_leitor)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?);
        """, (novo_id, exemplar_id, leitor_id, hoje, data_prevista, leitor["ano"], leitor["sala"]))

        cursor.execute("UPDATE exemplar SET status = 'emprestado' WHERE id = ?;", (exemplar_id,))
        conn.commit()

        return {"status": "ok", "mensagem": f"Empréstimo registrado com sucesso até {data_prevista}."}

@app.post("/api/emprestimos/{emp_id}/devolucao")
def registrar_devolucao(emp_id: str):
    hoje = datetime.now().strftime("%Y-%m-%d")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emprestimo WHERE id = ?;", (emp_id,))
        emp = cursor.fetchone()
        if not emp or emp["data_devolucao"]:
            raise HTTPException(status_code=400, detail="Empréstimo inválido ou já devolvido.")

        cursor.execute("UPDATE emprestimo SET data_devolucao = ? WHERE id = ?;", (hoje, emp_id))
        cursor.execute("UPDATE exemplar SET status = 'disponivel' WHERE id = ?;", (emp["exemplar_id"],))
        conn.commit()
        return {"status": "ok", "mensagem": "Devolução confirmada com sucesso."}

@app.post("/api/emprestimos/{emp_id}/renovacao")
def registrar_renovacao(emp_id: str):
    hoje = datetime.now().strftime("%Y-%m-%d")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT e.*, t.prazo_dias, t.max_renovacoes
            FROM emprestimo e
            JOIN leitor l ON e.leitor_id = l.id
            JOIN tipo_leitor t ON l.tipo_leitor_id = t.id
            WHERE e.id = ?;
        """, (emp_id,))
        emp = cursor.fetchone()
        if not emp or emp["data_devolucao"]:
            raise HTTPException(status_code=400, detail="Empréstimo inválido.")

        if emp["data_prevista"] < hoje:
            raise HTTPException(status_code=400, detail="Não é permitido renovar item em atraso.")

        if emp["renovacoes"] >= emp["max_renovacoes"]:
            raise HTTPException(status_code=400, detail="Limite máximo de renovações atingido.")

        nova_prevista = (datetime.now() + timedelta(days=emp["prazo_dias"])).strftime("%Y-%m-%d")
        cursor.execute("""
            UPDATE emprestimo SET data_prevista = ?, renovacoes = renovacoes + 1
            WHERE id = ?;
        """, (nova_prevista, emp_id))
        conn.commit()
        return {"status": "ok", "mensagem": f"Renovado com sucesso até {nova_prevista}."}

# ==============================================================================
# INTERFACE FRONT-END EMBUTIDA (HTML5 / Tailwind CSS / Vanilla JS)
# ==============================================================================
@app.get("/", response_class=HTMLResponse)
def index():
    return """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Sistema de Gerenciamento de Biblioteca</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen">
    <header class="border-b border-neutral-800 bg-neutral-900/60 p-4 sticky top-0 z-10 backdrop-blur-md">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-indigo-500"></span>
                <span class="font-bold text-lg text-white">Sistema de Biblioteca (Desktop Linux)</span>
            </div>
            <div class="text-xs text-neutral-400 font-mono">
                127.0.0.1 SQLite WAL Ativo
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto p-6 space-y-6">
        <!-- Balcão de Empréstimo Rápido -->
        <section class="p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl">
            <h2 class="text-base font-bold text-white mb-4">Balcão de Atendimento Rápido (Novo Empréstimo)</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs text-neutral-400 mb-1">Selecione o Leitor:</label>
                    <select id="selectLeitor" class="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white"></select>
                </div>
                <div>
                    <label class="block text-xs text-neutral-400 mb-1">Selecione o Exemplar Disponível:</label>
                    <select id="selectExemplar" class="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white"></select>
                </div>
                <div class="flex items-end">
                    <button onclick="realizarEmprestimo()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg p-2.5 text-xs cursor-pointer">
                        Conceder Empréstimo
                    </button>
                </div>
            </div>
            <div id="mensagemFeedback" class="mt-3 text-xs hidden p-3 rounded-lg"></div>
        </section>

        <!-- Tabela de Empréstimos Ativos -->
        <section class="p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-bold text-white">Circulação em Aberto e Devoluções</h2>
                <button onclick="carregarDados()" class="text-xs text-indigo-400 hover:underline">Atualizar Dados</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                        <tr>
                            <th class="p-3">Obra / Tombo</th>
                            <th class="p-3">Leitor</th>
                            <th class="p-3 text-center">Retirada</th>
                            <th class="p-3 text-center">Vencimento</th>
                            <th class="p-3 text-center">Situação</th>
                            <th class="p-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaEmprestimos" class="divide-y divide-neutral-800"></tbody>
                </table>
            </div>
        </section>
    </main>

    <script>
        let leitores = [];
        let obras = [];
        let emprestimos = [];

        async function carregarDados() {
            try {
                const resLeitores = await fetch('/api/leitores');
                leitores = await resLeitores.json();

                const resObras = await fetch('/api/obras');
                obras = await resObras.json();

                const resEmp = await fetch('/api/emprestimos');
                emprestimos = await resEmp.json();

                renderSelects();
                renderTabela();
            } catch (err) {
                console.error(err);
            }
        }

        function renderSelects() {
            const selLeitor = document.getElementById('selectLeitor');
            selLeitor.innerHTML = '<option value="">-- Selecione o Leitor --</option>' +
                leitores.map(l => `<option value="${l.id}">${l.nome} (${l.tipo_nome}) - ${l.matricula}</option>`).join('');

            const selExemplar = document.getElementById('selectExemplar');
            const disponiveis = [];
            obras.forEach(o => {
                o.exemplares.forEach(ex => {
                    if (ex.status === 'disponivel') {
                        disponiveis.push({ id: ex.id, texto: `${o.titulo} [${ex.codigo_barras}]` });
                    }
                });
            });

            selExemplar.innerHTML = '<option value="">-- Selecione o Tombo --</option>' +
                disponiveis.map(d => `<option value="${d.id}">${d.texto}</option>`).join('');
        }

        function renderTabela() {
            const tbody = document.getElementById('tabelaEmprestimos');
            if (emprestimos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-neutral-500">Nenhum empréstimo ativo.</td></tr>';
                return;
            }

            tbody.innerHTML = emprestimos.map(emp => {
                const isOverdue = emp.em_atraso === 1;
                const isReturned = !!emp.data_devolucao;

                let badge = '<span class="text-amber-300">Em aberto</span>';
                if (isReturned) badge = '<span class="text-emerald-400">Devolvido</span>';
                else if (isOverdue) badge = '<span class="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">ATRASADO</span>';

                let acoes = '';
                if (!isReturned) {
                    acoes = `
                        <button onclick="devolver('${emp.id}')" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded mr-1">Devolver</button>
                        <button onclick="renovar('${emp.id}')" class="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded">Renovar</button>
                    `;
                }

                return `
                    <tr class="hover:bg-neutral-900/40">
                        <td class="p-3"><strong class="text-white">${emp.obra_titulo}</strong><br><span class="font-mono text-neutral-400 text-[11px]">${emp.codigo_barras}</span></td>
                        <td class="p-3 text-neutral-300">${emp.leitor_nome}<br><span class="text-neutral-500 text-[10px]">${emp.matricula}</span></td>
                        <td class="p-3 text-center font-mono text-neutral-400">${emp.data_emprestimo}</td>
                        <td class="p-3 text-center font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-400'}">${emp.data_prevista}</td>
                        <td class="p-3 text-center">${badge}</td>
                        <td class="p-3 text-right">${acoes}</td>
                    </tr>
                `;
            }).join('');
        }

        async function realizarEmprestimo() {
            const leitor_id = document.getElementById('selectLeitor').value;
            const exemplar_id = document.getElementById('selectExemplar').value;
            const fb = document.getElementById('mensagemFeedback');

            if (!leitor_id || !exemplar_id) {
                mostrarFeedback('Selecione um leitor e um exemplar.', false);
                return;
            }

            const res = await fetch('/api/emprestimos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leitor_id, exemplar_id })
            });

            const data = await res.json();
            if (res.ok) {
                mostrarFeedback(data.mensagem, true);
                carregarDados();
            } else {
                mostrarFeedback(data.detail || 'Erro ao realizar empréstimo.', false);
            }
        }

        async function devolver(id) {
            const res = await fetch(`/api/emprestimos/${id}/devolucao`, { method: 'POST' });
            const data = await res.json();
            alert(data.mensagem || data.detail);
            carregarDados();
        }

        async function renovar(id) {
            const res = await fetch(`/api/emprestimos/${id}/renovacao`, { method: 'POST' });
            const data = await res.json();
            alert(data.mensagem || data.detail);
            carregarDados();
        }

        function mostrarFeedback(msg, success) {
            const fb = document.getElementById('mensagemFeedback');
            fb.classList.remove('hidden', 'bg-emerald-950', 'text-emerald-200', 'bg-rose-950', 'text-rose-200');
            if (success) {
                fb.classList.add('bg-emerald-950', 'text-emerald-200');
            } else {
                fb.classList.add('bg-rose-950', 'text-rose-200');
            }
            fb.innerText = msg;
        }

        carregarDados();
    </script>
</body>
</html>
"""

# ==============================================================================
# LAUNCHER DESKTOP LOCAL (Porta Livre e PyWebView)
# ==============================================================================
def obter_porta_livre():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

def iniciar_servidor(porta):
    uvicorn.run(app, host="127.0.0.1", port=porta, log_level="warning")

if __name__ == "__main__":
    PORTA = obter_porta_livre()
    URL = f"http://127.0.0.1:{PORTA}"

    print("=" * 60)
    print(" INICIALIZANDO SISTEMA DE GERENCIAMENTO DE BIBLIOTECA")
    print("=" * 60)
    print(f" Arquivo do Banco SQLite: {DB_PATH}")
    print(f" Servidor FastAPI escutando em: {URL}")
    print("=" * 60)

    # Inicia o servidor em segundo plano
    thread_servidor = threading.Thread(target=iniciar_servidor, args=(PORTA,), daemon=True)
    thread_servidor.start()
    time.sleep(1.2)  # Aguarda inicialização do FastAPI

    # Tenta abrir com PyWebView (desktop nativo), senão usa o navegador padrão
    try:
        import webview
        print(" Abrindo janela desktop com PyWebView...")
        webview.create_window("Sistema de Gerenciamento de Biblioteca", URL, width=1280, height=800)
        webview.start()
    except Exception as e:
        print(f" [INFO] PyWebView não disponível no sistema ({e}).")
        print(f" Abrindo automaticamente no seu navegador padrão: {URL}")
        webbrowser.open(URL)

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nEncerrando o sistema...")
