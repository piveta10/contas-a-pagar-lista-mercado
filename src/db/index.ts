import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

type Banco = NeonDatabase<typeof schema>;
const memoria = globalThis as unknown as { __banco?: Banco };

/** Conexão preguiçosa: só lê DATABASE_URL quando a primeira consulta acontece. */
export function db(): Banco {
  if (!memoria.__banco) {
    const pool = new Pool({ connectionString: env().DATABASE_URL, max: 5 });
    memoria.__banco = drizzle({ client: pool, schema });
  }
  return memoria.__banco;
}

export type Transacao = Parameters<Parameters<Banco["transaction"]>[0]>[0];
/** Banco ou transação — para funções que podem rodar dentro de uma transação. */
export type Executor = Pick<Banco, "select" | "insert" | "update" | "delete" | "execute">;
export { schema };
