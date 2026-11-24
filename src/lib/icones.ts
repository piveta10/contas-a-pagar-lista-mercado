/** Nomes de ícones e cores permitidos para categorias (validados no servidor). */
export const ICONES_CATEGORIA = [
  "zap",
  "droplet",
  "wifi",
  "shopping-cart",
  "home",
  "phone",
  "receipt",
  "flame",
  "car",
  "fuel",
  "heart-pulse",
  "graduation-cap",
  "credit-card",
  "tv",
  "baby",
  "paw-print",
  "shield",
  "wrench",
] as const;
export type IconeCategoria = (typeof ICONES_CATEGORIA)[number];

export const CORES_CATEGORIA = [
  "#f59e0b",
  "#0ea5e9",
  "#7c3aed",
  "#16a34a",
  "#1e1b6b",
  "#db2777",
  "#64748b",
  "#ea580c",
  "#0891b2",
  "#6a24f5",
  "#dc2626",
  "#4f46e5",
] as const;
