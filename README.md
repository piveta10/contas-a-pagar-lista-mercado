# Controle de Contas

Aplicação web (responsiva e instalável como app) para controlar as **contas da casa** e a **lista de compras do dia a dia**.

- Contas com vencimento, pagamento, categorias, responsável e histórico de alterações
- Identificação automática de contas vencidas (fuso `America/Sao_Paulo`)
- Lista de compras ultrarrápida: digite, ENTER, pronto — salva na hora
- Listas separadas por data, arquivamento sem perder histórico
- Relatórios com gráficos e PDFs (abrir, baixar, compartilhar)
- Sem login individual, mas **protegido** por código de acesso + PIN de administrador

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · Neon PostgreSQL · pdf-lib · Recharts · Lucide · Vitest · Playwright · Vercel.

Arquitetura, modelo de dados e decisões de segurança: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## 1. Pré-requisitos

- Node.js 22 (`.nvmrc`)
- Conta no [Neon](https://neon.tech), no [GitHub](https://github.com) e na [Vercel](https://vercel.com)

## 2. Banco de dados no Neon

1. Crie um projeto no Neon (região **São Paulo / `sa-east-1`** de preferência).
2. Na tela *Connection Details*, copie a string **pooled** (host com `-pooler`), com `sslmode=require`.
3. Crie **branches** separadas:
   - `main` → produção
   - `teste` → testes automatizados (E2E). **Nunca rode os testes E2E contra a produção.**

## 3. Rodar localmente

```bash
npm install
cp .env.example .env.local      # preencha os valores
npm run db:migrate              # cria as tabelas
npm run dev                     # http://localhost:3000
```

Gere um `SESSION_SECRET` forte:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão Neon (pooled, `sslmode=require`) |
| `ACCESS_CODE` | Código da casa, pedido **uma vez por aparelho** (mín. 8 caracteres) |
| `ADMIN_PIN` | PIN numérico (6–12 dígitos) para exclusões, cadastros e backup |
| `SESSION_SECRET` | Assina os cookies (mín. 32 caracteres) |
| `APP_TIMEZONE` | Fuso para "vencida" (padrão `America/Sao_Paulo`) |

> Em produção o app se recusa a iniciar com os valores de exemplo de `ACCESS_CODE`/`ADMIN_PIN`.

### Primeiro uso

1. Abra o app e digite o código de acesso.
2. Em **Configurações → Responsáveis**, cadastre os nomes de quem usa (ou cadastre direto no formulário de nova conta).
3. As categorias Luz, Água, Internet, Mercado, Aluguel, Telefone e Outros já vêm criadas.

## 4. Publicar (GitHub + Vercel)

```bash
git init && git add . && git commit -m "Controle de Contas"
git branch -M main
git remote add origin git@github.com:SEU_USUARIO/controle-de-contas.git
git push -u origin main
```

Faça commit do `package-lock.json` gerado pelo `npm install`.

Na Vercel:

1. **Add New → Project** → importe o repositório.
2. Em **Environment Variables**, cadastre `DATABASE_URL`, `ACCESS_CODE`, `ADMIN_PIN`, `SESSION_SECRET` e `APP_TIMEZONE` para **Production** (use a branch `main` do Neon).
   Para **Preview**, use outra branch do Neon (ou a integração Neon ↔ Vercel, que cria uma branch por preview).
3. Deploy.

O `vercel.json` usa `npm run build:vercel`, que **aplica as migrations automaticamente apenas no deploy de produção** (`VERCEL_ENV=production`) e depois faz o build. Migrations rodam em transação, com trava contra execução simultânea e verificação de checksum.

## 5. Migrations

- Ficam em `db/migrations/NNNN_descricao.sql` e são aplicadas em ordem.
- **Nunca edite uma migration já aplicada** — crie a próxima (`0002_...sql`). O script recusa migrations alteradas.
- `npm run db:status` mostra o que está aplicado/pendente.
- Ao mudar a estrutura, atualize também `src/db/schema.ts` (mapeamento do Drizzle).

## 6. Testes

```bash
npm test             # unitários (Vitest): datas, valores, vencidas, ordenação, tokens, validação, PDF
npm run test:e2e     # ponta a ponta (Playwright) — desktop e celular
```

Para os E2E, crie `.env.test` apontando para a **branch de teste** do Neon:

```env
DATABASE_URL="postgresql://...branch-teste...?sslmode=require"
ACCESS_CODE="codigo-de-teste-123"
ADMIN_PIN="123456"
SESSION_SECRET="...32+ caracteres..."
E2E_ALLOW_DB_WRITES="1"
```

Depois: `npx playwright install chromium`, `DATABASE_URL=... npm run db:migrate` e `npm run test:e2e`.
Sem `E2E_ALLOW_DB_WRITES=1`, os testes que gravam dados são ignorados (proteção contra gravar na produção).

Cobertura E2E: cadastro/edição/exclusão de contas, pagamento, identificação e destaque de vencidas, ordenação por vencimento, bloqueio de duplicidade, responsáveis, adição rápida (ENTER e botão +), persistência após recarregar, separação por data, limpeza sem apagar histórico, PDFs, responsividade, bloqueio das APIs sem sessão, cookie forjado, validação de parâmetros e cabeçalhos de segurança.

### Testes de produção (fumaça, sem gravar dados)

```bash
BASE_URL="https://seu-app.vercel.app" ACCESS_CODE="..." npm run test:prod
```

### CI

`.github/workflows/ci.yml` roda testes unitários, build e checagem de tipos a cada push. Os E2E rodam se você cadastrar os secrets `E2E_DATABASE_URL`, `E2E_ACCESS_CODE`, `E2E_ADMIN_PIN` e `E2E_SESSION_SECRET` (branch de teste).

## 7. Segurança

- **Código de acesso** por aparelho → cookie `HttpOnly`/`Secure`/`SameSite=Lax` assinado (HMAC‑SHA256), 180 dias.
- **5 tentativas erradas em 15 min** bloqueiam o IP (código e PIN).
- **PIN de administrador** libera por 15 min: excluir contas, renomear/remover responsáveis, editar/remover categorias, restaurar contas e baixar backup.
- Toda Server Action e rota de API verifica a sessão no servidor; o `proxy.ts` é uma camada extra.
- Validação com Zod, consultas parametrizadas (Drizzle), CSP e cabeçalhos de segurança, `noindex`.
- Exclusões são lógicas e auditadas; "Limpar lista" arquiva.

**Trocar o código de acesso** (ex.: celular perdido): altere `ACCESS_CODE` na Vercel e faça redeploy — todos os aparelhos precisarão digitar o novo código.

## 8. Backup e recuperação

| Camada | Como |
|---|---|
| Neon (point‑in‑time restore) | Painel do Neon → *Restore*. O período de retenção depende do plano. |
| Backup semanal automático | `.github/workflows/backup.yml`: `pg_dump` criptografado (AES‑256), guardado 30 dias como artifact. Secrets: `BACKUP_DATABASE_URL` (string **direta**, sem `-pooler`) e `BACKUP_PASSPHRASE`. Mantenha o repositório **privado**. |
| Backup manual (JSON) | App → Configurações → *Baixar backup* (exige PIN), ou `npm run db:backup`. |

Restaurar um `pg_dump`:

```bash
gpg -d controle-de-contas-AAAA-MM-DD.dump.gpg > backup.dump
pg_restore --clean --if-exists --no-owner -d "postgresql://...destino..." backup.dump
```

Recomendação: teste a restauração em uma branch do Neon a cada poucos meses.

## 9. Manutenção

- **Atualizar dependências:** `npm outdated` → `npm update` → `npm test && npm run build`.
- **Logs:** Vercel → Project → Logs (erros aparecem com prefixos como `[acao]`, `[pdf/relatorio]`).
- **Contas excluídas por engano:** Configurações → Contas excluídas → Restaurar (PIN).
- **Histórico de alterações:** cada conta mostra criação, edições, pagamentos e exclusões com data e responsável.

## 10. Estrutura

```
db/migrations/     SQL versionado
scripts/           migrate.ts, backup.ts
src/proxy.ts       barreira de sessão
src/app/           telas (App Router) e APIs (PDF, backup)
src/actions/       Server Actions (gravação)
src/queries/       consultas
src/lib/           regras puras (datas, dinheiro, situação, tokens, PDF, validação)
src/components/    componentes reutilizáveis
tests/unit/        Vitest
tests/e2e/         Playwright
```
