// ---------------------------------------------------------------
// Integração com a API da Anthropic (Claude) para gerar resumos
// técnicos, conclusões, planos de ação e o assistente de perguntas.
// ---------------------------------------------------------------

export async function callClaude(prompt, systemPrompt) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt || '',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    return (data.content || []).map((b) => b.text || '').join('\n').trim();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function generateVisitAISummary(visit, school, prevVisit) {
  const ncItems = (visit.checklist || []).filter((it) => it.status === 'nc');
  const okCount = (visit.checklist || []).filter((it) => it.status === 'ok').length;
  const naCount = (visit.checklist || []).filter((it) => it.status === 'na').length;
  const dataResumo = {
    escola: school.name,
    data: visit.date,
    conformes: okCount,
    naoConformes: ncItems.length,
    naoSeAplica: naCount,
    naoConformidades: ncItems.map((it) => ({ item: it.text, secao: it.section, obs: it.obs || '' })),
    cardapioPrevisto: visit.plannedMenu || '',
    preparacaoRealizada: visit.executedMenu || '',
    visitaAnterior: prevVisit
      ? { data: prevVisit.date, naoConformes: (prevVisit.checklist || []).filter((i) => i.status === 'nc').length }
      : null,
  };
  const sys = `Você é uma assistente técnica de nutrição especializada em alimentação escolar (PNAE) no Brasil. Escreva em português, com linguagem técnica, clara e objetiva. NUNCA invente informações que não estejam nos dados fornecidos. Se faltar dado, diga que não há informação suficiente. Responda ESTRITAMENTE em JSON válido, sem markdown, sem texto fora do JSON, no formato: {"resumoTecnico": "...", "conclusao": "...", "situacaoEscola": "Adequada|Parcialmente Adequada|Inadequada", "principaisNaoConformidades": ["..."], "principaisMelhorias": ["..."], "recomendacoes": ["..."], "prioridadeRetorno": "Baixa|Média|Alta|Urgente", "planoAcao": [{"problema":"...","recomendacao":"...","prazo":"..."}]}`;
  const prompt = `Dados da visita técnica:\n${JSON.stringify(dataResumo, null, 2)}\n\nGere a análise conforme o formato solicitado.`;
  const raw = await callClaude(prompt, sys);
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('AI parse error', e, raw);
    return null;
  }
}

export async function generateDashboardInsight(finishedVisits, todayISO) {
  const thisMonth = finishedVisits.filter((v) => v.date && v.date.slice(0, 7) === todayISO.slice(0, 7));
  const ncBySection = {};
  thisMonth.forEach((v) =>
    (v.checklist || []).filter((i) => i.status === 'nc').forEach((i) => {
      ncBySection[i.section] = (ncBySection[i.section] || 0) + 1;
    })
  );
  const data = {
    visitasNoMes: thisMonth.length,
    naoConformidadesNoMes: thisMonth.reduce((n, v) => n + (v.checklist || []).filter((i) => i.status === 'nc').length, 0),
    principaisSecoesComNC: Object.entries(ncBySection).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]),
  };
  const sys =
    'Você é assistente técnica de nutrição para gestão de alimentação escolar (PNAE). Escreva um parágrafo curto (3-5 frases) em português, tom executivo, baseado SOMENTE nos dados fornecidos. Não invente números. Responda em texto simples, sem markdown.';
  const prompt = `Dados do mês:\n${JSON.stringify(data, null, 2)}\n\nEscreva um resumo executivo.`;
  return await callClaude(prompt, sys);
}
