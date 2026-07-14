import { Chart, registerables } from 'chart.js';
import { DB, registerChart } from '../state.js';
import { esc, todayISO } from '../lib/utils.js';
import { MESES } from '../lib/constants.js';
import { schoolStats, classify, computeClassificationFromChecklist, schoolById } from '../services/dataService.js';
import { generateDashboardInsight } from '../lib/ai.js';
import { nav } from '../router.js';

Chart.register(...registerables);

function statCard(label, num, ic) {
  return `<div class="card stat"><div style="display:flex;align-items:center;justify-content:space-between;"><span class="stat-label">${label}</span><span>${ic}</span></div><span class="stat-num">${num}</span></div>`;
}
function lastNMonths(n) {
  const arr = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push({ key: dd.toISOString().slice(0, 7), label: MESES[dd.getMonth()].slice(0, 3) + '/' + String(dd.getFullYear()).slice(2) });
  }
  return arr;
}

export async function viewDashboard(root) {
  const finished = DB.visits.filter((v) => v.status === 'finalizada');
  const thisMonth = finished.filter((v) => v.date.slice(0, 7) === todayISO().slice(0, 7));
  const totalNC = finished.reduce((n, v) => n + (v.checklist || []).filter((i) => i.status === 'nc').length, 0);
  const openPend = DB.actionPlans.filter((a) => a.status !== 'Concluído').length;
  const resolvedPend = DB.actionPlans.filter((a) => a.status === 'Concluído').length;
  const totalPhotos = finished.reduce((n, v) => n + (v.checklist || []).reduce((m, i) => m + (i.photos ? i.photos.length : 0), 0), 0);

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const alerts = [];
  DB.schools.forEach((s) => {
    const st = schoolStats(s.id);
    if (!st.last || new Date(st.last.date) < cutoff) alerts.push(`🏫 ${s.name} — sem visita há mais de 30 dias`);
    if (st.pctConform !== null && st.pctConform < 70) alerts.push(`🔴 ${s.name} — classificação Inadequada`);
  });
  DB.actionPlans.filter((a) => a.status !== 'Concluído' && a.deadline && a.deadline < todayISO()).forEach((a) => {
    const s = schoolById(a.schoolId);
    alerts.push(`⏰ Plano de ação vencido — ${s ? s.name : '—'}: ${a.problem}`);
  });

  const lastVisits = finished.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  root.innerHTML = `
    <div class="grid g4" style="margin-bottom:20px;">
      ${statCard('Escolas cadastradas', DB.schools.length, '🏫')}
      ${statCard('Visitas realizadas', finished.length, '📋')}
      ${statCard('Visitas no mês', thisMonth.length, '📅')}
      ${statCard('Relatórios emitidos', finished.length, '📄')}
      ${statCard('Fotografias', totalPhotos, '📷')}
      ${statCard('Não conformidades', totalNC, '❗')}
      ${statCard('Pendências abertas', openPend, '⚠️')}
      ${statCard('Pendências resolvidas', resolvedPend, '✅')}
    </div>
    <div class="grid g2" style="margin-bottom:20px;">
      <div class="card"><h3 style="font-size:14px;margin-bottom:10px;">Visitas realizadas por mês</h3><canvas id="chartVisitsMonth" height="180"></canvas></div>
      <div class="card"><h3 style="font-size:14px;margin-bottom:10px;">Pendências: abertas × resolvidas</h3><canvas id="chartPendings" height="180"></canvas></div>
    </div>
    <div class="grid g2" style="margin-bottom:20px;">
      <div class="card"><h3 style="font-size:14px;margin-bottom:10px;">Principais não conformidades (por seção)</h3><canvas id="chartNCSection" height="200"></canvas></div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:6px;">🤖 Resumo Inteligente</h3>
        <p class="small muted" id="aiDashboardText">Clique para gerar o resumo executivo do mês com IA.</p>
        <button class="btn btn-secondary btn-sm" id="btnAiDashboard" style="margin-top:8px;">Gerar resumo com IA</button>
      </div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:10px;">⚠️ Alertas</h3>
        ${alerts.length ? `<div style="display:flex;flex-direction:column;gap:8px;">${alerts.slice(0, 8).map((a) => `<div class="small" style="padding:8px 10px;background:var(--gray-50);border-radius:8px;">${esc(a)}</div>`).join('')}</div>` : '<p class="muted small">Nenhum alerta no momento.</p>'}
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:10px;">Últimas visitas</h3>
        ${lastVisits.length ? `<table><thead><tr><th>Escola</th><th>Data</th><th>Situação</th></tr></thead><tbody>
          ${lastVisits.map((v) => { const s = schoolById(v.schoolId); const c = computeClassificationFromChecklist(v.checklist);
            return `<tr style="cursor:pointer" data-goto-report="${v.id}"><td>${esc(s ? s.name : '—')}</td><td>${v.date}</td><td><span class="pill ${c.cls}">${c.dot} ${c.label}</span></td></tr>`; }).join('')}
        </tbody></table>` : '<p class="muted small">Nenhuma visita registrada ainda.</p>'}
      </div>
    </div>`;
  root.querySelectorAll('[data-goto-report]').forEach((tr) => (tr.onclick = () => nav('relatorioDetalhe', { visitId: tr.dataset.gotoReport })));

  const monthLabels = lastNMonths(6);
  const monthCounts = monthLabels.map((m) => finished.filter((v) => v.date.slice(0, 7) === m.key).length);
  registerChart(new Chart(document.getElementById('chartVisitsMonth'), { type: 'bar', data: { labels: monthLabels.map((m) => m.label), datasets: [{ data: monthCounts, backgroundColor: '#4E9C64', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }));
  registerChart(new Chart(document.getElementById('chartPendings'), { type: 'doughnut', data: { labels: ['Abertas', 'Resolvidas'], datasets: [{ data: [openPend, resolvedPend], backgroundColor: ['#C4483B', '#4E9C64'] }] }, options: { plugins: { legend: { position: 'bottom' } } } }));
  const ncBySection = {};
  finished.forEach((v) => (v.checklist || []).filter((i) => i.status === 'nc').forEach((i) => (ncBySection[i.section] = (ncBySection[i.section] || 0) + 1)));
  const secLabels = Object.keys(ncBySection);
  registerChart(new Chart(document.getElementById('chartNCSection'), { type: 'bar', data: { labels: secLabels.length ? secLabels : ['Sem dados'], datasets: [{ data: secLabels.length ? secLabels.map((s) => ncBySection[s]) : [0], backgroundColor: '#B8863B', borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } }));

  document.getElementById('btnAiDashboard').onclick = async (e) => {
    e.target.disabled = true; e.target.innerHTML = '<span class="spinner"></span> Gerando...';
    const text = await generateDashboardInsight(finished, todayISO());
    document.getElementById('aiDashboardText').textContent = text || 'Não foi possível gerar o resumo agora (verifique a conexão) ou não há dados suficientes.';
    e.target.remove();
  };
}
