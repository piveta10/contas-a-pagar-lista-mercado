import "server-only";
import { z } from "zod";

const esquema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL não definida." })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL deve começar com postgresql://"),
  ACCESS_CODE: z.string({ error: "ACCESS_CODE não definido." }).min(8, "ACCESS_CODE deve ter pelo menos 8 caracteres."),
  ADMIN_PIN: z.string({ error: "ADMIN_PIN não definido." }).regex(/^\d{6,12}$/, "ADMIN_PIN deve ter de 6 a 12 dígitos."),
  SESSION_SECRET: z.string({ error: "SESSION_SECRET não definido." }).min(32, "SESSION_SECRET deve ter pelo menos 32 caracteres."),
  APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
});

export type Env = z.infer<typeof esquema>;
let cache: Env | null = null;

/** Lê e valida as variáveis de ambiente (somente no servidor). */
export function env(): Env {
  if (cache) return cache;
  const r = esquema.safeParse(process.env);
  if (!r.success) {
    const lista = r.error.issues.map((i) => `- ${i.message}`).join("\n");
    throw new Error(`Configuração inválida:\n${lista}\nVeja .env.example e o README.`);
  }
  if (r.data.ACCESS_CODE === "troque-por-um-codigo-longo" || r.data.ADMIN_PIN === "000000") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Troque ACCESS_CODE e ADMIN_PIN de exemplo antes de publicar.");
    }
  }
  cache = r.data;
  return cache;
}
