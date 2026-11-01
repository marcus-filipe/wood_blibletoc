from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.models.tipo_leitor import TipoLeitor
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.models.leitor import Leitor
from backend.app.models.emprestimo import Emprestimo
from backend.app.models.logs import LogBackup, LogImportacao

router = APIRouter(prefix="/api/database", tags=["Sincronização de Banco"])

class SyncPayload(BaseModel):
    tiposLeitor: list[dict] = []
    obras: list[dict] = []
    exemplares: list[dict] = []
    leitores: list[dict] = []
    emprestimos: list[dict] = []
    logsBackup: list[dict] = []
    logsImportacao: list[dict] = []

@router.post("/sync")
def sync_database(
    payload: SyncPayload,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    try:
        # 1. Sincronizar Tipos de Leitor
        for item in payload.tiposLeitor:
            tipo_id = item.get("id")
            if not tipo_id:
                continue
            existente = db.query(TipoLeitor).filter(TipoLeitor.id == tipo_id).first()
            if existente:
                existente.nome = item.get("nome", existente.nome)
                existente.prazo_dias = int(item.get("prazo_dias", existente.prazo_dias))
                existente.limite_emprestimos = int(item.get("limite_emprestimos", existente.limite_emprestimos))
                existente.max_renovacoes = int(item.get("max_renovacoes", existente.max_renovacoes))
            else:
                db.add(TipoLeitor(
                    id=tipo_id,
                    codigo=item.get("codigo", tipo_id),
                    nome=item.get("nome", "Tipo"),
                    prazo_dias=int(item.get("prazo_dias", 7)),
                    limite_emprestimos=int(item.get("limite_emprestimos", 3)),
                    max_renovacoes=int(item.get("max_renovacoes", 2))
                ))
        db.flush()

        # 2. Sincronizar Obras
        for item in payload.obras:
            obra_id = item.get("id")
            if not obra_id:
                continue
            ano = item.get("ano_publicacao")
            ano_val = int(ano) if ano is not None and str(ano).isdigit() else None
            existente = db.query(Obra).filter(Obra.id == obra_id).first()
            if existente:
                existente.titulo = item.get("titulo", existente.titulo)
                existente.autor = item.get("autor", existente.autor)
                existente.editora = item.get("editora", existente.editora)
                existente.ano_publicacao = ano_val if ano_val is not None else existente.ano_publicacao
                existente.isbn = item.get("isbn", existente.isbn)
                existente.categoria = item.get("categoria", existente.categoria)
                existente.tipo_material = item.get("tipo_material", existente.tipo_material)
                existente.ativo = item.get("ativo", existente.ativo)
            else:
                db.add(Obra(
                    id=obra_id,
                    titulo=item.get("titulo", "Sem título"),
                    autor=item.get("autor", "Autor desconhecido"),
                    editora=item.get("editora"),
                    ano_publicacao=ano_val,
                    isbn=item.get("isbn"),
                    categoria=item.get("categoria"),
                    tipo_material=item.get("tipo_material", "livro"),
                    ativo=item.get("ativo", True)
                ))
        db.flush()

        # 3. Sincronizar Exemplares
        for item in payload.exemplares:
            ex_id = item.get("id")
            if not ex_id:
                continue
            existente = db.query(Exemplar).filter(Exemplar.id == ex_id).first()
            if existente:
                existente.status = item.get("status", existente.status)
                existente.codigo_barras = item.get("codigo_barras", existente.codigo_barras)
            else:
                db.add(Exemplar(
                    id=ex_id,
                    obra_id=item.get("obra_id"),
                    codigo_barras=item.get("codigo_barras", ex_id),
                    status=item.get("status", "disponivel")
                ))
        db.flush()

        # 4. Sincronizar Leitores
        for item in payload.leitores:
            lei_id = item.get("id")
            if not lei_id:
                continue
            existente = db.query(Leitor).filter(Leitor.id == lei_id).first()
            if existente:
                existente.nome = item.get("nome", existente.nome)
                existente.matricula = item.get("matricula", existente.matricula)
                existente.tipo_leitor_id = item.get("tipo_leitor_id", existente.tipo_leitor_id)
                existente.ano = item.get("ano", existente.ano)
                existente.sala = item.get("sala", existente.sala)
                existente.contato = item.get("contato", existente.contato)
                existente.ativo = item.get("ativo", existente.ativo)
            else:
                db.add(Leitor(
                    id=lei_id,
                    nome=item.get("nome", "Leitor"),
                    matricula=item.get("matricula"),
                    tipo_leitor_id=item.get("tipo_leitor_id", "tipo-aluno"),
                    ano=item.get("ano"),
                    sala=item.get("sala"),
                    contato=item.get("contato"),
                    ativo=item.get("ativo", True)
                ))
        db.flush()

        # 5. Sincronizar Empréstimos (Devoluções, novos empréstimos, renovações)
        for item in payload.emprestimos:
            emp_id = item.get("id")
            if not emp_id:
                continue
            data_dev = item.get("data_devolucao") if "data_devolucao" in item else None
            existente = db.query(Emprestimo).filter(Emprestimo.id == emp_id).first()
            if existente:
                if "data_devolucao" in item:
                    existente.data_devolucao = item["data_devolucao"]
                existente.data_prevista = item.get("data_prevista", existente.data_prevista)
                existente.renovacoes = int(item.get("renovacoes", existente.renovacoes))
                existente.ano_leitor = item.get("ano_leitor", existente.ano_leitor)
                existente.sala_leitor = item.get("sala_leitor", existente.sala_leitor)

                if existente.exemplar_id:
                    ex = db.query(Exemplar).filter(Exemplar.id == existente.exemplar_id).first()
                    if ex:
                        ex.status = "disponivel" if existente.data_devolucao else "emprestado"
            else:
                db.add(Emprestimo(
                    id=emp_id,
                    exemplar_id=item.get("exemplar_id"),
                    leitor_id=item.get("leitor_id"),
                    data_emprestimo=item.get("data_emprestimo"),
                    data_prevista=item.get("data_prevista"),
                    data_devolucao=data_dev,
                    renovacoes=int(item.get("renovacoes", 0)),
                    ano_leitor=item.get("ano_leitor"),
                    sala_leitor=item.get("sala_leitor")
                ))
                ex_id = item.get("exemplar_id")
                if ex_id:
                    ex = db.query(Exemplar).filter(Exemplar.id == ex_id).first()
                    if ex:
                        ex.status = "disponivel" if data_dev else "emprestado"
        db.flush()

        # 6. Sincronizar Logs
        for item in payload.logsBackup:
            log_id = item.get("id")
            if log_id and not db.query(LogBackup).filter(LogBackup.id == log_id).first():
                db.add(LogBackup(
                    id=log_id,
                    data=item.get("data", ""),
                    destino=item.get("destino", ""),
                    status=item.get("status", "sucesso"),
                    mensagem=item.get("mensagem", "")
                ))

        for item in payload.logsImportacao:
            log_id = item.get("id")
            if log_id and not db.query(LogImportacao).filter(LogImportacao.id == log_id).first():
                db.add(LogImportacao(
                    id=log_id,
                    data=item.get("data", ""),
                    arquivo=item.get("arquivo", ""),
                    linhas_ok=item.get("linhas_ok", 0),
                    linhas_erro=item.get("linhas_erro", 0),
                    detalhes=item.get("detalhes", "")
                ))

        db.commit()
        return {"sucesso": True, "mensagem": "Banco de dados SQLite sincronizado com sucesso."}
    except Exception as e:
        db.rollback()
        return {"sucesso": False, "mensagem": f"Erro ao sincronizar banco: {str(e)}"}
