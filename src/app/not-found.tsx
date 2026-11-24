import { SearchX } from "lucide-react";
import { BotaoLink } from "@/components/ui/botao";

export default function NaoEncontrado() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="cartao max-w-md p-8 text-center">
        <SearchX className="mx-auto size-12 text-roxo-400" />
        <h1 className="mt-4 text-xl font-extrabold">Página não encontrada</h1>
        <p className="mt-1 text-sm text-slate-500">O registro pode ter sido excluído ou o endereço está incorreto.</p>
        <BotaoLink href="/" className="mt-6">
          Voltar ao início
        </BotaoLink>
      </div>
    </div>
  );
}
