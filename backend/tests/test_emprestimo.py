from datetime import date, timedelta
import pytest
from fastapi import HTTPException
from backend.app.models.leitor import Leitor
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.services.emprestimo_service import EmprestimoService

def test_emprestimo_fluxo_completo(db_session):
    service = EmprestimoService(db_session)
    hoje = date(2026, 10, 1)

    # 1. Cadastrar leitor e exemplar
    leitor = Leitor(id="l1", nome="Lucas Aluno", matricula="202601", tipo_leitor_id="tipo-aluno", ano="3º", sala="B", ativo=True)
    obra = Obra(id="o1", titulo="Dom Casmurro", autor="Machado de Assis")
    exemplar = Exemplar(id="ex1", obra_id="o1", codigo_barras="BAR123", status="disponivel")
    db_session.add_all([leitor, obra, exemplar])
    db_session.commit()

    # 2. Realizar empréstimo
    emp = service.registrar_emprestimo(leitor_id="l1", exemplar_id="ex1", data_atual=hoje)
    assert emp.exemplar_id == "ex1"
    assert emp.data_emprestimo == "2026-10-01"
    assert emp.data_prevista == "2026-10-08"  # 7 dias para Aluno
    assert emp.ano_leitor == "3º"
    assert emp.sala_leitor == "B"
    assert exemplar.status == "emprestado"

    # 3. Renovar empréstimo
    hoje_renov = date(2026, 10, 5)
    emp_renov = service.registrar_renovacao(emp.id, data_atual=hoje_renov)
    assert emp_renov.renovacoes == 1
    assert emp_renov.data_prevista == "2026-10-12"  # 5 + 7 dias

    # 4. Devolver
    hoje_dev = date(2026, 10, 10)
    emp_dev = service.registrar_devolucao(emp.id, data_atual=hoje_dev)
    assert emp_dev.data_devolucao == "2026-10-10"
    assert exemplar.status == "disponivel"

def test_bloqueio_limite_emprestimos(db_session):
    service = EmprestimoService(db_session)
    hoje = date(2026, 10, 1)

    # Leitor aluno (limite = 3)
    leitor = Leitor(id="l2", nome="Mariana", tipo_leitor_id="tipo-aluno", ativo=True)
    obra = Obra(id="o2", titulo="Livro Geral", autor="Autor")
    db_session.add_all([leitor, obra])

    # Criar 3 exemplares e emprestar
    for i in range(1, 4):
        ex = Exemplar(id=f"ex-{i}", obra_id="o2", codigo_barras=f"BAR-{i}", status="disponivel")
        db_session.add(ex)
        db_session.commit()
        service.registrar_emprestimo(leitor_id="l2", exemplar_id=ex.id, data_atual=hoje)

    # 4º empréstimo deve ser bloqueado
    ex_extra = Exemplar(id="ex-extra", obra_id="o2", codigo_barras="BAR-EXTRA", status="disponivel")
    db_session.add(ex_extra)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_emprestimo(leitor_id="l2", exemplar_id="ex-extra", data_atual=hoje)
    assert "Limite atingido" in str(exc_info.value.detail)

def test_bloqueio_leitor_inativo(db_session):
    service = EmprestimoService(db_session)
    leitor = Leitor(id="l_inativo", nome="Inativo", tipo_leitor_id="tipo-aluno", ativo=False)
    obra = Obra(id="o3", titulo="Obra", autor="Autor")
    ex = Exemplar(id="ex-inativo", obra_id="o3", codigo_barras="BAR-INAT", status="disponivel")
    db_session.add_all([leitor, obra, ex])
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.registrar_emprestimo(leitor_id="l_inativo", exemplar_id="ex-inativo")
    assert "inativo" in str(exc_info.value.detail)
