import csv
import io
import json
import uuid
from datetime import datetime
import openpyxl
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from backend.app.models.obra import Obra
from backend.app.models.exemplar import Exemplar
from backend.app.models.logs import LogImportacao
from backend.app.schemas.importacao import PreviaResponse, ItemPrevia, ImportarResponse

class ImportacaoService:
    def __init__(self, db: Session):
        self.db = db

    def processar_previa(self, file: UploadFile, content: bytes) -> PreviaResponse:
        filename = file.filename or "upload.csv"
        rows = []

        if filename.endswith(".xlsx"):
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            rows_iter = sheet.iter_rows(values_only=True)
            header = [str(cell or "").strip().lower() for cell in next(rows_iter, [])]
            for row_vals in rows_iter:
                row_dict = {header[i]: row_vals[i] for i in range(min(len(header), len(row_vals)))}
                rows.append(row_dict)
        else:
            # CSV decoding with utf-8 fallback to latin-1
            try:
                decoded = content.decode("utf-8")
            except UnicodeDecodeError:
                decoded = content.decode("latin-1")
            
            # Detect separator
            sample = decoded[:2048]
            delimiter = ";" if ";" in sample else ","
            reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
            for r in reader:
                cleaned = {k.strip().lower(): v for k, v in r.items() if k}
                rows.append(cleaned)

        itens: list[ItemPrevia] = []
        barcodes_seen = set()
        
        # Obter códigos já existentes no banco
        existing_barcodes = {
            b[0] for b in self.db.query(Exemplar.codigo_barras).all()
        }

        for idx, row in enumerate(rows, start=1):
            titulo = str(row.get("titulo") or "").strip()
            autor = str(row.get("autor") or "").strip()
            editora = str(row.get("editora") or "").strip() or None
            ano_str = str(row.get("ano") or row.get("ano_publicacao") or "").strip()
            isbn = str(row.get("isbn") or "").strip() or None
            categoria = str(row.get("categoria") or "").strip() or None
            tipo_mat = str(row.get("tipo_material") or "livro").strip().lower()
            codigo = str(row.get("codigo_barras") or row.get("tombo") or "").strip()

            erros = []
            if not titulo:
                erros.append("Campo 'titulo' é obrigatório")
            if not autor:
                erros.append("Campo 'autor' é obrigatório")
            if not codigo:
                erros.append("Código de barras/tombo é obrigatório")
            elif codigo in barcodes_seen:
                erros.append(f"Código '{codigo}' duplicado na planilha")
            elif codigo in existing_barcodes:
                erros.append(f"Código '{codigo}' já existe no acervo")

            ano = None
            if ano_str:
                try:
                    ano = int(float(ano_str))
                except ValueError:
                    erros.append(f"Ano '{ano_str}' inválido")

            if tipo_mat not in ["livro", "periodico", "midia"]:
                tipo_mat = "livro"

            if codigo and not erros:
                barcodes_seen.add(codigo)

            itens.append(
                ItemPrevia(
                    linha=idx,
                    titulo=titulo,
                    autor=autor,
                    editora=editora,
                    ano=ano,
                    isbn=isbn,
                    categoria=categoria,
                    tipo_material=tipo_mat,
                    codigo_barras=codigo,
                    valido=len(erros) == 0,
                    erros=erros
                )
            )

        total = len(itens)
        validas = sum(1 for i in itens if i.valido)
        erros_cnt = total - validas

        return PreviaResponse(
            arquivo=filename,
            total_linhas=total,
            linhas_validas=validas,
            linhas_com_erro=erros_cnt,
            itens=itens
        )

    def confirmar_importacao(self, arquivo: str, itens: list[ItemPrevia]) -> ImportarResponse:
        """Executa a importação dentro de uma transação única (Seção 11)."""
        validos = [i for i in itens if i.valido]
        if not validos:
            raise HTTPException(status_code=400, detail="Nenhum item válido para importar.")

        detalhes_erros = []
        importados = 0

        try:
            # Agrupar por titulo + autor ou cadastrar obras e exemplares
            obras_cache: dict[str, Obra] = {}

            for item in validos:
                chave_obra = f"{item.titulo.lower()}___{item.autor.lower()}"
                obra = obras_cache.get(chave_obra)
                if not obra:
                    obra_id = f"obra-{uuid.uuid4().hex[:8]}"
                    obra = Obra(
                        id=obra_id,
                        titulo=item.titulo,
                        autor=item.autor,
                        editora=item.editora,
                        ano_publicacao=item.ano,
                        isbn=item.isbn,
                        categoria=item.categoria,
                        tipo_material=item.tipo_material,
                        ativo=True
                    )
                    self.db.add(obra)
                    self.db.flush()
                    obras_cache[chave_obra] = obra

                exemplar = Exemplar(
                    id=f"ex-{uuid.uuid4().hex[:8]}",
                    obra_id=obra.id,
                    codigo_barras=item.codigo_barras,
                    status="disponivel"
                )
                self.db.add(exemplar)
                importados += 1

            # Registrar log de importação
            log = LogImportacao(
                id=f"log-imp-{uuid.uuid4().hex[:8]}",
                data=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                arquivo=arquivo,
                linhas_ok=importados,
                linhas_erro=len(itens) - len(validos),
                detalhes=f"Sucesso: {importados} exemplar(es) cadastrado(s)."
            )
            self.db.add(log)
            self.db.commit()

            return ImportarResponse(
                sucesso=True,
                importados=importados,
                erros=len(itens) - len(validos),
                mensagem=f"Importação concluída com sucesso: {importados} itens adicionados ao acervo."
            )
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Falha na importação. Transação desfeita: {str(e)}"
            )
