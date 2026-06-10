import { useEffect, useState } from "react";

type DockItem<T extends string> = {
  id: T;
  label: string;
  compactLabel?: string;
};

export function FloatingTabDock<T extends string>({
  items,
  activeTab,
  onSelect,
  ariaLabel
}: {
  items: Array<DockItem<T>>;
  activeTab: T;
  onSelect: (tab: T) => void;
  ariaLabel: string;
}) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    function handleScroll() {
      const nextScrollY = window.scrollY;

      if (nextScrollY <= 24) {
        setExpanded(true);
      } else if (nextScrollY < previousScrollY) {
        setExpanded(true);
      } else if (nextScrollY > previousScrollY) {
        setExpanded(false);
      }

      previousScrollY = nextScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      aria-label={ariaLabel}
      className={`floating-tab-dock${expanded ? " expanded" : " compact"}`}
    >
      <div className="floating-tab-dock-track">
        {items.map((item) => (
          <button
            key={item.id}
            className={`floating-tab-dock-button${activeTab === item.id ? " active" : ""}`}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="floating-tab-dock-label">{item.label}</span>
            <span className="floating-tab-dock-compact-label">
              {item.compactLabel ?? item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
