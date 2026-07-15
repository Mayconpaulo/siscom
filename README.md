# SISCOM

Sistema Integrado da Seção de Comunicação Social. Sprint 0.1: fundação técnica, autenticação, dashboard, navegação responsiva e PWA.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + componentes no padrão shadcn/ui
- Supabase Auth com sessão em cookies SSR
- PWA instalável com manifesto e service worker

## Executar

```bash
npm install
copy .env.example .env.local
npm run dev
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`. No Supabase, crie um usuário em Authentication > Users. Sem essas variáveis, o dashboard fica disponível apenas para avaliação local da interface; o formulário informa que a integração precisa ser configurada.

## Rotas

- `/login`: autenticação institucional
- `/dashboard`: área protegida e visão operacional

## Critérios entregues — Sprint 0.1

- Estrutura escalável por domínio e App Router
- Login real por e-mail/senha via Supabase
- Sessão SSR e proteção de rota
- Menu lateral recolhível e navegação móvel
- Dashboard responsivo com indicadores e prioridades
- Identidade visual militar moderna e acessível
- PWA com cache básico e ícone maskable

## Próxima sprint sugerida

Modelagem do banco, perfis e RBAC (administrador, gestor e operador), cadastro de demandas e trilha de auditoria.

## Sprint 0.2 — acesso simplificado

O SISCOM possui somente dois níveis: `user` para todos os usuários operacionais, com os mesmos recursos, e `owner` para a conta proprietária. A primeira conta criada após a migration torna-se automaticamente proprietária. Somente ela enxerga a gestão de usuários e pode enviar convites.

Aplique `supabase/migrations/202607140001_initial_schema.sql` no SQL Editor do Supabase. Para convites, adicione `SUPABASE_SERVICE_ROLE_KEY` ao `.env.local`; essa chave é exclusivamente de servidor e nunca deve ser exposta no navegador.

A trilha de auditoria grava automaticamente criação, edição e exclusão de demandas, identificando usuário, horário e dados alterados.
