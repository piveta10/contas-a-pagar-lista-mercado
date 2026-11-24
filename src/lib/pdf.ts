/**
 * Geração de PDFs (relatório de contas e listas de compras) com pdf-lib.
 * Recebe textos já formatados (R$, DD/MM/AAAA) — este módulo só desenha.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from "pdf-lib";

type Cor = RGB;
const hex = (h: string): Cor => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

export const CORES_PDF = {
  marinho: hex("#14114d"),
  roxo: hex("#6a24f5"),
  roxoClaro: hex("#efe9ff"),
  verde: hex("#15803d"),
  verdeClaro: hex("#e8f7ee"),
  vermelho: hex("#d61f45"),
  vermelhoClaro: hex("#fdecef"),
  ambar: hex("#b45309"),
  texto: hex("#1e1b3a"),
  cinza: hex("#64748b"),
  linha: hex("#e4e2f0"),
  zebra: hex("#f7f6fd"),
  branco: rgb(1, 1, 1),
};
export type NomeCor = keyof typeof CORES_PDF;

const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 40;
const RODAPE = 48;

export interface ColunaTabela {
  titulo: string;
  largura: number; // fração da largura útil (soma = 1)
  alinhar?: "esquerda" | "direita";
}

export interface LinhaTabela {
  celulas: string[];
  cores?: (NomeCor | undefined)[];
  negrito?: boolean[];
}

class Escritor {
  pagina!: PDFPage;
  y = 0;
  private paginas: PDFPage[] = [];
  private caracteres: Set<number>;

  constructor(
    private doc: PDFDocument,
    private fonte: PDFFont,
    private negrito: PDFFont,
    private tituloCurto: string,
  ) {
    this.caracteres = new Set(fonte.getCharacterSet());
  }

  /** Troca caracteres que a fonte padrão não suporta (ex.: emoji) por "?". */
  seguro(texto: string): string {
    let saida = "";
    for (const ch of texto.replace(/ /g, " ")) {
      const cp = ch.codePointAt(0)!;
      saida += cp === 10 || this.caracteres.has(cp) ? ch : "?";
    }
    return saida;
  }

  largura(texto: string, tamanho: number, negrito = false): number {
    return (negrito ? this.negrito : this.fonte).widthOfTextAtSize(this.seguro(texto), tamanho);
  }

  cortar(texto: string, larguraMax: number, tamanho: number, negrito = false): string {
    const t = this.seguro(texto);
    if (this.largura(t, tamanho, negrito) <= larguraMax) return t;
    let fim = t.length;
    while (fim > 0 && this.largura(t.slice(0, fim) + "…", tamanho, negrito) > larguraMax) fim--;
    return t.slice(0, fim) + "…";
  }

  escrever(texto: string, x: number, y: number, opcoes: { tamanho?: number; negrito?: boolean; cor?: Cor } = {}) {
    this.pagina.drawText(this.seguro(texto), {
      x,
      y,
      size: opcoes.tamanho ?? 10,
      font: opcoes.negrito ? this.negrito : this.fonte,
      color: opcoes.cor ?? CORES_PDF.texto,
    });
  }

  novaPagina() {
    this.pagina = this.doc.addPage([LARGURA, ALTURA]);
    this.paginas.push(this.pagina);
    if (this.paginas.length > 1) {
      this.pagina.drawRectangle({ x: 0, y: ALTURA - 34, width: LARGURA, height: 34, color: CORES_PDF.marinho });
      this.escrever(this.tituloCurto, MARGEM, ALTURA - 22, { tamanho: 10, negrito: true, cor: CORES_PDF.branco });
      this.y = ALTURA - 60;
    } else {
      this.y = ALTURA - MARGEM;
    }
  }

  garantir(altura: number) {
    if (this.y - altura < RODAPE + 10) this.novaPagina();
  }

  get util() {
    return LARGURA - MARGEM * 2;
  }

  cabecalho(titulo: string, subtitulo: string, geradoEm: string) {
    this.novaPagina();
    const altura = 96;
    this.pagina.drawRectangle({ x: 0, y: ALTURA - altura, width: LARGURA, height: altura, color: CORES_PDF.marinho });
    this.pagina.drawRectangle({ x: 0, y: ALTURA - altura, width: LARGURA, height: 4, color: CORES_PDF.roxo });
    // "logo"
    this.pagina.drawRectangle({ x: MARGEM, y: ALTURA - 66, width: 34, height: 34, color: CORES_PDF.roxo });
    this.escrever("CC", MARGEM + 7, ALTURA - 54, { tamanho: 13, negrito: true, cor: CORES_PDF.branco });
    this.escrever("CONTROLE DE CONTAS", MARGEM + 46, ALTURA - 42, { tamanho: 8, negrito: true, cor: hex("#b9a6ff") });
    this.escrever(this.cortar(titulo, this.util - 200, 18, true), MARGEM + 46, ALTURA - 62, {
      tamanho: 18,
      negrito: true,
      cor: CORES_PDF.branco,
    });
    this.escrever(this.cortar(subtitulo, this.util - 60, 9.5), MARGEM + 46, ALTURA - 78, { tamanho: 9.5, cor: hex("#d9d4ff") });
    const ger = `Gerado em ${geradoEm}`;
    this.escrever(ger, LARGURA - MARGEM - this.largura(ger, 8), ALTURA - 42, { tamanho: 8, cor: hex("#d9d4ff") });
    this.y = ALTURA - altura - 26;
  }

  linhasInfo(itens: string[]) {
    for (const item of itens) {
      this.garantir(14);
      this.escrever(this.cortar(item, this.util, 9.5), MARGEM, this.y, { tamanho: 9.5, cor: CORES_PDF.cinza });
      this.y -= 14;
    }
    this.y -= 6;
  }

  totais(cards: { rotulo: string; valor: string; detalhe?: string; cor: NomeCor }[]) {
    if (!cards.length) return;
    const altura = 58;
    this.garantir(altura + 10);
    const gap = 8;
    const larg = (this.util - gap * (cards.length - 1)) / cards.length;
    cards.forEach((c, i) => {
      const x = MARGEM + i * (larg + gap);
      const yBase = this.y - altura;
      this.pagina.drawRectangle({
        x,
        y: yBase,
        width: larg,
        height: altura,
        color: CORES_PDF.zebra,
        borderColor: CORES_PDF.linha,
        borderWidth: 0.8,
      });
      this.pagina.drawRectangle({ x, y: yBase, width: 3, height: altura, color: CORES_PDF[c.cor] });
      this.escrever(this.cortar(c.rotulo.toUpperCase(), larg - 16, 7.5, true), x + 10, yBase + altura - 16, {
        tamanho: 7.5,
        negrito: true,
        cor: CORES_PDF.cinza,
      });
      this.escrever(this.cortar(c.valor, larg - 16, 13, true), x + 10, yBase + altura - 34, {
        tamanho: 13,
        negrito: true,
        cor: CORES_PDF[c.cor],
      });
      if (c.detalhe) {
        this.escrever(this.cortar(c.detalhe, larg - 16, 7.5), x + 10, yBase + 9, { tamanho: 7.5, cor: CORES_PDF.cinza });
      }
    });
    this.y -= altura + 18;
  }

  secao(titulo: string) {
    this.garantir(40);
    this.y -= 4;
    this.pagina.drawRectangle({ x: MARGEM, y: this.y - 2, width: 3, height: 13, color: CORES_PDF.roxo });
    this.escrever(titulo, MARGEM + 9, this.y, { tamanho: 12, negrito: true, cor: CORES_PDF.marinho });
    this.y -= 18;
  }

  tabela(colunas: ColunaTabela[], linhas: LinhaTabela[], vazio = "Nenhum registro no período.") {
    const alturaLinha = 18;
    const tam = 8.5;
    const desenharCabecalho = () => {
      this.pagina.drawRectangle({ x: MARGEM, y: this.y - 6, width: this.util, height: alturaLinha, color: CORES_PDF.marinho });
      let x = MARGEM;
      for (const col of colunas) {
        const w = col.largura * this.util;
        const t = this.cortar(col.titulo, w - 10, tam, true);
        const tx = col.alinhar === "direita" ? x + w - 5 - this.largura(t, tam, true) : x + 5;
        this.escrever(t, tx, this.y, { tamanho: tam, negrito: true, cor: CORES_PDF.branco });
        x += w;
      }
      this.y -= alturaLinha;
    };

    this.garantir(alturaLinha * 2);
    desenharCabecalho();

    if (!linhas.length) {
      this.escrever(vazio, MARGEM + 5, this.y, { tamanho: 9, cor: CORES_PDF.cinza });
      this.y -= alturaLinha + 6;
      return;
    }

    linhas.forEach((linha, i) => {
      if (this.y - alturaLinha < RODAPE + 10) {
        this.novaPagina();
        desenharCabecalho();
      }
      if (i % 2 === 1) {
        this.pagina.drawRectangle({ x: MARGEM, y: this.y - 6, width: this.util, height: alturaLinha, color: CORES_PDF.zebra });
      }
      let x = MARGEM;
      colunas.forEach((col, c) => {
        const w = col.largura * this.util;
        const negrito = linha.negrito?.[c] ?? false;
        const t = this.cortar(linha.celulas[c] ?? "", w - 10, tam, negrito);
        const tx = col.alinhar === "direita" ? x + w - 5 - this.largura(t, tam, negrito) : x + 5;
        const cor = linha.cores?.[c];
        this.escrever(t, tx, this.y, { tamanho: tam, negrito, cor: cor ? CORES_PDF[cor] : CORES_PDF.texto });
        x += w;
      });
      this.y -= alturaLinha;
    });
    this.pagina.drawLine({
      start: { x: MARGEM, y: this.y + 12 },
      end: { x: MARGEM + this.util, y: this.y + 12 },
      thickness: 0.6,
      color: CORES_PDF.linha,
    });
    this.y -= 10;
  }

  itemChecklist(descricao: string, comprado: boolean, detalhe?: string) {
    const altura = 17;
    this.garantir(altura);
    const x = MARGEM + 6;
    this.pagina.drawRectangle({
      x,
      y: this.y - 2,
      width: 10,
      height: 10,
      borderColor: comprado ? CORES_PDF.verde : CORES_PDF.cinza,
      borderWidth: 1,
      color: comprado ? CORES_PDF.verde : CORES_PDF.branco,
    });
    if (comprado) {
      this.pagina.drawLine({ start: { x: x + 2, y: this.y + 3 }, end: { x: x + 4.5, y: this.y + 0.5 }, thickness: 1.4, color: CORES_PDF.branco });
      this.pagina.drawLine({ start: { x: x + 4.5, y: this.y + 0.5 }, end: { x: x + 8.5, y: this.y + 6 }, thickness: 1.4, color: CORES_PDF.branco });
    }
    const t = this.cortar(descricao, this.util - 160, 10);
    this.escrever(t, x + 18, this.y, { tamanho: 10, cor: comprado ? CORES_PDF.cinza : CORES_PDF.texto });
    if (comprado) {
      const w = this.largura(t, 10);
      this.pagina.drawLine({ start: { x: x + 18, y: this.y + 3.5 }, end: { x: x + 18 + w, y: this.y + 3.5 }, thickness: 0.7, color: CORES_PDF.cinza });
    }
    if (detalhe) {
      const d = this.cortar(detalhe, 130, 8);
      this.escrever(d, MARGEM + this.util - this.largura(d, 8), this.y, { tamanho: 8, cor: CORES_PDF.cinza });
    }
    this.y -= altura;
  }

  rodapes() {
    const total = this.paginas.length;
    this.paginas.forEach((p, i) => {
      p.drawLine({ start: { x: MARGEM, y: 34 }, end: { x: LARGURA - MARGEM, y: 34 }, thickness: 0.5, color: CORES_PDF.linha });
      p.drawText("Controle de Contas", { x: MARGEM, y: 22, size: 8, font: this.fonte, color: CORES_PDF.cinza });
      const t = `Página ${i + 1} de ${total}`;
      p.drawText(t, { x: LARGURA - MARGEM - this.fonte.widthOfTextAtSize(t, 8), y: 22, size: 8, font: this.fonte, color: CORES_PDF.cinza });
    });
  }
}

