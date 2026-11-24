/**
 * Aplica as migrations SQL de db/migrations em ordem, cada uma em transação.
 * Registra o que já foi aplicado na tabela _migrations (com checksum).
 *
 *   npm run db:migrate            aplica pendentes
 *   npm run db:status             lista aplicadas/pendentes
 *   --somente-producao            (usado no build da Vercel) só roda quando
 *                                 VERCEL_ENV=production ou MIGRATE_ON_BUILD=1
 */
import { config as carregarEnv } from "dotenv";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

carregarEnv({ path: ".env.local", quiet: true });
carregarEnv({ quiet: true });
neonConfig.webSocketConstructor = ws;

const PASTA = join(process.cwd(), "db", "migrations");
const args = new Set(process.argv.slice(2));

async function main() {
  if (args.has("--somente-producao")) {
    const deveRodar = process.env.VERCEL_ENV === "production" || process.env.MIGRATE_ON_BUILD === "1";
    if (!deveRodar) {
      console.log(`[migrate] Ignorado (VERCEL_ENV=${process.env.VERCEL_ENV ?? "indefinido"}).`);
      return;
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        nome       text PRIMARY KEY,
        checksum   char(64) NOT NULL,
        aplicada_em timestamptz NOT NULL DEFAULT now()
      )`);
    // Impede duas execuções simultâneas (ex.: dois deploys ao mesmo tempo).
    await client.query("SELECT pg_advisory_lock(727274001)");

    const arquivos = readdirSync(PASTA).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
    const { rows } = await client.query<{ nome: string; checksum: string }>("SELECT nome, checksum FROM _migrations");
    const aplicadas = new Map(rows.map((r) => [r.nome, r.checksum]));

    let pendentes = 0;
    for (const arquivo of arquivos) {
      const sql = readFileSync(join(PASTA, arquivo), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const anterior = aplicadas.get(arquivo);

      if (anterior) {
        if (anterior !== checksum) {
          throw new Error(`A migration ${arquivo} foi alterada depois de aplicada. Crie uma nova migration em vez de editar.`);
        }
        if (args.has("--status")) console.log(`  ✓ ${arquivo}`);
        continue;
      }

      pendentes++;
      if (args.has("--status")) {
        console.log(`  • ${arquivo} (pendente)`);
        continue;
      }

      console.log(`[migrate] Aplicando ${arquivo}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (nome, checksum) VALUES ($1, $2)", [arquivo, checksum]);
        await client.query("COMMIT");
      } catch (erro) {
        await client.query("ROLLBACK");
        throw erro;
      }
    }

    if (!args.has("--status")) {
      console.log(pendentes ? `[migrate] ${pendentes} migration(s) aplicada(s).` : "[migrate] Banco já está atualizado.");
    }
    await client.query("SELECT pg_advisory_unlock(727274001)");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((erro) => {
  console.error("[migrate] Falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
