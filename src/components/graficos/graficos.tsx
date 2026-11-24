"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { nomeMesCurto } from "@/lib/datas";
import { formatarMoeda } from "@/lib/dinheiro";

const ROXO = "#6a24f5";
const ROXO_CLARO = "#bea3ff";
const VERDE = "#16a34a";
const VERMELHO = "#e11d48";

const moedaCurta = (centavos: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(centavos / 100);

function DicaMoeda({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-marinho-100 bg-white px-3 py-2 text-xs shadow-flutuante">
      {label && <p className="mb-1 font-bold text-marinho-900">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <strong className="text-marinho-900">{formatarMoeda(Number(p.value ?? 0))}</strong>
        </p>
      ))}
    </div>
  );
}

/** Dashboard: pagas × a pagar nos últimos meses. */
export function GraficoMensal({ dados }: { dados: { mes: string; pagas: number; aPagar: number }[] }) {
  const linhas = dados.map((d) => ({ ...d, rotulo: nomeMesCurto(d.mes) }));
  return (
    <div className="h-52 w-full min-w-0" role="img" aria-label="Gráfico de contas pagas e a pagar por mês">
      <ResponsiveContainer>
        <BarChart data={linhas} barGap={4} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eceaf6" />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
          <YAxis hide />
          <Tooltip content={<DicaMoeda />} cursor={{ fill: "#f5f1ff" }} />
          <Bar dataKey="pagas" name="Pagas" fill={ROXO} radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar dataKey="aPagar" name="A pagar" fill={ROXO_CLARO} radius={[6, 6, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Relatório: por mês, empilhando pagas / pendentes / vencidas. */
export function GraficoPorMes({ dados }: { dados: { mes: string; pagas: number; pendentes: number; vencidas: number }[] }) {
  const linhas = dados.map((d) => ({ ...d, rotulo: `${nomeMesCurto(d.mes)}/${d.mes.slice(2, 4)}` }));
  return (
    <div className="h-64 w-full min-w-0" role="img" aria-label="Gráfico de valores por mês">
      <ResponsiveContainer>
        <BarChart data={linhas} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eceaf6" />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tickFormatter={moedaCurta} tickLine={false} axisLine={false} width={70} tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<DicaMoeda />} cursor={{ fill: "#f5f1ff" }} />
          <Bar dataKey="pagas" name="Pagas" stackId="a" fill={VERDE} maxBarSize={36} />
          <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill={ROXO} maxBarSize={36} />
          <Bar dataKey="vencidas" name="Vencidas" stackId="a" fill={VERMELHO} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Relatório: distribuição por categoria (rosca). */
export function GraficoCategorias({ dados }: { dados: { nome: string; cor: string; soma: number }[] }) {
  return (
    <div className="h-64 w-full min-w-0" role="img" aria-label="Gráfico de valores por categoria">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={dados} dataKey="soma" nameKey="nome" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {dados.map((d) => (
              <Cell key={d.nome} fill={d.cor} />
            ))}
          </Pie>
          <Tooltip content={<DicaMoeda />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
