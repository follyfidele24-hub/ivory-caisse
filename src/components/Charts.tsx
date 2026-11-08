import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { fmtF } from "../lib/format";

ChartJS.register(
  LineElement,
  PointElement,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

ChartJS.defaults.font.family = '"Inter Variable", Inter, sans-serif';

/* Couleurs lues dans le thème actif (sombre / clair) */
const cssVar = (n: string, fb: string) =>
  (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue(n).trim()) || fb;
const rgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const tokens = () => {
  const light = document.documentElement.dataset.mode === "light";
  return {
    light,
    muted: cssVar("--color-muted", "#92929f"),
    panel: cssVar("--color-panel", "#121218"),
    panel2: cssVar("--color-panel2", "#1a1a23"),
    ink: cssVar("--color-ink", "#0a0a0e"),
    cream: cssVar("--color-cream", "#f7f3ec"),
    mint: cssVar("--color-mint", "#22c98d"),
    rose: cssVar("--color-rose", "#f5516c"),
    grid: light ? "rgba(10,10,14,0.07)" : "rgba(255,255,255,0.05)",
    edge: light ? "rgba(10,10,14,0.1)" : "rgba(255,255,255,0.08)",
  };
};

const TOOLTIP = {
  backgroundColor: "#1a1a23",
  titleColor: "#f7f3ec",
  bodyColor: "#f7f3ec",
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  padding: 12,
  titleFont: { family: '"Bricolage Grotesque Variable", sans-serif', size: 13, weight: 700 as const },
  bodyFont: { family: '"Inter Variable", sans-serif', size: 12 },
  cornerRadius: 12,
  displayColors: false,
  callbacks: {
    label: (ctx: { parsed: { y?: number | null }; label: string }) =>
      `${ctx.label} : ${fmtF(ctx.parsed.y ?? 0)}`,
  },
};

/** Ventes vs dépenses — courbe aire (30 jours / 7 jours) */
export function TrendChart({
  labels,
  sales,
  expenses,
}: {
  labels: string[];
  sales: number[];
  expenses: number[];
}) {
  const T = tokens();
  ChartJS.defaults.color = T.muted;
  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Ventes",
        data: sales,
        borderColor: T.mint,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
          g.addColorStop(0, rgba(T.mint, 0.34));
          g.addColorStop(1, rgba(T.mint, 0));
          return g;
        },
        borderWidth: 2.5,
        fill: true,
        tension: 0.38,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: T.mint,
        pointHoverBorderColor: T.panel,
        pointHoverBorderWidth: 2,
      },
      {
        label: "Dépenses",
        data: expenses,
        borderColor: T.rose,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
          g.addColorStop(0, rgba(T.rose, 0.22));
          g.addColorStop(1, rgba(T.rose, 0));
          return g;
        },
        borderWidth: 2,
        borderDash: [5, 4],
        fill: true,
        tension: 0.38,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: T.rose,
        pointHoverBorderColor: T.panel,
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: { ...TOOLTIP, backgroundColor: T.panel2, titleColor: T.cream, bodyColor: T.cream, borderColor: T.edge } },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 10, weight: 600 }, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        grid: { color: T.grid },
        border: { display: false },
        ticks: {
          font: { size: 10 },
          callback: (v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)),
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}

/** Répartition des dépenses par catégorie — anneau */
export function CategoryDonut({ labels, values }: { labels: string[]; values: number[] }) {
  const T = tokens();
  ChartJS.defaults.color = T.muted;
  const COLORS = T.light
    ? [cssVar("--color-brand", "#ff7a1a"), T.mint, T.rose, "#0284c7", "#b45309", "#7c3aed"]
    : [cssVar("--color-brand", "#ff7a1a"), T.mint, T.rose, "#1dc4f2", "#ffb15c", "#a78bfa"];

  const data: ChartData<"doughnut"> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
        borderColor: T.panel,
        borderWidth: 3,
        hoverOffset: 8,
        hoverBorderColor: T.panel,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "66%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 9,
          boxHeight: 9,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 14,
          font: { size: 11, weight: 600 },
        },
      },
      tooltip: {
        ...TOOLTIP,
        backgroundColor: T.panel2,
        titleColor: T.cream,
        bodyColor: T.cream,
        borderColor: T.edge,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            `${ctx.label} : ${fmtF(ctx.parsed)}`,
        },
      },
    },
  };

  return <Doughnut data={data} options={options} />;
}
