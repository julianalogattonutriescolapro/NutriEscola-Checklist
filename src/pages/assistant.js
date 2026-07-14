import { DB, toast } from '../state.js';
import { esc, todayISO } from '../lib/utils.js';
import { schoolStats, classify, schoolById } from '../services/dataService.js';
import { callClaude } from '../lib/ai.js';

export function viewAssistenteIA(root) {
  root.innerHTML = `
    <div class="card">
      <p class="muted small" style="margin-bottom:12px;">Faça perguntas em linguagem natural sobre as visitas, escolas e pendências registradas. A IA responde exclusivamente com base nos dados cadastrados no sistema.</p>
      <div class="tag-row" style="margin-bottom:12px;">
        ${['Quais escolas precisam de retorno?', 'Quais escolas estão inadequadas?', 'Quais escolas possuem pendências vencidas?', 'Quais foram as principais não conformidades deste mês?'].map((q) => `<button class="btn btn-secondary btn-sm" data-q="${esc(q)}">${q}</button>`).join('')}
      </div>
      <div class="field"><textarea class="input" id="iaQuestion" placeholder="Digite sua pergunta..."></textarea></div>
      <button class="btn btn-primary btn-sm" id="btnAskIA">Perguntar</button>
      <div class="divider"></div>
      <div id="iaAnswer" class="small" style="line-height:1.6;"></div>
    </div>`;
  root.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { document.getElementById('iaQuestion').value = b.dataset.q; ask(); }));
  document.getElementById('btnAskIA').onclick = ask;

  async function ask() {
    const q = document.getElementById('iaQuestion').value.trim();
    if (!q) { toast('Digite uma pergunta.', true); return; }
    const ans = document.getElementById('iaAnswer');
    ans.innerHTML = '<span class="spinner"></span> Consultando dados...';
    const dataset = {
      escolas: DB.schools.map((s) => { const st = schoolStats(s.id); return { nome: s.name, classificacao: classify(st.pctConform).label, pendencias: st.pendings, visitas: st.totalVisits, ultimaVisita: st.last ? st.last.date : null }; }),
      pendenciasVencidas: DB.actionPlans.filter((a) => a.status !== 'Concluído' && a.deadline && a.deadline < todayISO()).map((a) => ({ escola: schoolById(a.schoolId)?.name, problema: a.problem, prazo: a.deadline })),
      naoConformidadesMes: DB.visits.filter((v) => v.status === 'finalizada' && v.date.slice(0, 7) === todayISO().slice(0, 7)).flatMap((v) => (v.checklist || []).filter((i) => i.status === 'nc').map((i) => i.text)),
    };
    const sys = 'Você é assistente técnica de nutrição para um sistema de gestão de alimentação escolar (PNAE). Responda SOMENTE com base nos dados JSON fornecidos. Se não houver dados suficientes para responder, diga isso claramente. Responda em português, de forma objetiva, podendo usar listas curtas.';
    const prompt = `Dados do sistema:\n${JSON.stringify(dataset, null, 2)}\n\nPergunta do usuário: ${q}`;
    const text = await callClaude(prompt, sys);
    ans.innerHTML = text ? esc(text).replace(/\n/g, '<br>') : 'Não foi possível obter resposta agora. Verifique a conexão e tente novamente.';
  }
}
