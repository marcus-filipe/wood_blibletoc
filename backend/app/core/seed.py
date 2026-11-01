from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.models.leitor import Leitor
from backend.app.models.emprestimo import Emprestimo

def seed_sample_data_if_empty(db: Session):
    """Popula dados iniciais de demonstração caso o banco de dados esteja vazio."""
    if db.query(Obra).count() > 0:
        return

    hoje = date.today()
    hoje_str = hoje.isoformat()

    # 1. Obras Iniciais
    obras = [
        Obra(
            id="obra-1",
            titulo="Dom Casmurro",
            autor="Machado de Assis",
            editora="Garnier",
            ano_publicacao=1899,
            isbn="978-8572329381",
            categoria="Literatura Brasileira",
            tipo_material="livro",
            ativo=True
        ),
        Obra(
            id="obra-2",
            titulo="Algoritmos: Teoria e Prática",
            autor="Thomas H. Cormen, Charles E. Leiserson",
            editora="Campus / Elsevier",
            ano_publicacao=2012,
            isbn="978-8535236995",
            categoria="Ciência da Computação",
            tipo_material="livro",
            ativo=True
        ),
        Obra(
            id="obra-3",
            titulo="Cálculo com Geometria Analítica - Vol. 1",
            autor="James Stewart",
            editora="Cengage Learning",
            ano_publicacao=2016,
            isbn="978-8522112586",
            categoria="Matemática e Exatas",
            tipo_material="livro",
            ativo=True
        ),
        Obra(
            id="obra-4",
            titulo="Engenharia de Software: Uma Abordagem Profissional",
            autor="Roger S. Pressman, Bruce R. Maxim",
            editora="AMGH",
            ano_publicacao=2016,
            isbn="978-8580555332",
            categoria="Ciência da Computação",
            tipo_material="livro",
            ativo=True
        ),
        Obra(
            id="obra-5",
            titulo="Memórias Póstumas de Brás Cubas",
            autor="Machado de Assis",
            editora="Companhia das Letras",
            ano_publicacao=1881,
            isbn="978-8535924848",
            categoria="Literatura Brasileira",
            tipo_material="livro",
            ativo=True
        ),
        Obra(
            id="obra-6",
            titulo="Revista Brasileira de Computação Aplicada",
            autor="Sociedade Brasileira de Computação",
            editora="SBC Editora",
            ano_publicacao=2024,
            isbn="2176-6649",
            categoria="Periódico Científico",
            tipo_material="periodico",
            ativo=True
        ),
        Obra(
            id="obra-7",
            titulo="Física Clássica: Mecânica e Termologia",
            autor="Halliday & Resnick",
            editora="LTC",
            ano_publicacao=2018,
            isbn="978-8521630357",
            categoria="Física",
            tipo_material="livro",
            ativo=True
        )
    ]
    db.add_all(obras)
    db.flush()

    # 2. Exemplares
    exemplares = [
        Exemplar(id="ex-101", obra_id="obra-1", codigo_barras="TOMBO-1001", status="disponivel"),
        Exemplar(id="ex-102", obra_id="obra-1", codigo_barras="TOMBO-1002", status="emprestado"),
        Exemplar(id="ex-201", obra_id="obra-2", codigo_barras="TOMBO-2001", status="emprestado"),
        Exemplar(id="ex-202", obra_id="obra-2", codigo_barras="TOMBO-2002", status="disponivel"),
        Exemplar(id="ex-301", obra_id="obra-3", codigo_barras="TOMBO-3001", status="disponivel"),
        Exemplar(id="ex-401", obra_id="obra-4", codigo_barras="TOMBO-4001", status="emprestado"),
        Exemplar(id="ex-501", obra_id="obra-5", codigo_barras="TOMBO-5001", status="disponivel"),
        Exemplar(id="ex-601", obra_id="obra-6", codigo_barras="TOMBO-6001", status="disponivel"),
        Exemplar(id="ex-701", obra_id="obra-7", codigo_barras="TOMBO-7001", status="disponivel"),
    ]
    db.add_all(exemplares)
    db.flush()

    # 3. Leitores
    leitores = [
        Leitor(
            id="leitor-1",
            nome="Lucas Gabriel Pereira",
            matricula="2024-0012",
            tipo_leitor_id="tipo-aluno",
            ano="3º Ano",
            sala="Turma B",
            contato="(11) 98765-4321",
            ativo=True
        ),
        Leitor(
            id="leitor-2",
            nome="Beatriz Helena Santos",
            matricula="2024-0045",
            tipo_leitor_id="tipo-aluno",
            ano="2º Ano",
            sala="Turma A",
            contato="(11) 97654-3210",
            ativo=True
        ),
        Leitor(
            id="leitor-3",
            nome="Prof. Carlos Eduardo Mendes",
            matricula="DOC-8891",
            tipo_leitor_id="tipo-professor",
            ano=None,
            sala="Sala dos Professores",
            contato="carlos.mendes@escola.edu.br",
            ativo=True
        ),
        Leitor(
            id="leitor-4",
            nome="Mariana da Silva Costa",
            matricula="",
            tipo_leitor_id="tipo-publico",
            ano=None,
            sala=None,
            contato="(11) 91234-5678",
            ativo=True
        ),
        Leitor(
            id="leitor-5",
            nome="Rafael Souza Neves",
            matricula="2023-0199",
            tipo_leitor_id="tipo-aluno",
            ano="3º Ano",
            sala="Turma B",
            contato="(11) 94455-6677",
            ativo=True
        )
    ]
    db.add_all(leitores)
    db.flush()

    # 4. Empréstimos Iniciais (incluindo empréstimo ativo e um em atraso para teste de alerta)
    data_atrasada_prev = (hoje - timedelta(days=3)).isoformat()
    data_atrasada_emp = (hoje - timedelta(days=10)).isoformat()

    data_vigente_emp = (hoje - timedelta(days=2)).isoformat()
    data_vigente_prev = (hoje + timedelta(days=5)).isoformat()

    emprestimos = [
        # Empréstimo em atraso (Lucas tem Dom Casmurro)
        Emprestimo(
            id="emp-1",
            exemplar_id="ex-102",
            leitor_id="leitor-1",
            data_emprestimo=data_atrasada_emp,
            data_prevista=data_atrasada_prev,
            data_devolucao=None,
            renovacoes=0,
            ano_leitor="3º Ano",
            sala_leitor="Turma B"
        ),
        # Empréstimo em dia (Beatriz tem Algoritmos)
        Emprestimo(
            id="emp-2",
            exemplar_id="ex-201",
            leitor_id="leitor-2",
            data_emprestimo=data_vigente_emp,
            data_prevista=data_vigente_prev,
            data_devolucao=None,
            renovacoes=0,
            ano_leitor="2º Ano",
            sala_leitor="Turma A"
        ),
        # Empréstimo do Professor Carlos (Software)
        Emprestimo(
            id="emp-3",
            exemplar_id="ex-401",
            leitor_id="leitor-3",
            data_emprestimo=(hoje - timedelta(days=4)).isoformat(),
            data_prevista=(hoje + timedelta(days=11)).isoformat(),
            data_devolucao=None,
            renovacoes=0,
            ano_leitor=None,
            sala_leitor="Sala dos Professores"
        )
    ]
    db.add_all(emprestimos)
    db.commit()
