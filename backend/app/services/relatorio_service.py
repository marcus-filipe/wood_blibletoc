from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.app.repositories.relatorio_repo import RelatorioRepository
from backend.app.services.exportacao_service import ExportacaoService

class RelatorioService:
    def __init__(self, db: Session):
        self.db = db
        self.relatorio_repo = RelatorioRepository(db)

    def _calcular_data_inicio(self, periodo: str) -> str | None:
        hoje = date.today()
        if periodo == "7dias":
            return (hoje - timedelta(days=7)).isoformat()
        elif periodo == "30dias":
            return (hoje - timedelta(days=30)).isoformat()
        elif periodo == "ano":
            return (hoje - timedelta(days=365)).isoformat()
        return None

    def livros_mais_emprestados(self, periodo: str = "todos", limite: int = 20):
        dt = self._calcular_data_inicio(periodo)
        return self.relatorio_repo.mais_emprestados(data_inicio=dt, limite=limite)

    def livros_menos_emprestados(self, periodo: str = "todos", limite: int = 20):
        dt = self._calcular_data_inicio(periodo)
        return self.relatorio_repo.menos_emprestados(data_inicio=dt, limite=limite)

    def alunos_top(
        self,
        ano: str | None = None,
        sala: str | None = None,
        periodo: str = "todos",
        limite: int = 20
    ):
        dt = self._calcular_data_inicio(periodo)
        return self.relatorio_repo.alunos_top(ano=ano, sala=sala, data_inicio=dt, limite=limite)

    def exportar(self, nome_relatorio: str, formato: str, periodo: str = "todos", ano: str | None = None, sala: str | None = None):
        formato = formato.lower()
        if nome_relatorio == "mais-emprestados":
            dados = self.livros_mais_emprestados(periodo=periodo, limite=1000)
            colunas = ["titulo", "autor", "categoria", "total_emprestimos"]
            titulo = "Livros Mais Emprestados"
        elif nome_relatorio == "menos-emprestados":
            dados = self.livros_menos_emprestados(periodo=periodo, limite=1000)
            colunas = ["titulo", "autor", "categoria", "total_emprestimos"]
            titulo = "Livros Menos Emprestados"
        elif nome_relatorio == "alunos-top":
            dados = self.alunos_top(ano=ano, sala=sala, periodo=periodo, limite=1000)
            colunas = ["nome", "matricula", "ano", "sala", "total_emprestimos"]
            titulo = "Leitores Mais Frequentes"
        else:
            dados = []
            colunas = ["info"]
            titulo = "Relatorio"

        if formato == "xlsx":
            content = ExportacaoService.gerar_xlsx(titulo, colunas, dados)
            mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"relatorio_{nome_relatorio}.xlsx"
            return content, mime, filename
        else:
            content = ExportacaoService.gerar_csv(colunas, dados)
            mime = "text/csv; charset=utf-8"
            filename = f"relatorio_{nome_relatorio}.csv"
            return content.encode("utf-8-sig"), mime, filename
