from datetime import date
import pytest
from fastapi import HTTPException
from backend.app.models.leitor import Leitor
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.services.emprestimo_service import EmprestimoService
from backend.app.services.atraso_service import AtrasoService

def test_deteccao_atraso_e_bloqueio(db_session):
    emp_service = EmprestimoService(db_session)
    atraso_service = AtrasoService(db_session)

    leitor = Leitor(id="l_atraso", nome="Aluno Atrasado", tipo_leitor_id="tipo-aluno", ativo=True)
    obra = Obra(id="o_atr", titulo="Livro Atrasado", autor="Autor")
    ex1 = Exemplar(id="ex_atr1", obra_id="o_atr", codigo_barras="BAR-ATR1", status="disponivel")
    ex2 = Exemplar(id="ex_atr2", obra_id="o_atr", codigo_barras="BAR-ATR2", status="disponivel")
    db_session.add_all([leitor, obra, ex1, ex2])
    db_session.commit()

    # Empréstimo feito em 2026-10-01 (previsto para 2026-10-08)
    data_emp = date(2026, 10, 1)
    emp = emp_service.registrar_emprestimo(leitor_id="l_atraso", exemplar_id="ex_atr1", data_atual=data_emp)

    # Em 2026-10-07 não está em atraso
    assert not atraso_service.is_loan_overdue(emp, data_ref="2026-10-07")
    assert not atraso_service.leitor_possui_atraso("l_atraso", data_ref="2026-10-07")

    # Em 2026-10-09 está em atraso (1 dia)
    assert atraso_service.is_loan_overdue(emp, data_ref="2026-10-09")
    assert atraso_service.leitor_possui_atraso("l_atraso", data_ref="2026-10-09")
    assert atraso_service.calcular_dias_atraso(emp.data_prevista, data_ref="2026-10-09") == 1

    # Tentar novo empréstimo no dia 09 deve ser bloqueado (Seção 7.1)
    with pytest.raises(HTTPException) as exc_info:
        emp_service.registrar_emprestimo(leitor_id="l_atraso", exemplar_id="ex_atr2", data_atual=date(2026, 10, 9))
    assert "atraso" in str(exc_info.value.detail).lower()

    # Tentar renovar item atrasado deve ser bloqueado (Seção 7.2)
    with pytest.raises(HTTPException) as exc_renov:
        emp_service.registrar_renovacao(emp.id, data_atual=date(2026, 10, 9))
    assert "atraso" in str(exc_renov.value.detail).lower()

    # Ao devolver, o bloqueio do leitor deixa de existir (Seção 7.3)
    emp_service.registrar_devolucao(emp.id, data_atual=date(2026, 10, 10))
    assert not atraso_service.leitor_possui_atraso("l_atraso", data_ref="2026-10-10")

    # Agora o novo empréstimo é autorizado
    novo_emp = emp_service.registrar_emprestimo(leitor_id="l_atraso", exemplar_id="ex_atr2", data_atual=date(2026, 10, 10))
    assert novo_emp.id is not None
