#!/usr/bin/env bash
# Script para instalar dependências e rodar o Sistema de Biblioteca no seu Notebook

set -e

echo "=== Instalando dependências necessárias ==="
pip install --upgrade pip
pip install fastapi uvicorn pywebview

echo "=== Iniciando Sistema de Gerenciamento de Biblioteca ==="
python3 sistema_biblioteca_desktop.py
