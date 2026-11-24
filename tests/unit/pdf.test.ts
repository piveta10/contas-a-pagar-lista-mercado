import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { gerarPdfCompras, gerarPdfRelatorio } from "@/lib/pdf";

const cabecalhoPdf = (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 5));

describe("geração de PDF", () => {
  it("gera relatório com várias páginas, acentos e caracteres não suportados", async () => {
    const linhas = Array.from({ length: 90 }, (_, i) => ({
      vencimento: "20/11/2026",
      descricao: `Conta de água nº ${i} 😀 ção`,
      categoria: "Água",
      responsavel: "João",
      situacao: "Vencida",
      corSituacao: "vermelho" as const,
      pagamento: "—",
      valor: "R$ 98,50",
    }));
    const bytes = await gerarPdfRelatorio({
      titulo: "Relatório de Contas",
      periodo: "01/11/2026 a 30/11/2026",
      filtros: ["Categoria: Todas"],
      geradoEm: "24/11/2026 10:00",
      totais: [{ rotulo: "Total", valor: "R$ 8.865,00", cor: "marinho" }],
      porCategoria: [{ nome: "Água", quantidade: 90, total: "R$ 8.865,00" }],
      linhas,
    });
    expect(cabecalhoPdf(bytes)).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getTitle()).toBe("Relatório de Contas");
  });

  it("gera lista de compras vazia sem erro", async () => {
    const bytes = await gerarPdfCompras({ titulo: "Lista de Compras", periodo: "24/11/2026", geradoEm: "agora", resumo: "0 itens", grupos: [] });
    expect(cabecalhoPdf(bytes)).toBe("%PDF-");
  });
});
