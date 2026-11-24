import { z } from "zod";
import { isoValida } from "./datas";
import { converterParaCentavos } from "./dinheiro";
import { CORES_CATEGORIA, ICONES_CATEGORIA } from "./icones";

/** Remove caracteres de controle e espaços repetidos. */
export function limparTexto(valor: string): string {
  // eslint-disable-next-line no-control-regex
  return valor.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function texto(max: number, obrigatorio: string) {
  return z
    .string({ error: obrigatorio })
    .transform(limparTexto)
    .pipe(z.string().min(1, obrigatorio).max(max, `Use no máximo ${max} caracteres.`));
}

export const esquemaId = z.uuid({ error: "Registro inválido." });
export const esquemaData = z.string({ error: "Informe a data." }).refine(isoValida, "Data inválida.");

export const esquemaValor = z.union([z.string(), z.number()], { error: "Informe o valor." }).transform((v, ctx) => {
  const centavos = converterParaCentavos(v);
  if (centavos === null) {
    ctx.addIssue({ code: "custom", message: "Informe um valor maior que zero." });
    return z.NEVER;
  }
  return centavos;
});

const observacao = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? limparTexto(v) : ""))
  .pipe(z.string().max(500, "Observação muito longa (máx. 500)."))
  .transform((v) => v || null);

export const esquemaConta = z.object({
  descricao: texto(120, "Informe a descrição."),
  categoriaId: esquemaId,
  valor: esquemaValor,
  vencimento: esquemaData,
  responsavelId: z.uuid({ error: "Selecione quem está cadastrando." }),
  observacao,
  chave: z.uuid().optional(),
});
export type EntradaConta = z.input<typeof esquemaConta>;

export const esquemaPagamento = z.object({
  contaId: esquemaId,
  dataPagamento: esquemaData,
  valorPago: esquemaValor.optional(),
});

export const esquemaItem = z.object({
  data: esquemaData,
  descricao: texto(120, "Digite o nome do produto."),
});

export const esquemaResponsavel = z.object({
  nome: texto(80, "Informe o nome."),
});

export const esquemaCategoria = z.object({
  nome: texto(60, "Informe o nome da categoria."),
  icone: z.enum(ICONES_CATEGORIA, { error: "Ícone inválido." }),
  cor: z.enum(CORES_CATEGORIA, { error: "Cor inválida." }),
});

export const esquemaPeriodo = z
  .object({ de: esquemaData, ate: esquemaData })
  .refine((p) => p.de <= p.ate, { message: "A data inicial deve ser anterior à final.", path: ["ate"] });

export function primeiraMensagem(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}
