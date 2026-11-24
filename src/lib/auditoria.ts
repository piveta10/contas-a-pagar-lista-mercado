import "server-only";
import { db, type Executor } from "@/db";
import { historicoAlteracoes } from "@/db/schema";

export type EntidadeHistorico = "conta" | "pagamento" | "responsavel" | "categoria" | "lista_compras" | "backup";

export async function registrarHistorico(
  registro: {
    entidade: EntidadeHistorico;
    entidadeId?: string | null;
    acao: string;
    dados?: Record<string, unknown>;
    responsavelNome?: string | null;
  },
  tx?: Executor,
) {
  const executor: Executor = tx ?? db();
  await executor.insert(historicoAlteracoes).values({
    entidade: registro.entidade,
    entidadeId: registro.entidadeId ?? null,
    acao: registro.acao,
    dados: registro.dados ?? null,
    responsavelNome: registro.responsavelNome ?? null,
  });
}
