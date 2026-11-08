import { CURRENCIES } from "../lib/currency";

export default function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CURRENCIES.map((c) => {
        const active = value === c.code;
        return (
          <button
            key={c.code}
            onClick={() => {
              onChange(c.code);
              if (navigator.vibrate) navigator.vibrate(6);
            }}
            className={`tap btn-press flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition-colors ${
              active ? "border-brand/50 bg-brand/15" : "border-line bg-panel2"
            }`}
          >
            <div className="min-w-0">
              <p className={`text-sm font-bold ${active ? "text-brand2" : ""}`}>{c.code}</p>
              <p className="truncate text-[10px] text-muted">{c.label}</p>
            </div>
            <span className={`ml-2 shrink-0 font-display text-sm font-extrabold ${active ? "text-brand2" : "text-muted"}`}>
              {c.symbol}
            </span>
          </button>
        );
      })}
    </div>
  );
}
