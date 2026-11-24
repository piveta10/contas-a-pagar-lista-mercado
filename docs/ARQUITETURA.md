# Arquitetura — Controle de Contas

## 1. Visão geral

```
Navegador (celular / tablet / computador, PWA instalável)
        │  HTTPS, cookie HttpOnly assinado
        ▼
Vercel ── Next.js 16 (App Router)
        │   ├─ proxy.ts ............. barra quem não tem sessão válida
        │   ├─ Server Components .... leitura (dashboard, listas, relatórios)
        │   ├─ Server Actions ....... escrita (sempre revalidam sessão/PIN + Zod)
        │   └─ Route Handlers ....... PDFs e backup (GET, sessão obrigatória)
        ▼
Drizzle ORM (consultas parametrizadas) ── @neondatabase/serverless (TLS)
        ▼
Neon PostgreSQL (branch "main" = produção, branches separadas para testes)
```

Nenhum segredo vai para o navegador. Toda regra (vencida, duplicidade, permissão)
é decidida no servidor.

## 2. Segurança sem login individual

O uso diário não tem usuário/senha, mas o sistema **não é público**:

| Camada | Como funciona |
|---|---|
| **Código de acesso da casa** (`ACCESS_CODE`) | Digitado uma única vez em cada aparelho. Gera um cookie `HttpOnly`, `Secure`, `SameSite=Lax`, assinado com HMAC‑SHA256 (`SESSION_SECRET`), válido por 180 dias. Trocar o código invalida todos os aparelhos. |
| **Limite de tentativas** | 5 erros em 15 minutos por IP (tabela `tentativas_acesso`, IP guardado só como hash). |
| **PIN de administrador** (`ADMIN_PIN`) | Exigido para excluir contas, editar/remover responsáveis e categorias, restaurar contas e baixar backup. Libera o "modo administrador" por 15 minutos naquele aparelho. |
| **Verificação no servidor** | Cada Server Action e cada rota de API confere a sessão (e o PIN, quando aplicável) por conta própria — o `proxy.ts` é apenas uma camada extra. |
| **Validação** | Zod em todas as entradas; limites de tamanho; datas e UUIDs verificados. |
| **SQL Injection** | Só consultas parametrizadas (Drizzle / template `sql` com parâmetros). |
| **XSS** | React escapa todo texto; nenhum `dangerouslySetInnerHTML`; CSP restritiva. |
| **CSRF** | Server Actions do Next verificam Origin × Host; cookies `SameSite=Lax`. |
| **Cabeçalhos** | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag: noindex`. |
| **Exclusões** | Contas: exclusão lógica + PIN + confirmação. Listas: "Limpar" arquiva. Itens: desfazer em 1 clique. Tudo registrado em `historico_alteracoes`. |
| **Backup** | Point‑in‑time restore do Neon + exportação JSON (PIN) + workflow semanal de `pg_dump` no GitHub Actions. |

## 3. Banco de dados

Migration: [`db/migrations/0001_inicial.sql`](../db/migrations/0001_inicial.sql).

```
responsaveis 1───* contas *───1 categorias
                    │ 1
                    │
                    0..1 pagamentos

listas_compras 1───* itens_lista

historico_alteracoes   (entidade, entidade_id, acao, dados jsonb)
tentativas_acesso      (limite de força bruta)
```

Decisões principais:

- **Valores em centavos (`bigint`)** — sem erros de arredondamento.
- **`contas.responsavel_nome`** guarda o nome no momento do lançamento; `responsavel_id` vira `NULL` se o cadastro sumir, mas a identificação permanece.
- **Situação da conta é calculada**, não armazenada: `paga` (existe pagamento), `vencida` (sem pagamento e vencimento < hoje no fuso `America/Sao_Paulo`), `vence_hoje`, `a_vencer`. Assim nunca fica desatualizada.
- **Anti‑duplicação**: índice único parcial (categoria + descrição + valor + vencimento) e `chave_idempotencia` gerada pelo formulário (duplo clique não cria duas contas).
- **Uma lista ativa por data** (índice único parcial). "Limpar lista atual" muda o status para `arquivada` — os itens continuam consultáveis e entram nos PDFs.

## 4. Telas

| Rota | Conteúdo |
|---|---|
| `/acesso` | Código de acesso do aparelho |
| `/` | Cartões (total do mês, pagas no mês, a vencer, vencidas), contas que precisam de atenção, adição rápida de compras, resumo de 6 meses, ações rápidas, PDF do mês |
| `/contas` | Filtros (busca, categoria, situação, período, responsável), lista ordenada por urgência, pagar com 1 toque |
| `/contas/nova` | Formulário curto com categorias em botões e valor com máscara R$ |
| `/contas/[id]` | Detalhes, pagar/desfazer, editar, excluir (PIN), histórico de alterações |
| `/compras` | Campo "Digite um produto para comprar...", sugestões, itens do dia, troca de data, listas arquivadas, histórico de datas, PDF do dia/período, limpar lista |
| `/relatorios` | Período, categoria, responsável, totais, gráficos, detalhamento, Gerar PDF (abrir/baixar/compartilhar) |
| `/configuracoes` | Responsáveis, categorias, modo administrador, sair do aparelho, backup, contas excluídas |

Navegação: barra lateral azul‑marinho no computador; barra inferior no celular.

## 5. Estrutura de pastas

```
db/migrations/        SQL versionado (aplicado por scripts/migrate.ts)
scripts/              migrate.ts, backup.ts
src/proxy.ts          barreira de sessão
src/app/              rotas (App Router) e Route Handlers (api/pdf, api/backup)
src/actions/          Server Actions (escrita)
src/queries/          leituras no banco
src/db/               schema Drizzle e conexão
src/lib/              regras puras (datas, dinheiro, situação, tokens, PDF, validação)
src/components/       UI reutilizável
tests/unit/           Vitest
tests/e2e/            Playwright (desktop + celular)
```
