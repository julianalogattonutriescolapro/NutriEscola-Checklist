# NutriEscola Checklist

Sistema de gestão de visitas técnicas do PNAE (Programa Nacional de Alimentação Escolar):
checklist digital, fotos, cardápio mensal, relatórios com IA, dashboard e aprovação de acesso.
Conectado a um banco de dados real (Supabase — Postgres + Auth + Storage + Realtime).

## Rodando localmente

Pré-requisitos: [Node.js](https://nodejs.org) 18 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

## Build para produção

```bash
npm run build
```

Gera a pasta `dist/` — é isso que você publica no Netlify, Vercel, ou qualquer hospedagem estática.

```bash
npm run preview   # testa o build de produção localmente antes de publicar
```

## Publicando (Netlify / Vercel)

- **Netlify**: conecte o repositório, ou arraste a pasta `dist/` (depois de `npm run build`) em
  [app.netlify.com/drop](https://app.netlify.com/drop). Build command: `npm run build`. Publish directory: `dist`.
- **Vercel**: `vercel` na raiz do projeto, ou conecte o repositório pelo painel. Framework preset: Vite.

## Banco de dados (Supabase)

Todas as migrações SQL estão em `supabase/migrations/`, numeradas e **na ordem que devem ser
executadas** no SQL Editor do seu projeto Supabase (Project → SQL Editor → New query):

1. `001_initial_schema.sql` — tabelas, relacionamentos, políticas iniciais, bucket de fotos.
2. `002_add_nutritionist_name.sql` — coluna auxiliar em `visits`.
3. `003_secure_profile_updates.sql` — impede auto-promoção a administrador.
4. `004_access_control.sql` — status de aprovação (pendente/aprovado/desativado), 2 perfis, RLS restrita, Realtime.
5. `005_fix_rls_recursion.sql` — **correção crítica**: elimina recursão infinita nas políticas de segurança que causava falhas de comunicação com o banco.

Se seu projeto Supabase já rodou as migrações 001–004 anteriormente, falta apenas rodar a 005.

A conexão (Project URL + chave anon/public) já está configurada em `src/lib/supabaseClient.js`.
Essas são chaves públicas — seguras para ficarem no código do navegador; a segurança de verdade
vem das políticas RLS no banco. **Nunca** coloque a `service_role key` neste projeto.

### Administradora principal

O e-mail `julianalogatto@gmail.com` é reconhecido automaticamente como administradora (aprovada,
sem precisar de nenhuma aprovação manual) assim que essa pessoa criar a própria conta pela tela
"Criar conta" do app. Qualquer outro e-mail nasce como nutricionista, aguardando aprovação.

## Estrutura do projeto

```
index.html              ponto de entrada HTML
src/
  main.js                bootstrap do app (testa conexão, checa sessão, primeira renderização)
  style.css               todo o CSS
  router.js               navegação entre telas e montagem do layout (sidebar/topbar)
  state.js                estado global em memória (cache de dados + estado de navegação)
  lib/
    supabaseClient.js      conexão com o Supabase + teste de conectividade + upload de fotos
    ai.js                  chamadas à API da Claude (resumos técnicos, assistente)
    constants.js            checklist padrão, listas fixas, menu de navegação
    utils.js                funções utilitárias (datas, escape de HTML, compressão de imagem)
  services/
    dataService.js          carrega/mapeia os dados do Supabase para o cache local
  pages/
    auth.js                 login, cadastro, aprovação pendente/desativado
    dashboard.js             indicadores e gráficos
    schools.js                cadastro e ficha de escolas
    menus.js                   cardápio mensal
    visit.js                    nova visita / checklist / fotos / assinaturas
    reports.js                   histórico, lista de relatórios, relatório detalhado (PDF)
    photos.js                     galeria de fotos e comparação entre visitas
    pendencies.js                  plano de ação / pendências
    indicators.js                   gráficos comparativos entre escolas
    assistant.js                     assistente de IA (perguntas em linguagem natural)
    admin.js                          aprovação de usuários, configurações, backup
    search.js                          busca global
supabase/
  migrations/              todo o SQL do banco, em ordem
```

## Gerando os apps Android / iPhone / Tablet

Este projeto é uma aplicação web (HTML/CSS/JS) e pode ser empacotado como app nativo com o
[Capacitor](https://capacitorjs.com/), sem reescrever nada:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "NutriEscola Checklist" "br.com.nutriescola.checklist"
npm run build
npx cap add android
npx cap add ios
npx cap open android   # abre no Android Studio
npx cap open ios       # abre no Xcode (precisa de um Mac)
```

Isso é um passo separado, feito quando vocês estiverem prontos para publicar nas lojas — o app
web funciona perfeitamente em navegador de celular/tablet antes disso também.

## Checklist rápido de verificação

Depois de `npm install && npm run dev`, confirme nesta ordem:

1. A tela de login abre (sem tela branca).
2. Crie uma conta de teste → deve aparecer "aguardando aprovação".
3. Rode a migração `005` (se ainda não rodou) e promova sua conta de administradora, se for a primeira:
   ```sql
   update public.profiles set role='admin', status='aprovado'
   where id = (select id from auth.users where email = 'seu-email@aqui.com');
   ```
4. Logue como administradora → Dashboard deve carregar.
5. Cadastre uma escola, um cardápio, e finalize uma visita de teste.
6. Confira se o relatório abre e se "Solicitações de acesso" mostra o usuário de teste do passo 2.
