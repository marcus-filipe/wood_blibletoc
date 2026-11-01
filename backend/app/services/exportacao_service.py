import csv
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

class ExportacaoService:
    @staticmethod
    def gerar_csv(colunas: list[str], dados: list[dict]) -> str:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=colunas, delimiter=";")
        writer.writeheader()
        for linha in dados:
            cleaned_row = {col: linha.get(col, "") for col in colunas}
            writer.writerow(cleaned_row)
        return output.getvalue()

    @staticmethod
    def gerar_xlsx(titulo_aba: str, colunas: list[str], dados: list[dict]) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = titulo_aba[:30]

        # Estilo do cabeçalho
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")

        ws.append(colunas)
        for col_num in range(1, len(colunas) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        for linha in dados:
            ws.append([linha.get(col, "") for col in colunas])

        # Ajuste de largura das colunas
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()
