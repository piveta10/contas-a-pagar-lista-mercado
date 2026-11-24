/**
 * Exporta todas as tabelas para backups/backup-AAAA-MM-DD-HHMM.json
 *   npm run db:backup
 * Para backup completo em SQL, prefira `pg_dump` (veja README).
 */
import { config as carregarEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

carregarEnv({ path: ".env.local", quiet: true });
carregarEnv({ quiet: true });
neonConfig.webSocketConstructor = ws;

const TABELAS = [
  "responsaveis",
  "categorias",
  "contas",
  "pagamentos",
  "listas_compras",
  "itens_lista",
  "historico_alteracoes",
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const pool = new Pool({ connectionString: url });
  try {
    const dados: Record<string, unknown[]> = {};
    for (const tabela of TABELAS) {
      const { rows } = await pool.query(`SELECT * FROM ${tabela} ORDER BY criado_em`);
      dados[tabela] = rows;
    }
    const agora = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    mkdirSync("backups", { recursive: true });
    const caminho = join("backups", `backup-${agora}.json`);
    writeFileSync(caminho, JSON.stringify({ geradoEm: new Date().toISOString(), versao: 1, dados }, null, 2));
    console.log(`Backup salvo em ${caminho}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error("Backup falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
