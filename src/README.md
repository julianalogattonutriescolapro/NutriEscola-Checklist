# Logatto Flow Finance

Assistente financeiro pessoal completo — elegante, inteligente, PWA e pronto
para virar app Android. Construído com **React + Vite + TypeScript**,
conectado ao **Supabase** existente do projeto Logatto Flow Finance.

## ✅ Status: aplicativo completo

Todos os módulos da especificação estão implementados e funcionais:

- **Autenticação** — login, cadastro, recuperação e redefinição de senha, perfil
- **Painel** — saldo disponível, receitas/despesas do mês, dinheiro restante,
  contas pagas/pendentes, próximos vencimentos, alertas, gráfico de categorias
  e gráfico de 6 meses (sem mostrar Reserva Financeira, como especificado)
- **Receitas** — com as 3 categorias iniciais (Salário 1, Salário 2, Receita
  Extra) criadas automaticamente a cada cadastro
- **Despesas** — descrição, categoria, valor, data, vencimento, observações,
  recorrência, situação (paga/pendente) e forma de pagamento (dinheiro,
  dinheiro físico, PIX, débito, crédito, transferência, outro) — quando
  "crédito", pede apenas nome do cartão e vencimento, sem módulo separado
- **Reserva Financeira** — Cofre, Cofre Online e locais personalizados, sem
  investimentos/ações/CDB/cripto, como pedido
- **Calendário Financeiro** — contas a vencer, vencidas, receitas previstas e recebidas
- **Alertas** — vencimentos (12h20 do dia anterior), saldo baixo, contas
  pendentes, resumo do mês
- **Relatórios** — resumo por categoria, comparação anual, exportação em PDF
  (com a logo) — sem Excel/CSV, como pedido
- **Pesquisa** — por descrição, categoria, valor, forma de pagamento, situação, mês, ano e período
- **Categorias** — criação livre de novas categorias
- **Identidade visual** — logo oficial no login, menu e relatórios; paleta
  delicada (branco, verde claro, verde-oliva, rosé, bege, dourado); folhas e
  flores discretas; cantos arredondados; animações suaves
- **Rodapé** — crédito discreto "Criado por Juliana Logato Consultoria e
  Assessoria" em todas as telas
- **Offline** — fila de sincronização local; ao voltar a conexão, tudo é
  reenviado automaticamente ao Supabase
- **PWA** — instalável, com ícones e cache offline configurados

## 🔐 Sistema de aprovação da administradora

Ninguém consegue usar o app sem sua autorização. Funciona assim:

- Toda conta nova nasce com `status_aprovacao = 'pendente'`.
- A pessoa consegue fazer login, mas só vê uma tela de **"Aguardando aprovação"** —
  nenhum dado (receitas, despesas, etc.) é acessível: isso é garantido pelo
  próprio banco de dados (RLS), não só pela interface, então não dá para burlar.
- Você (identificada pelo e-mail `julianalogatto@gmail.com`, definido em
  `supabase/schema.sql`) é promovida a **administradora automaticamente** no
  cadastro, com acesso liberado na hora.
- Ao entrar no app, você vê um aviso no Painel e um contador no menu lateral
  ("Aprovações") sempre que houver gente esperando.
- Na tela **Aprovações**, você aprova ou recusa cada pessoa com um clique. Dá
  pra revogar o acesso de alguém aprovado a qualquer momento.
- Um usuário comum **não consegue se auto-aprovar nem virar admin**, mesmo
  manipulando requisições — isso é bloqueado por um gatilho no banco de dados.

**Se você já tinha uma conta antes de rodar esta versão do schema**, rode uma
vez no SQL Editor (depois de rodar o `schema.sql` inteiro):
```sql
update public.usuarios set admin = true, status_aprovacao = 'aprovado' where email = 'julianalogatto@gmail.com';
```

**Para trocar o e-mail da administradora**, edite a linha
`eh_admin := (lower(new.email) = lower('julianalogatto@gmail.com'));`
dentro de `supabase/schema.sql` antes de rodar, ou rode o UPDATE acima com o
e-mail correto a qualquer momento.



**SQL Editor → New query** no seu projeto Logatto Flow Finance → cole
`supabase/schema.sql` → **Run**. Isso cria todas as tabelas, a view de
calendário, RLS e o gatilho que cria o perfil + as 3 categorias de receita
iniciais a cada novo cadastro.

## 2. Configurar autenticação

Em **Authentication → Providers → Email**, mantenha habilitado. Em
**Authentication → URL Configuration**, defina a Site URL do seu app.

## 3. Rodar localmente (web)

```bash
npm install
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Project Settings → API)
npm run dev
```

## 4. Gerar o projeto Android e abrir no Android Studio

Este app usa o **Capacitor** (padrão da indústria para "web app → app
Android real") para gerar um projeto Android de verdade — com Gradle,
`MainActivity`, `AndroidManifest.xml` etc. — a partir deste código.

```bash
# 1. Instale as dependências (inclui o Capacitor)
npm install

# 2. Gere o build de produção do app web
npm run build

# 3. Crie o projeto Android (gera a pasta android/)
npx cap add android

# 4. Copie o build para dentro do projeto Android
npx cap sync android

# 5. Abra no Android Studio
npx cap open android
```

A partir daí, o projeto abre normalmente no Android Studio, com Gradle Sync
automático. Para gerar o APK/AAB de publicação: **Build → Generate Signed
Bundle / APK** dentro do próprio Android Studio.

> Por que não gerei a pasta `android/` pronta? Ela é criada pelo comando
> `cap add android`, que baixa o template nativo do Capacitor pelo Gradle/Maven
> — isso requer acesso à internet, que meu ambiente de geração de código não
> tem. Os comandos acima levam ~2 minutos rodando no seu computador.

O ícone do app (`public/icon-192.png`, `icon-512.png`) já usa a sua logo e
será aplicado automaticamente ao projeto Android pelo `cap sync`.

## 5. Build para produção (web)

```bash
npm run build
```

Os arquivos finais ficam em `dist/`, prontos para hospedagem estática
(Vercel, Netlify, Cloudflare Pages) ou para o `cap sync` do passo 4.

## Estrutura do projeto

```
supabase/schema.sql          Schema completo (tabelas, view de calendário, RLS)
capacitor.config.ts          Configuração do app Android/iOS
src/lib/supabaseClient.ts    Cliente Supabase
src/lib/useEntity.ts         Hook genérico de CRUD (com fila offline)
src/lib/offlineQueue.ts      Sincronização automática ao voltar a internet
src/lib/inteligencia.ts      Cálculos financeiros (saldo, maior gasto, etc.)
src/lib/alertas.ts           Regras de geração de alertas inteligentes
src/context/AuthContext.tsx  Login, cadastro, recuperação de senha, sessão
src/pages/                   Uma página por módulo
src/components/              Layout, Sidebar, Footer, Modal, decorações (logo, folhas, flores)
src/styles/index.css         Design tokens e identidade visual da marca
```

## Próximos aprimoramentos possíveis

- Push notifications nativas para os alertas (via Capacitor + Firebase Cloud Messaging)
- Anexar comprovantes às despesas (Supabase Storage)
- Lançamento automático mensal das transações recorrentes (Supabase Edge Function agendada)
