"use client";

import { BarChart3, CalendarCheck, Heart, House, Settings, ShoppingCart, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ItemMenu {
  href: string;
  rotulo: string;
  curto: string;
  icone: LucideIcon;
}

const ITENS: ItemMenu[] = [
  { href: "/", rotulo: "Início", curto: "Início", icone: House },
  { href: "/contas", rotulo: "Contas", curto: "Contas", icone: CalendarCheck },
  { href: "/compras", rotulo: "Lista de Compras", curto: "Compras", icone: ShoppingCart },
  { href: "/relatorios", rotulo: "Relatórios", curto: "Relatórios", icone: BarChart3 },
  { href: "/configuracoes", rotulo: "Configurações", curto: "Ajustes", icone: Settings },
];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-roxo-500 to-roxo-700 text-white shadow-roxo">
        <House className="size-6" strokeWidth={2.4} />
      </span>
      {!compacto && (
        <span className="text-[17px] leading-tight font-extrabold tracking-tight">
          Controle
          <br />
          de Contas
        </span>
      )}
    </div>
  );
}

export function BarraLateral() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden bg-gradient-to-b from-marinho-800 via-marinho-900 to-marinho-950 text-white lg:flex">
      <div className="px-6 pt-8 pb-10">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 px-4" aria-label="Menu principal">
        {ITENS.map((item) => {
          const ok = ativo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ok ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
                ok ? "bg-roxo-600 text-white shadow-roxo" : "text-white/75 hover:bg-white/8 hover:text-white"
              }`}
            >
              <item.icone className="size-5" />
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
      <div className="relative px-6 pb-8">
        <p className="relative z-10 flex items-start gap-2 text-xs leading-relaxed text-white/70">
          <Heart className="mt-0.5 size-4 shrink-0 fill-rose-500 text-rose-500" />
          Organização hoje, tranquilidade sempre!
        </p>
        <svg viewBox="0 0 256 120" className="pointer-events-none absolute inset-x-0 -bottom-2 w-full text-roxo-600/25" aria-hidden>
          <path fill="currentColor" d="M0 60c40-30 90-30 128 0s88 30 128 0v60H0z" />
          <path fill="currentColor" opacity=".6" d="M0 85c50-25 100-20 140 5s80 15 116-5v35H0z" />
        </svg>
      </div>
    </aside>
  );
}

export function NavegacaoInferior() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-marinho-100 bg-white/95 pb-seguro backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {ITENS.map((item) => {
          const ok = ativo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ok ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-semibold ${ok ? "text-roxo-600" : "text-slate-500"}`}
            >
              <span className={`grid h-7 w-12 place-items-center rounded-full transition ${ok ? "bg-roxo-100" : ""}`}>
                <item.icone className="size-5" strokeWidth={ok ? 2.5 : 2} />
              </span>
              {item.curto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
