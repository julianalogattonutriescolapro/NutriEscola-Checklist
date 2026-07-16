export const CHECKLIST_TEMPLATE = [
  { section: 'Estrutura Física e Instalações', items: [
    'Piso, paredes e teto em bom estado de conservação',
    'Ventilação e iluminação adequadas',
    'Instalações elétricas e hidráulicas em condições seguras',
    'Área de preparo separada da área de armazenamento',
    'Presença de telas em janelas e portas',
    'Pia exclusiva para higienização das mãos, com sabonete e papel toalha',
  ]},
  { section: 'Manipuladores de Alimentos', items: [
    'Uso de uniforme completo e limpo',
    'Uso de touca de cabelo',
    'Unhas curtas, sem esmalte e sem adornos',
    'Higienização correta e frequente das mãos',
    'Ausência de sintomas de doenças infectocontagiosas',
    'Comprovante de exames periódicos em dia',
  ]},
  { section: 'Armazenamento de Alimentos', items: [
    'Organização do estoque seco (sistema PVPS)',
    'Temperatura adequada da geladeira',
    'Temperatura adequada do freezer',
    'Alimentos identificados e datados',
    'Ausência de produtos vencidos',
    'Ausência de sinais de pragas ou vetores',
  ]},
  { section: 'Preparo dos Alimentos', items: [
    'Higienização adequada de hortifrutigranjeiros',
    'Temperatura de cocção adequada',
    'Ausência de contaminação cruzada',
    'Utensílios em bom estado de higiene',
    'Óleo de fritura em condições adequadas',
  ]},
  { section: 'Distribuição das Refeições', items: [
    'Temperatura de distribuição adequada (quente/frio)',
    'Tempo de espera dentro do padrão',
    'Utensílios de distribuição higienizados',
    'Porcionamento adequado',
  ]},
  { section: 'Execução do Cardápio', items: [
    'Cardápio afixado em local visível',
    'Cardápio do dia confere com o planejado',
    'Substituições registradas corretamente',
    'Boa aceitação dos alunos observada',
  ]},
  { section: 'Higiene Geral e Resíduos', items: [
    'Limpeza geral da cozinha',
    'Destinação correta do lixo',
    'Disponibilidade de EPIs de limpeza',
    'Sanitários em condições de higiene',
  ]},
];

export const ORIENTACOES_OPCOES = ['Orientação Verbal', 'Orientação Escrita', 'Necessita Retorno', 'Comunicado à Direção', 'Treinamento Necessário'];
export const MOTIVOS_ALTERACAO = ['Falta de alimento', 'Problema no abastecimento', 'Substituição autorizada', 'Substituição não autorizada', 'Problema operacional', 'Outro'];
export const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const REFEICOES = [
  ['breakfast', '☕ Café da manhã'],
  ['morningSnack', '🥪 Lanche da manhã'],
  ['lunch', '🍛 Almoço'],
  ['afternoonSnack', '🍎 Lanche da tarde'],
  ['dinner', '🍲 Jantar'],
];
export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', ic: '🏠', roles: ['admin'] },
  { id: 'escolas', label: 'Escolas', ic: '🏫', roles: ['admin'] },
  { id: 'novaVisita', label: 'Nova Visita', ic: '📋', roles: ['admin', 'nutricionista'] },
  { id: 'minhasVisitas', label: 'Minhas Visitas', ic: '📖', roles: ['nutricionista'] },
  { id: 'historico', label: 'Histórico', ic: '📖', roles: ['admin'] },
  { id: 'relatorios', label: 'Relatórios', ic: '📄', roles: ['admin'] },
  { id: 'fotografias', label: 'Fotografias', ic: '📷', roles: ['admin'] },
  { id: 'cardapios', label: 'Cardápios', ic: '🍽', roles: ['admin'] },
  { id: 'pendencias', label: 'Pendências', ic: '⚠️', roles: ['admin'] },
  { id: 'indicadores', label: 'Indicadores', ic: '📊', roles: ['admin'] },
  { id: 'assistenteIA', label: 'Assistente IA', ic: '🤖', roles: ['admin'] },
  { id: 'admin', label: 'Administração', ic: '⚙️', roles: ['admin'] },
];