async function criar(titulo: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(titulo);
  doc.setAuthor("Controle de Contas");
  doc.setCreator("Controle de Contas");
  doc.setLanguage("pt-BR");
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, escritor: new Escritor(doc, fonte, negrito, titulo) };
}

// ---------------------------------------------------------------------------
// Relatório de contas
// ---------------------------------------------------------------------------
export interface DadosPdfRelatorio {
  titulo: string;
  periodo: string;
  filtros: string[];
  geradoEm: string;
  totais: { rotulo: string; valor: string; detalhe?: string; cor: NomeCor }[];
  porCategoria: { nome: string; quantidade: number; total: string }[];
  linhas: {
    vencimento: string;
    descricao: string;
    categoria: string;
    responsavel: string;
    situacao: string;
    corSituacao: NomeCor;
    pagamento: string;
    valor: string;
  }[];
}

export async function gerarPdfRelatorio(dados: DadosPdfRelatorio): Promise<Uint8Array> {
  const { doc, escritor: e } = await criar(dados.titulo);
  e.cabecalho(dados.titulo, `Período: ${dados.periodo}`, dados.geradoEm);
  e.linhasInfo(dados.filtros);
  e.totais(dados.totais);

  if (dados.porCategoria.length) {
    e.secao("Totais por categoria");
    e.tabela(
      [
        { titulo: "Categoria", largura: 0.6 },
        { titulo: "Contas", largura: 0.15, alinhar: "direita" },
        { titulo: "Total", largura: 0.25, alinhar: "direita" },
      ],
      dados.porCategoria.map((c) => ({ celulas: [c.nome, String(c.quantidade), c.total], negrito: [false, false, true] })),
    );
  }

  e.secao(`Detalhamento (${dados.linhas.length} ${dados.linhas.length === 1 ? "conta" : "contas"})`);
  e.tabela(
    [
      { titulo: "Vencimento", largura: 0.12 },
      { titulo: "Descrição", largura: 0.24 },
      { titulo: "Categoria", largura: 0.13 },
      { titulo: "Responsável", largura: 0.13 },
      { titulo: "Situação", largura: 0.11 },
      { titulo: "Pago em", largura: 0.12 },
      { titulo: "Valor", largura: 0.15, alinhar: "direita" },
    ],
    dados.linhas.map((l) => ({
      celulas: [l.vencimento, l.descricao, l.categoria, l.responsavel, l.situacao, l.pagamento, l.valor],
      cores: [undefined, undefined, undefined, undefined, l.corSituacao, undefined, undefined],
      negrito: [false, false, false, false, true, false, true],
    })),
  );

  e.rodapes();
  return doc.save();
}

