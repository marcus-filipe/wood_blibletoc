from datetime import date
from backend.app.models.leitor import Leitor
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.services.emprestimo_service import EmprestimoService
from backend.app.services.relatorio_service import RelatorioService

def test_relatorios_e_exportacao(db_session):
    emp_service = EmprestimoService(db_session)
    rel_service = RelatorioService(db_session)

    # Dados
    l1 = Leitor(id="l1", nome="Lucas", tipo_leitor_id="tipo-aluno", ano="1º", sala="A", ativo=True)
    l2 = Leitor(id="l2", nome="Bia", tipo_leitor_id="tipo-aluno", ano="2º", sala="B", ativo=True)
    o1 = Obra(id="o1", titulo="Dom Casmurro", autor="Machado", categoria="Romance")
    o2 = Obra(id="o2", titulo="Algoritmos", autor="Cormen", categoria="TI")
    ex1 = Exemplar(id="ex1", obra_id="o1", codigo_barras="BAR1", status="disponivel")
    ex2 = Exemplar(id="ex2", obra_id="o2", codigo_barras="BAR2", status="disponivel")
    db_session.add_all([l1, l2, o1, o2, ex1, ex2])
    db_session.commit()

    # Lucas pega Dom Casmurro e devolve
    emp1 = emp_service.registrar_emprestimo(leitor_id="l1", exemplar_id="ex1", data_atual=date(2026, 10, 1))
    emp_service.registrar_devolucao(emp1.id, data_atual=date(2026, 10, 5))

    # Bia pega Dom Casmurro
    emp2 = emp_service.registrar_emprestimo(leitor_id="l2", exemplar_id="ex1", data_atual=date(2026, 10, 6))

    # Relatório mais emprestados
    mais = rel_service.livros_mais_emprestados()
    assert len(mais) >= 1
    assert mais[0]["titulo"] == "Dom Casmurro"
    assert mais[0]["total_emprestimos"] == 2

    # Relatório Alunos Top com filtro
    alunos_1a = rel_service.alunos_top(ano="1º", sala="A")
    assert len(alunos_1a) == 1
    assert alunos_1a[0]["nome"] == "Lucas"

    # Teste Exportação CSV
    csv_bytes, mime_csv, fname_csv = rel_service.exportar("mais-emprestados", "csv")
    assert b"Dom Casmurro" in csv_bytes
    assert mime_csv == "text/csv; charset=utf-8"

    # Teste Exportação XLSX
    xlsx_bytes, mime_xlsx, fname_xlsx = rel_service.exportar("mais-emprestados", "xlsx")
    assert len(xlsx_bytes) > 0
    assert "openxmlformats" in mime_xlsx
