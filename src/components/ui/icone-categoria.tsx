import {
  Baby,
  Car,
  CreditCard,
  Droplet,
  Flame,
  Fuel,
  GraduationCap,
  HeartPulse,
  House,
  PawPrint,
  Phone,
  Receipt,
  Shield,
  ShoppingCart,
  Tv,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IconeCategoria as NomeIcone } from "@/lib/icones";

export const MAPA_ICONES: Record<NomeIcone, LucideIcon> = {
  zap: Zap,
  droplet: Droplet,
  wifi: Wifi,
  "shopping-cart": ShoppingCart,
  home: House,
  phone: Phone,
  receipt: Receipt,
  flame: Flame,
  car: Car,
  fuel: Fuel,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "credit-card": CreditCard,
  tv: Tv,
  baby: Baby,
  "paw-print": PawPrint,
  shield: Shield,
  wrench: Wrench,
};

export function IconeCategoria({
  icone,
  cor,
  tamanho = "md",
}: {
  icone: string;
  cor: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const Icone = MAPA_ICONES[icone as NomeIcone] ?? Receipt;
  const caixa = tamanho === "sm" ? "size-8 rounded-lg" : tamanho === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const svg = tamanho === "sm" ? "size-4" : tamanho === "lg" ? "size-6" : "size-5";
  return (
    <span className={`grid shrink-0 place-items-center ${caixa}`} style={{ backgroundColor: `${cor}1a`, color: cor }} aria-hidden>
      <Icone className={svg} strokeWidth={2.2} />
    </span>
  );
}