// ---------------------------------------------------------------------------
// Listas de compras
// ---------------------------------------------------------------------------
export interface DadosPdfCompras {
  titulo: string;
  periodo: string;
  geradoEm: string;
  resumo: string;
  grupos: {
    data: string;
    listas: { rotulo: string; itens: { descricao: string; comprado: boolean; detalhe?: string }[] }[];
  }[];
}

export async function gerarPdfCompras(dados: DadosPdfCompras): Promise<Uint8Array> {
  const { doc, escritor: e } = await criar(dados.titulo);
  e.cabecalho(dados.titulo, dados.periodo, dados.geradoEm);
  e.linhasInfo([dados.resumo]);

  if (!dados.grupos.length) {
    e.escrever("Nenhum item registrado neste período.", 40, e.y, { tamanho: 10, cor: CORES_PDF.cinza });
  }

  for (const grupo of dados.grupos) {
    e.secao(grupo.data);
    for (const lista of grupo.listas) {
      e.garantir(30);
      e.escrever(lista.rotulo, 46, e.y, { tamanho: 8.5, negrito: true, cor: CORES_PDF.roxo });
      e.y -= 15;
      if (!lista.itens.length) {
        e.escrever("Lista vazia.", 52, e.y, { tamanho: 9, cor: CORES_PDF.cinza });
        e.y -= 15;
      }
      for (const item of lista.itens) e.itemChecklist(item.descricao, item.comprado, item.detalhe);
      e.y -= 6;
    }
  }

  e.rodapes();
  return doc.save();
}

/** Converte para ArrayBuffer "puro" (aceito por Response em qualquer runtime). */
export function paraArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}
