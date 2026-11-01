import uuid
from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.leitor import Leitor
from backend.app.models.tipo_leitor import TipoLeitor
from backend.app.models.exemplar import Exemplar
from backend.app.models.emprestimo import Emprestimo
from backend.app.repositories.emprestimo_repo import EmprestimoRepository
from backend.app.services.atraso_service import AtrasoService

class EmprestimoService:
    def __init__(self, db: Session):
        self.db = db
        self.emprestimo_repo = EmprestimoRepository(db)
        self.atraso_service = AtrasoService(db)

    @staticmethod
    def get_today() -> date:
        return date.today()

    def registrar_emprestimo(
        self,
        leitor_id: str,
        exemplar_id: str | None = None,
        codigo_barras: str | None = None,
        data_atual: date | None = None
    ) -> Emprestimo:
        hoje = data_atual or self.get_today()
        hoje_str = hoje.isoformat()

        # 1. Validar Leitor
        leitor = self.db.query(Leitor).filter(Leitor.id == leitor_id).first()
        if not leitor:
            raise HTTPException(status_code=404, detail="Leitor não encontrado.")
        if not leitor.ativo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empréstimo bloqueado: O cadastro do leitor está inativo."
            )

        # 2. Obter Tipo de Leitor e Política
        tipo_leitor = self.db.query(TipoLeitor).filter(TipoLeitor.id == leitor.tipo_leitor_id).first()
        if not tipo_leitor:
            raise HTTPException(status_code=400, detail="Política do tipo de leitor não encontrada.")

        # 3. Validar se o Leitor possui empréstimo em atraso
        if self.atraso_service.leitor_possui_atraso(leitor_id, hoje_str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empréstimo bloqueado: O leitor possui empréstimos em atraso pendentes de devolução."
            )

        # 4. Validar limite de itens emprestados
        abertos_count = self.emprestimo_repo.count_open_loans_by_leitor(leitor_id)
        if abertos_count >= tipo_leitor.limite_emprestimos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Limite atingido: O perfil '{tipo_leitor.nome}' permite no máximo {tipo_leitor.limite_emprestimos} item(ns) simultâneo(s)."
            )

        # 5. Localizar Exemplar
        exemplar = None
        if codigo_barras:
            exemplar = self.db.query(Exemplar).filter(Exemplar.codigo_barras == codigo_barras.strip()).first()
        elif exemplar_id:
            exemplar = self.db.query(Exemplar).filter(Exemplar.id == exemplar_id).first()

        if not exemplar:
            raise HTTPException(
                status_code=404,
                detail=f"Exemplar '{codigo_barras or exemplar_id}' não foi encontrado no acervo."
            )

        # 6. Validar status do exemplar
        if exemplar.status != "disponivel":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Exemplar indisponível para empréstimo (situação atual: {exemplar.status})."
            )

        # 7. Calcular data prevista
        data_prevista = (hoje + timedelta(days=tipo_leitor.prazo_dias)).isoformat()

        # 8. Atualizar exemplar para 'emprestado'
        exemplar.status = "emprestado"

        # 9. Criar empréstimo com snapshot de ano/sala
        emprestimo_id = f"emp-{uuid.uuid4().hex[:8]}"
        emprestimo = self.emprestimo_repo.create(
            emprestimo_id=emprestimo_id,
            exemplar_id=exemplar.id,
            leitor_id=leitor.id,
            data_emprestimo=hoje_str,
            data_prevista=data_prevista,
            ano_leitor=leitor.ano,
            sala_leitor=leitor.sala
        )
        return emprestimo

    def registrar_devolucao(
        self,
        emprestimo_id: str,
        data_atual: date | None = None
    ) -> Emprestimo:
        hoje = data_atual or self.get_today()
        hoje_str = hoje.isoformat()

        emprestimo = self.emprestimo_repo.get_by_id(emprestimo_id)
        if not emprestimo:
            raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
        if emprestimo.data_devolucao:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este empréstimo já foi devolvido anteriormente."
            )

        # Restaurar status do exemplar para 'disponivel'
        exemplar = self.db.query(Exemplar).filter(Exemplar.id == emprestimo.exemplar_id).first()
        if exemplar and exemplar.status == "emprestado":
            exemplar.status = "disponivel"

        emprestimo = self.emprestimo_repo.registrar_devolucao(emprestimo, hoje_str)
        return emprestimo

    def registrar_renovacao(
        self,
        emprestimo_id: str,
        data_atual: date | None = None
    ) -> Emprestimo:
        hoje = data_atual or self.get_today()
        hoje_str = hoje.isoformat()

        emprestimo = self.emprestimo_repo.get_by_id(emprestimo_id)
        if not emprestimo:
            raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
        if emprestimo.data_devolucao:
            raise HTTPException(status_code=400, detail="Não é possível renovar um empréstimo já devolvido.")

        # Verificar se está atrasado (Seção 7.2)
        if self.atraso_service.is_loan_overdue(emprestimo, hoje_str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Renovação bloqueada: O empréstimo está em atraso. Regularize a devolução."
            )

        # Obter leitor e política
        leitor = self.db.query(Leitor).filter(Leitor.id == emprestimo.leitor_id).first()
        if not leitor:
            raise HTTPException(status_code=404, detail="Leitor não encontrado.")
        tipo_leitor = self.db.query(TipoLeitor).filter(TipoLeitor.id == leitor.tipo_leitor_id).first()
        if not tipo_leitor:
            raise HTTPException(status_code=400, detail="Tipo de leitor não encontrado.")

        # Verificar limite de renovações (Seção 7.2)
        if emprestimo.renovacoes >= tipo_leitor.max_renovacoes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Limite de renovações atingido ({tipo_leitor.max_renovacoes} permitida(s))."
            )

        # Novo prazo a partir da data atual (Seção 7.2)
        nova_data_prevista = (hoje + timedelta(days=tipo_leitor.prazo_dias)).isoformat()
        return self.emprestimo_repo.registrar_renovacao(emprestimo, nova_data_prevista)
