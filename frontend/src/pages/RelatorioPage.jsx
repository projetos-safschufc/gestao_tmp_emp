import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Button from '../components/ui/button/Button.jsx';
import { getRelatorioDiagnostico } from '../api/relatoriosApi.js';

function formatCurrencyBR(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatNumber(v, digits = 2) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(n);
}

function formatPercent(v, digits = 2) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(n)}%`;
}

function formatDateBR(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function toPositiveFromNegative(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n * -1;
}

function calcCoberturaFromMediaEstoque(row) {
  const mediaMensalPositiva = toPositiveFromNegative(row?.media_consumo_mensal);
  const estoque = Number(row?.estoque);
  if (!Number.isFinite(mediaMensalPositiva) || !Number.isFinite(estoque)) return null;
  return  estoque / mediaMensalPositiva;
}

async function loadImageDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao obter contexto do canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ dataUrl, width: canvas.width, height: canvas.height });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

async function exportRelatorioPdf(diagnostico, empenho) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const rows = diagnostico?.itens || [];
  const head = [[
    'Empenho',
    'Item',
    'Material',
    'Fornecedor',
    'Pendente',
    'Estoque',
    'Consumo último mês',
    'Média 6m',
    'Cobertura (meses)',
    'Indicador',
    'Risco de ruptura',
  ]];
  const body = rows.map((r) => [
    diagnostico?.identificacao?.numero_empenho || '-',
    String(r.item_pregao ?? '-'),
    r.material || r.cd_material || '-',
    diagnostico?.identificacao?.fornecedor || '-',
    formatNumber(r.quantidade_pendente, 0),
    formatNumber(r.estoque, 0),
    formatNumber(toPositiveFromNegative(r.consumo_ultimo_mes), 2),
    formatNumber(toPositiveFromNegative(r.media_consumo_mensal), 2),
    formatNumber(calcCoberturaFromMediaEstoque(r), 2),
    r.desfecho_indicador || r.cobertura_indicador || '-',
    r.risco_ruptura || '-',
  ]);

  const labelColor = [100, 116, 139];
  const valueColor = [15, 23, 42];
  const leftMargin = 8;
  const rightMargin = 8;
  let y = 10;

  // Logo no canto superior esquerdo (fallback silencioso se não carregar)
  try {
    const logo = await loadImageDataUrl('/hubrasil-2.png');
    const maxW = 45;
    const logoW = maxW;
    const logoH = (logo.height / logo.width) * logoW;
    const logoX = leftMargin;
    const logoY = 6;
    doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH);
    y = Math.max(y, logoY + logoH + 4);
  } catch {
    // Não bloqueia a exportação se a logo falhar.
  }

  const setLabel = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...labelColor);
  };

  const setValue = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...valueColor);
  };

  const writePair = (x, label, value, maxWidth = 62) => {
    setLabel();
    doc.text(String(label), x, y);
    setValue();
    const safeValue = value === null || value === undefined || value === '' ? '-' : String(value);
    const lines = doc.splitTextToSize(safeValue, maxWidth);
    doc.text(lines, x, y + 4.2);
    return 4.2 + (lines.length * 3.8);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...valueColor);
  doc.text('Diagnóstico de Estoque e Consumo (Situacional)', leftMargin, y);
  y += 8;

  // Linha 1
  const col1 = leftMargin;
  const col2 = 78;
  const col3 = 148;
  const col4 = 218;

  const h1 = Math.max(
    writePair(leftMargin, 'Fornecedor/CNPJ', `${diagnostico?.identificacao?.fornecedor || '-'} / ${diagnostico?.identificacao?.cnpj || '-'}`),
    writePair(col2, 'Número do empenho', diagnostico?.identificacao?.numero_empenho || '-'),
    writePair(col3, 'Responsável controle', diagnostico?.identificacao?.responsavel_controle || '-'),
    writePair(col4, 'Risco de ruptura', diagnostico?.resumo?.risco_ruptura || '-'),
  );
  y += h1 + 2;

  // Linha 2
  const h2 = Math.max(
    writePair(col1, 'Valor pendente total', formatCurrencyBR(diagnostico?.resumo?.valor_pendente_total)),
    writePair(col2, 'Qtd pendente total', formatNumber(diagnostico?.resumo?.quantidade_pendente_total, 0)),
    writePair(col3, 'Percentual entregue (empenho)', formatPercent(diagnostico?.resumo?.percentual_entregue_empenho, 2)),
    writePair(col4, 'Cobertura média (meses)', formatNumber(diagnostico?.resumo?.cobertura_media_estoque_meses, 2)),
  );
  y += h2 + 2;

  // Linha 3
  const h3 = Math.max(
    writePair(col1, 'Processo de irregularidade', diagnostico?.compliance_riscos?.processo_irregularidade ? 'Sim' : 'Nao'),
    writePair(col2, 'Troca de marca', diagnostico?.compliance_riscos?.troca_marca ? 'Sim' : 'Nao'),
    writePair(col3, 'Reequilíbrio financeiro', diagnostico?.compliance_riscos?.reequilibrio_financeiro ? 'Sim' : 'Nao'),
    writePair(col4, 'Notificação código', (diagnostico?.compliance_riscos?.notificacao_codigo || []).join(', ') || '-'),
  );
  y += h3 + 2;

  // Linha 4
  const h4 = Math.max(
    writePair(col1, 'Data confirmação e-mail', formatDateBR(diagnostico?.timeline_logistica?.data_confirmacao_recebimento_email) || '-'),
    writePair(col2, 'Prazo entrega (dias)', formatNumber(diagnostico?.timeline_logistica?.prazo_entrega_dias, 0)),
    writePair(col3, 'Previsão de entrega', formatDateBR(diagnostico?.timeline_logistica?.previsao_entrega) || '-'),
    writePair(col4, 'Tempo de atraso (dias)', formatNumber(diagnostico?.timeline_logistica?.tempo_atraso_dias, 0)),
  );
  y += h4 + 2;

  // Linha 5 - observação consolidada (linha dedicada)
  setLabel();
  doc.text('Observação', leftMargin, y);
  setValue();
  const observacaoConsolidada =
    diagnostico?.observacao
    || diagnostico?.timeline_logistica?.observacao
    || diagnostico?.compliance_riscos?.observacao
    || diagnostico?.resumo?.observacao
    || diagnostico?.identificacao?.observacao
    || '-';
  const observacaoLines = doc.splitTextToSize(String(observacaoConsolidada), 260);
  doc.text(observacaoLines, leftMargin, y + 4.2);
  y += 4.2 + (observacaoLines.length * 3.8) + 2;

  // Linha 6
  setLabel();
  doc.text('Ação sugerida', leftMargin, y);
  setValue();
  const recomendacao = diagnostico?.recomendacoes?.acao_sugerida || '-';
  const recomendacaoLines = doc.splitTextToSize(String(recomendacao), 270);
  doc.text(recomendacaoLines, leftMargin, y + 4.2);
  y += 4.2 + (recomendacaoLines.length * 3.8) + 3;

  autoTable(doc, {
    head,
    body,
    styles: { fontSize: 6, overflow: 'linebreak', cellPadding: 1.1, valign: 'top' },
    headStyles: { fillColor: [20, 93, 80], textColor: 255, fontStyle: 'bold' },
    margin: { top: Math.max(12, y), right: rightMargin, bottom: 12, left: leftMargin },
    tableWidth: doc.internal.pageSize.getWidth() - leftMargin - rightMargin,
    columnStyles: {
      0: { cellWidth: 16 }, // Empenho
      1: { cellWidth: 8 },  // Item
      2: { cellWidth: 66 }, // Material
      3: { cellWidth: 32 }, // Fornecedor
      4: { cellWidth: 12 }, // Pendente
      5: { cellWidth: 10 }, // Estoque
      6: { cellWidth: 12 }, // Consumo último mês
      7: { cellWidth: 10 }, // Média 6m
      8: { cellWidth: 12 }, // Cobertura
      9: { cellWidth: 26 }, // Indicador
      10: { cellWidth: 14 }, // Risco
    },
    showHead: 'everyPage',
    theme: 'grid',
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  doc.save(`relatorio-consolidado-${empenho || 'todos'}-${stamp}.pdf`);
}

export default function RelatorioPage() {
  const [empenho, setEmpenho] = useState('');
  const [diagnostico, setDiagnostico] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const columns = useMemo(
    () => [
      { key: 'item_pregao', header: 'Item' },
      { key: 'material', header: 'Material', render: (r) => r.material || r.cd_material || '-' },
      { key: 'estoque', header: 'Estoque', render: (r) => formatNumber(r.estoque, 0) },
      { key: 'quantidade_pendente', header: 'Qtd pendente', render: (r) => formatNumber(r.quantidade_pendente, 0) },
      { key: 'valor_pendente', header: 'Valor pendente', render: (r) => formatCurrencyBR(r.valor_pendente) },
      { key: 'consumo_ultimo_mes', header: 'Consumo último mês', render: (r) => formatNumber(toPositiveFromNegative(r.consumo_ultimo_mes), 2) },
      { key: 'media_consumo_mensal', header: 'Média mensal', render: (r) => formatNumber(toPositiveFromNegative(r.media_consumo_mensal), 2) },
      { key: 'cobertura_estoque_meses', header: 'Cobertura (meses)', render: (r) => formatNumber(calcCoberturaFromMediaEstoque(r), 2) },
      {/*{ key: 'cobertura_indicador', header: 'Indicador' },*/},      
      { key: 'risco_ruptura', header: 'Risco de ruptura' },
    ],
    [],
  );

  async function handleBuscar() {
    if (!empenho.trim()) {
      setErrorMsg('Informe um empenho para consultar o relatório.');
      setDiagnostico(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getRelatorioDiagnostico({ empenho: empenho.trim() });
      const mappedItems = (data.itens || []).map((r, idx) => ({
        id: `${empenho}-${r.item_pregao || idx}-${r.cd_material || 'm'}`,
        ...r,
      }));
      setDiagnostico({ ...data, itens: mappedItems });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar relatório diagnóstico';
      setErrorMsg(msg);
      setDiagnostico(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!empenho.trim()) {
      setErrorMsg('Informe um empenho para exportar.');
      return;
    }

    setExporting(true);
    setErrorMsg(null);
    try {
      const data = diagnostico || (await getRelatorioDiagnostico({ empenho: empenho.trim() }));
      if (!data?.itens?.length) {
        setErrorMsg('Não há dados para exportar com o filtro atual.');
        return;
      }
      await exportRelatorioPdf(data, empenho.trim());
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao exportar PDF';
      setErrorMsg(msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Relatório</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            label="Empenho"
            value={empenho}
            onChange={(v) => setEmpenho(v)}
            placeholder="Ex.: 2024NE000123"
          />
          <div className="md:col-span-3 flex items-end gap-3">
            <Button
              type="button"
              onClick={() => {
                handleBuscar();
              }}
              disabled={loading}
            >
              Aplicar
            </Button>
            <Button type="button" variant="secondary" onClick={handleExportPdf} disabled={loading || exporting}>
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div> : null}

      {diagnostico ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold">Diagnóstico de Estoque e Consumo (Situacional)</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div><span className="text-xs text-slate-500">Fornecedor</span><div className="font-medium">{diagnostico.identificacao?.fornecedor || '-'}</div></div>
            <div><span className="text-xs text-slate-500">CNPJ</span><div className="font-medium">{diagnostico.identificacao?.cnpj || '-'}</div></div>
            <div><span className="text-xs text-slate-500">Número do empenho</span><div className="font-medium">{diagnostico.identificacao?.numero_empenho || '-'}</div></div>
            <div><span className="text-xs text-slate-500">Responsável controle</span><div className="font-medium">{diagnostico.identificacao?.responsavel_controle || '-'}</div></div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div><span className="text-xs text-slate-500">Valor pendente total</span><div className="font-medium">{formatCurrencyBR(diagnostico.resumo?.valor_pendente_total)}</div></div>
            <div><span className="text-xs text-slate-500">Qtd pendente total</span><div className="font-medium">{formatNumber(diagnostico.resumo?.quantidade_pendente_total, 0)}</div></div>
            <div>
              <span className="text-xs text-slate-500">Percentual entregue (empenho)</span>
              <div className="font-medium">
                {diagnostico.resumo?.percentual_entregue_empenho == null
                  ? '-'
                  : `${formatNumber(diagnostico.resumo.percentual_entregue_empenho, 2)}%`}
              </div>
            </div>
            <div><span className="text-xs text-slate-500">Risco de ruptura</span><div className="font-medium">{diagnostico.resumo?.risco_ruptura || '-'}</div></div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div><span className="text-xs text-slate-500">Processo de irregularidade</span><div className="font-medium">{diagnostico.compliance_riscos?.processo_irregularidade ? 'Sim' : 'Não'}</div></div>
            <div><span className="text-xs text-slate-500">Troca de marca</span><div className="font-medium">{diagnostico.compliance_riscos?.troca_marca ? 'Sim' : 'Não'}</div></div>
            <div><span className="text-xs text-slate-500">Reequilíbrio financeiro</span><div className="font-medium">{diagnostico.compliance_riscos?.reequilibrio_financeiro ? 'Sim' : 'Não'}</div></div>
            <div><span className="text-xs text-slate-500">Notificação código</span><div className="font-medium">{diagnostico.compliance_riscos?.notificacao_codigo.join(', ') || '-'}</div></div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div><span className="text-xs text-slate-500">Data confirmação e-mail</span><div className="font-medium">{formatDateBR(diagnostico.timeline_logistica?.data_confirmacao_recebimento_email || '-')}</div></div>
            <div><span className="text-xs text-slate-500">Prazo entrega (dias)</span><div className="font-medium">{formatNumber(diagnostico.timeline_logistica?.prazo_entrega_dias, 0)}</div></div>
            <div><span className="text-xs text-slate-500">Previsão de entrega</span><div className="font-medium">{formatDateBR(diagnostico.timeline_logistica?.previsao_entrega || '-')}</div></div>
            <div><span className="text-xs text-slate-500">Tempo de atraso (dias)</span><div className="font-medium">{formatNumber(diagnostico.timeline_logistica?.tempo_atraso_dias, 0)}</div></div>
            
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><span className="text-xs text-slate-500">Ação sugerida</span><div className="font-medium">{diagnostico.recomendacoes?.acao_sugerida || '-'}</div></div>
            <div><span className="text-xs text-slate-500">Observação</span>
            <div className="font-medium">
              {diagnostico.observacao 
              || diagnostico.timeline_logistica?.observacao 
              || diagnostico.compliance_riscos?.observacao 
              || diagnostico.resumo?.observacao 
              || diagnostico.identificacao?.observacao 
              || '-'}</div></div>
          </div> 
        </div>
      ) : null}

      <Table
        columns={columns}
        rows={diagnostico?.itens || []}
        page={1}
        pageSize={diagnostico?.itens?.length || 10}
        total={diagnostico?.itens?.length || 0}
        showPagination={false}
      />
    </div>
  );
}

