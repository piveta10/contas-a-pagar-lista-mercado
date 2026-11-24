import { CalendarDays } from "lucide-react";
import { contextoUsuario } from "@/lib/contexto";
import { formatarDataLonga } from "@/lib/datas";
import { SeletorResponsavel } from "./seletor-responsavel";

/** Cabeçalho das páginas: título à esquerda, data e responsável à direita (desktop). */
export async function Cabecalho({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  const { responsaveis, atual, hoje } = await contextoUsuario();
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-marinho-900 sm:text-[30px]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[15px] text-slate-500">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-3">
        {acoes}
        <span className="hidden items-center gap-2 rounded-2xl border border-marinho-100 bg-white px-4 py-2.5 text-sm font-semibold text-marinho-800 shadow-cartao xl:flex">
          <CalendarDays className="size-4 text-roxo-600" />
          {formatarDataLonga(hoje)}
        </span>
        <div className="hidden lg:block">
          <SeletorResponsavel responsaveis={responsaveis} atual={atual} />
        </div>
      </div>
    </header>
  );
}
