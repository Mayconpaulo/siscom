# SISCOM

Sistema Integrado da Seção de Comunicação Social, de propriedade de Paulo Silva. Aplicação operacional para gestão de demandas, agenda e ferramentas da Seção de Comunicação Social.

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
- `/dashboard/demandas`: cadastro e acompanhamento de demandas
- `/dashboard/agenda`: agenda operacional
- `/dashboard/crachas`: criação e impressão de crachás em folhas A4
- `/dashboard/assistente`: assistente de cerimonial
- `/dashboard/ferramentas`: geradores operacionais
- `/dashboard/configuracoes`: perfil, foto e aparência
- `/dashboard/usuarios`: gestão de usuários, exclusiva do proprietário

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

## Perfis e configurações

O tratamento de todos os usuários no SISCOM é composto por posto/graduação + nome de guerra. O nome completo é mantido somente para controle administrativo. A área de Configurações permite editar os dados pessoais, adicionar uma foto de perfil e escolher entre os temas claro, escuro ou automático.

Para habilitar nomes de guerra obrigatórios e fotos de perfil, aplique também `supabase/migrations/202607200001_profile_settings.sql`.

## Demandas e notificações

Todas as demandas são visíveis para os usuários autenticados. Na listagem, as atribuídas ao usuário atual aparecem primeiro e podem ser filtradas por `Todas`, `Minhas`, `Pendentes` e `Concluídas`. A conclusão é controlada por checkbox.

Para ativar as notificações internas de atribuição, aplique `supabase/migrations/202607200002_demand_notifications.sql`. O aviso aparece no sino do SISCOM assim que o responsável entra no sistema.


## Gerador de crachás

A área de Crachás permite definir as medidas físicas, os textos superior e inferior, nome, identidade, quantidade de cópias e as cores das quatro faixas. O sistema calcula automaticamente o limite por folha A4 e oferece impressão somente da frente ou de frente e verso unidos para dobra. Os formatos militar (85 × 52 mm) e obra (95 × 68 mm) estão disponíveis como atalhos. O brasão institucional original é apenas redimensionado.

## Publicação

O projeto está conectado ao GitHub e à Vercel para publicações automáticas a partir do ramo `main`.

Acesso: https://siscom-snowy.vercel.app/login
