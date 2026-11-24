"use client";

import { Download, ExternalLink, FileText, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Botao, classesBotao } from "@/components/ui/botao";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";

type Variante = "primario" | "secundario" | "marinho" | "fantasma";

/**
 * Gera o PDF no servidor e oferece Abrir / Baixar / Compartilhar.
 * (Os botões ficam num modal para manter o "gesto do usuário" exigido
 * pelos navegadores de celular para abrir abas e compartilhar arquivos.)
 */
export function BotaoPdf({
  url,
  nomeArquivo,
  rotulo = "Gerar PDF",
  variante = "primario",
  className = "",
  tamanho = "md",
}: {
  url: string;
  nomeArquivo: string;
  rotulo?: string;
  variante?: Variante;
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const [gerando, setGerando] = useState(false);
  const [arquivo, setArquivo] = useState<{ blob: Blob; link: string } | null>(null);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  useEffect(() => () => {
    if (arquivo) URL.revokeObjectURL(arquivo.link);
  }, [arquivo]);

  async function gerar() {
    setGerando(true);
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (resp.status === 401) {
        window.location.assign("/acesso");
        return;
      }
      if (!resp.ok) {
        const corpo = (await resp.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(corpo?.erro ?? "Não foi possível gerar o PDF.");
      }
      const blob = await resp.blob();
      const link = URL.createObjectURL(blob);
      setArquivo({ blob, link });
      const file = new File([blob], nomeArquivo, { type: "application/pdf" });
      setPodeCompartilhar(typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível gerar o PDF.", { tipo: "erro" });
    } finally {
      setGerando(false);
    }
  }

  async function compartilhar() {
    if (!arquivo) return;
    try {
      await navigator.share({ files: [new File([arquivo.blob], nomeArquivo, { type: "application/pdf" })], title: nomeArquivo });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("Não foi possível compartilhar.", { tipo: "erro" });
    }
  }

  return (
    <>
      <Botao variante={variante} tamanho={tamanho} carregando={gerando} onClick={gerar} className={className}>
        {!gerando && <FileText className="size-5" />}
        {gerando ? "Gerando PDF..." : rotulo}
      </Botao>
      <Modal aberto={!!arquivo} aoFechar={() => setArquivo(null)} titulo="PDF pronto" descricao={nomeArquivo} largura="max-w-sm">
        {arquivo && (
          <div className="grid gap-2">
            <a href={arquivo.link} target="_blank" rel="noopener" className={classesBotao("primario", "md", "w-full")}>
              <ExternalLink className="size-4" /> Abrir PDF
            </a>
            <a
              href={arquivo.link}
              download={nomeArquivo}
              className={classesBotao("secundario", "md", "w-full")}
              onClick={() => toast("Download iniciado.")}
            >
              <Download className="size-4" /> Baixar
            </a>
            {podeCompartilhar && (
              <Botao variante="secundario" className="w-full" onClick={compartilhar}>
                <Share2 className="size-4" /> Compartilhar
              </Botao>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
