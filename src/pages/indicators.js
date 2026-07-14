import { Chart, registerables } from 'chart.js';
import { DB, registerChart } from '../state.js';
import { schoolStats } from '../services/dataService.js';

Chart.register(...registerables);

export function viewIndicadores(root) {
  root.innerHTML = `<div class="grid g2">
    <div class="card"><h3 style="font-size:14px;margin-bottom:10px;">Top escolas — melhor desempenho</h3><canvas id="chTop" height="200"></canvas></div>
    <div class="card"><h3 style="font-size:14px;margin-bottom:10px;">Escolas com mais não conformidades</h3><canvas id="chWorst" height="200"></canvas></div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h3 style="font-size:14px;margin-bottom:10px;">Percentual geral de conformidade</h3>
    <canvas id="chOverall" height="90"></canvas>
  </div>`;
  const rows = DB.schools.map((s) => { const st = schoolStats(s.id); return { name: s.name, pct: st.pctConform, nc: st.ncCount }; });
  const withData = rows.filter((r) => r.pct !== null).sort((a, b) => b.pct - a.pct);
  const worst = rows.slice().sort((a, b) => b.nc - a.nc).slice(0, 8);
  registerChart(new Chart(document.getElementById('chTop'), { type: 'bar', data: { labels: withData.slice(0, 8).map((r) => r.name), datasets: [{ data: withData.slice(0, 8).map((r) => r.pct), backgroundColor: '#4E9C64', borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100 } } } }));
  registerChart(new Chart(document.getElementById('chWorst'), { type: 'bar', data: { labels: worst.map((r) => r.name), datasets: [{ data: worst.map((r) => r.nc), backgroundColor: '#C4483B', borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } }));
  const overallPct = withData.length ? Math.round(withData.reduce((n, r) => n + r.pct, 0) / withData.length) : 0;
  registerChart(new Chart(document.getElementById('chOverall'), { type: 'bar', data: { labels: ['Conformidade Geral'], datasets: [{ data: [overallPct], backgroundColor: '#4E9C64', borderRadius: 8 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100 } } } }));
}
