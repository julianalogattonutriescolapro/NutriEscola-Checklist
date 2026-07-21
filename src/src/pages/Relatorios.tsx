import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { useEntity } from '../lib/useEntity'
import { LogoMarca } from '../components/Decoracoes'
import { formatMoeda, formatData, formatMesAno, NOMES_MESES } from '../lib/format'
import type { Receita, Despesa } from '../types/database'

const CORES = ['#A8C3A0', '#C9A66B', '#E8B4B8', '#8B9574', '#B79FD6', '#7BAFC4', '#D4A5A5']

export default function Relatorios() {
  const { user } = useAuth()
  const { rows: receitas } = useEntity<Receita>('receitas', { select: '*, categorias(nome,cor)' })
  const { rows: despesas } = useEntity<Despesa>('despesas', { select: '*, categorias(nome,cor)' })

  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7))

  const receitasDoMes = receitas.filter((r) => r.data?.slice(0, 7) === mesSelecionado)
  const despesasDoMes = despesas.filter((d) => d.data?.slice(0, 7) === mesSelecionado)
  const totalReceitas = receitasDoMes.reduce((a, r) => a + Number(r.valor), 0)
  const totalDespesas = despesasDoMes.reduce((a, d) => a + Number(d.valor), 0)

  const pizzaDespesas = useMemo(() => {
    const porCategoria: Record<string, number> = {}
    despesasDoMes.forEach((d) => {
      const nome = d.categorias?.nome || 'Sem categoria'
      porCategoria[nome] = (porCategoria[nome] || 0) + Number(d.valor)
    })
    return Object.entries(porCategoria).map(([nome, valor], i) => ({ nome, valor, cor: CORES[i % CORES.length] }))
  }, [despesasDoMes])

  const comparacaoAnual = useMemo(() => {
    const ano = mesSelecionado.slice(0, 4)
    return NOMES_MESES.map((nome, i) => {
      const chave = `${ano}-${String(i + 1).padStart(2, '0')}`
      const r = receitas.filter((x) => x.data?.slice(0, 7) === chave).reduce((a, x) => a + Number(x.valor), 0)
      const d = despesas.filter((x) => x.data?.slice(0, 7) === chave).reduce((a, x) => a + Number(x.valor), 0)
      return { mes: nome.slice(0, 3), Receitas: r, Despesas: d }
    })
  }, [receitas, despesas, mesSelecionado])

  function exportarPDF() {
    const doc = new jsPDF()
    const [ano, mes] = mesSelecionado.split('-')
    const tituloMes = `${NOMES_MESES[Number(mes) - 1]} de ${ano}`

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(139, 149, 116)
    doc.text('Logatto Flow Finance', 14, 20)
    doc.setFontSize(11)
    doc.setTextColor(90, 90, 82)
    doc.text(`Relatório financeiro — ${tituloMes}`, 14, 28)

    doc.setDrawColor(233, 226, 211)
    doc.line(14, 32, 196, 32)

    doc.setFontSize(11)
    doc.setTextColor(58, 58, 52)
    doc.text(`Total de receitas: ${formatMoeda(totalReceitas)}`, 14, 42)
    doc.text(`Total de despesas: ${formatMoeda(totalDespesas)}`, 14, 49)
    doc.text(`Resultado do mês: ${formatMoeda(totalReceitas - totalDespesas)}`, 14, 56)

    autoTable(doc, {
      startY: 64,
      head: [['Receitas', 'Categoria', 'Data', 'Status', 'Valor']],
      body: receitasDoMes.map((r) => [r.descricao, r.categorias?.nome || '—', formatData(r.data), r.status, formatMoeda(r.valor)]),
      headStyles: { fillColor: [168, 195, 160] },
      styles: { fontSize: 9 }
    })

    const yDespesas = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: yDespesas,
      head: [['Despesas', 'Categoria', 'Vencimento', 'Situação', 'Valor']],
      body: despesasDoMes.map((d) => [d.descricao, d.categorias?.nome || '—', formatData(d.data_vencimento), d.situacao, formatMoeda(d.valor)]),
      headStyles: { fillColor: [232, 180, 184] },
      styles: { fontSize: 9 }
    })

    const paginas = doc.getNumberOfPages()
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 140)
      doc.text('Criado por Juliana Logato Consultoria e Assessoria', 14, 290)
    }

    doc.save(`relatorio-${mesSelecionado}.pdf`)
  }

  if (!user) return null

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p>Visão consolidada por categoria, comparação mensal e exportação em PDF.</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <input type="month" className="input-mes" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} />
          <button className="btn btn-primary" onClick={exportarPDF}>⬇ Exportar PDF</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="label">Receitas — {formatMesAno(mesSelecionado)}</div><div className="value mono positive">{formatMoeda(totalReceitas)}</div></div>
        <div className="stat-card"><div className="label">Despesas — {formatMesAno(mesSelecionado)}</div><div className="value mono negative">{formatMoeda(totalDespesas)}</div></div>
        <div className="stat-card"><div className="label">Resultado</div><div className={`value mono ${totalReceitas - totalDespesas >= 0 ? 'positive' : 'negative'}`}>{formatMoeda(totalReceitas - totalDespesas)}</div></div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Despesas por categoria</h3>
          {pizzaDespesas.length === 0 ? <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhuma despesa neste mês.</p> : (
            <div className="grafico-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <Pie data={pizzaDespesas} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={78} paddingAngle={2}>
                    {pizzaDespesas.map((e, i) => <Cell key={i} fill={e.cor} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E2D3', borderRadius: 10, fontSize: 13 }} formatter={(v: number) => formatMoeda(v)} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#5B6555' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Comparação anual — {mesSelecionado.slice(0, 4)}</h3>
          <div className="grafico-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparacaoAnual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#E9E2D3" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" stroke="#5B6555" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#5B6555" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E2D3', borderRadius: 10, fontSize: 13 }} formatter={(v: number) => formatMoeda(v)} />
                <Bar dataKey="Receitas" fill="#A8C3A0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Despesas" fill="#E8B4B8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card rodape-info-pdf">
        <LogoMarca tamanho={22} tituloTamanho={13} />
        <p>O PDF exportado inclui logo, resumo do período e as tabelas completas de receitas e despesas.</p>
      </div>
    </>
  )
}
