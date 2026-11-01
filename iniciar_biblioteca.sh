#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Se executado diretamente do pendrive, os dados e banco de dados ficam na própria pasta do pendrive
export BIBLIOTECA_DATA_DIR="$SCRIPT_DIR/dados_biblioteca"
mkdir -p "$BIBLIOTECA_DATA_DIR"

echo "=== Iniciando Sistema de Biblioteca (Modo Pendrive/Portátil) ==="
echo "Dados e banco SQLite persistidos em: $BIBLIOTECA_DATA_DIR"

cd "$SCRIPT_DIR"
chmod +x "$SCRIPT_DIR/dist/biblioteca/biblioteca"
"$SCRIPT_DIR/dist/biblioteca/biblioteca" "$@"
