import { motion } from "framer-motion";
import { BarChart3, LayoutDashboard, Package, Plus, Users } from "lucide-react";

export type Tab = "home" | "stock" | "debts" | "reports" | "settings";

const ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Caisse", icon: LayoutDashboard },
  { id: "stock", label: "Stock", icon: Package },
  { id: "debts", label: "Crédits", icon: Users },
  { id: "reports", label: "Rapports", icon: BarChart3 },
];

export default function BottomNav({
  tab,
  onTab,
  onAdd,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
      <div className="border-t border-line bg-ink/85 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="relative flex items-end justify-between">
          {ITEMS.slice(0, 2).map((it) => (
            <NavButton key={it.id} item={it} active={tab === it.id} onClick={() => onTab(it.id)} />
          ))}

          {/* FAB */}
          <div className="relative -top-5 flex w-20 justify-center">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(12);
                onAdd();
              }}
              className="tap flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-brand to-deep text-white shadow-[0_16px_36px_-8px_rgba(255,122,26,0.75)] ring-4 ring-ink"
              aria-label="Nouveau mouvement"
            >
              <Plus size={30} strokeWidth={2.6} />
            </motion.button>
          </div>

          {ITEMS.slice(2).map((it) => (
            <NavButton key={it.id} item={it} active={tab === it.id} onClick={() => onTab(it.id)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: Tab; label: string; icon: typeof LayoutDashboard };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className="tap relative flex w-20 flex-col items-center gap-1 py-2">
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute -top-1 h-8 w-14 rounded-full bg-brand/15"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Icon size={20} className={`relative z-10 transition-colors ${active ? "text-brand2" : "text-muted"}`} />
      <span className={`relative z-10 text-[10px] font-bold ${active ? "text-brand2" : "text-muted"}`}>
        {item.label}
      </span>
    </button>
  );
}
