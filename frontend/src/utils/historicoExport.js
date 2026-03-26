import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

function formatDateBR(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

function formatBool(value) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '-';
}

function formatPrazoDias(value) {
  if (value === null || value === undefined) return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n === 1 ? '1 dia' : `${n} dias`;
}

function formatAtrasoDias(value) {
  if (value === null || value === undefined) return '-';
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '-';
  return n === 1 ? '1 dia' : `${n} dias`;
}

/** Ordem e rótulos alinhados à tela Histórico */
const EXPORT_DEFS = [
  { header: 'Documento SIAFI', cell: (r) => String(r.nu_documento_siafi ?? '') },
  { header: 'Fornecedor', cell: (r) => String(r.nm_fornecedor ?? '') },
  { header: 'Material', cell: (r) => String(r.cd_material ?? '') },
  { header: 'Confirmação e-mail recebido', cell: (r) => formatDateBR(r.dt_confirmacao_recebimento) },
  { header: 'Prazo de entrega', cell: (r) => formatPrazoDias(r.prazo_entrega_dias) },
  { header: 'Previsão de entrega', cell: (r) => formatDateBR(r.previsao_entrega_calc) },
  { header: 'Atraso', cell: (r) => formatAtrasoDias(r.atraso_dias) },
  { header: 'Apuração irregularidade', cell: (r) => formatBool(r.apuracao_irregularidade) },
  { header: 'Troca de marca', cell: (r) => formatBool(r.troca_marca) },
  { header: 'Aplicação de IMR', cell: (r) => formatBool(r.aplicacao_imr) },
  { header: 'Status entrega', cell: (r) => String(r.status_entrega ?? '') },
  { header: 'Usuário responsável', cell: (r) => (r.resp_cadastro ? String(r.resp_cadastro) : '-') },
  { header: 'Observação', cell: (r) => (r.observacao ? String(r.observacao) : '-') },
  { header: 'Atualizado em', cell: (r) => formatDateBR(r.dt_atualiz) },
];

function rowsToMatrix(rows) {
  return rows.map((r) => EXPORT_DEFS.map((d) => d.cell(r)));
}

function stampFilename(ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `historico-${y}${m}${day}-${h}${min}.${ext}`;
}

/** Cabeçalhos só no PDF: quebras \n economizam largura (evita colunas largas demais). */
const PDF_HEAD_LABELS = [
  'Documento\nSIAFI',
  'Fornecedor',
  'Material',
  'Confirmação\ne-mail recebido',
  'Prazo\nentrega',
  'Previsão\nentrega',
  'Atraso',
  'Apuração\nirregularidade',
  'Troca\nde marca',
  'Aplicação\nde IMR',
  'Status\nentrega',
  'Usuário\nresponsável',
  'Observação',
  'Atualizado\nem',
];

/**
 * PDF em uma única tabela (paisagem): sem horizontalPageBreak — esse modo parte a tabela em dois blocos.
 * Largura fixa na página + fonte menor + linebreak nas células.
 */
export function exportHistoricoPdf(rows) {
  const head = [PDF_HEAD_LABELS];
  const body = rowsToMatrix(rows);

  const margin = { top: 10, right: 6, bottom: 10, left: 6 };
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const tableWidth = pageW - margin.left - margin.right;

  autoTable(doc, {
    head,
    body,
    styles: {
      fontSize: 5,
      cellPadding: 0.35,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      valign: 'top',
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [20, 93, 80],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 5,
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak',
      cellPadding: 0.4,
    },
    bodyStyles: { valign: 'top', fontSize: 5 },
    margin,
    showHead: 'everyPage',
    tableWidth,
    theme: 'grid',
  });

  doc.save(stampFilename('pdf'));
}

/**
 * Excel com cabeçalho formatado, larguras e quebra de texto nas células.
 */
export async function exportHistoricoExcel(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gestão de Empenho';
  const ws = wb.addWorksheet('Histórico', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = EXPORT_DEFS.map((d) => d.header);
  ws.addRow(headers);

  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF145D50' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  for (const r of rows) {
    const values = EXPORT_DEFS.map((d) => d.cell(r));
    const row = ws.addRow(values);
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  }

  const widths = [18, 42, 12, 18, 14, 18, 12, 16, 14, 14, 14, 22, 28, 16];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = stampFilename('xlsx');
  a.click();
  URL.revokeObjectURL(url);
}
