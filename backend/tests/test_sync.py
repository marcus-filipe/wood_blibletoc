from backend.app.models.emprestimo import Emprestimo
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.models.leitor import Leitor
from fastapi.testclient import TestClient
from backend.app.main import app

def test_database_sync_endpoint():
    client = TestClient(app)
    
    payload = {
        "tiposLeitor": [
            {"id": "tipo-aluno", "codigo": "aluno", "nome": "Aluno Teste", "prazo_dias": 7, "limite_emprestimos": 3, "max_renovacoes": 2}
        ],
        "obras": [
            {"id": "obra-sync-1", "titulo": "Livro Sincronizado", "autor": "Autor Teste", "tipo_material": "livro", "ativo": True}
        ],
        "exemplares": [
            {"id": "ex-sync-1", "obra_id": "obra-sync-1", "codigo_barras": "BAR-SYNC-999", "status": "disponivel"}
        ],
        "leitores": [
            {"id": "lei-sync-1", "nome": "Leitor Sync", "tipo_leitor_id": "tipo-aluno", "ativo": True}
        ],
        "emprestimos": [
            {
                "id": "emp-sync-1",
                "exemplar_id": "ex-sync-1",
                "leitor_id": "lei-sync-1",
                "data_emprestimo": "2026-10-01",
                "data_prevista": "2026-10-08",
                "data_devolucao": "2026-10-05",  # Marcado como devolvido!
                "renovacoes": 0
            }
        ],
        "logsBackup": [],
        "logsImportacao": []
    }
    
    res = client.post("/api/database/sync", json=payload)
    assert res.status_code == 200
    assert res.json()["sucesso"] is True
