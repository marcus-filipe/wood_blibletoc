from io import BytesIO
from fastapi import UploadFile
from backend.app.services.importacao_service import ImportacaoService
from backend.app.models.exemplar import Exemplar
from backend.app.models.logs import LogImportacao

def test_importacao_previa_e_confirmacao(db_session):
    service = ImportacaoService(db_session)

    csv_data = (
        "titulo;autor;editora;ano;isbn;categoria;tipo_material;codigo_barras\n"
        "Capitães da Areia;Jorge Amado;Companhia das Letras;1937;978-8535914061;Literatura;livro;BAR-CAP-01\n"
        ";Autor Sem Titulo;Editora;2020;;;;BAR-SEM-TIT\n"  # Linha com erro
    ).encode("utf-8")

    upload_file = UploadFile(filename="teste.csv", file=BytesIO(csv_data))
    previa = service.processar_previa(upload_file, csv_data)

    assert previa.total_linhas == 2
    assert previa.linhas_validas == 1
    assert previa.linhas_com_erro == 1
    assert previa.itens[0].valido is True
    assert previa.itens[1].valido is False
    assert "titulo" in previa.itens[1].erros[0]

    # Confirmar importação
    res = service.confirmar_importacao("teste.csv", previa.itens)
    assert res.sucesso is True
    assert res.importados == 1

    # Verificar exemplar no banco
    ex = db_session.query(Exemplar).filter(Exemplar.codigo_barras == "BAR-CAP-01").first()
    assert ex is not None
    assert ex.status == "disponivel"

    # Verificar log registrado
    log = db_session.query(LogImportacao).filter(LogImportacao.arquivo == "teste.csv").first()
    assert log is not None
    assert log.linhas_ok == 1
