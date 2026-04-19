import { useEffect } from "react";
import { use1800DemoStore } from "../store/1-800-demo-store";

export function SourcesPanel() {
  const tab = use1800DemoStore((s) => s.tab);
  const setTab = use1800DemoStore((s) => s.setTab);
  const open = tab === "sources";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTab("play");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setTab]);

  return (
    <aside
      className={`td-sources-panel ${open ? "td-sources-panel--open" : ""}`}
      aria-hidden={!open}
      aria-label="Sources"
    >
      <div className="td-sources-header">
        <h2>Sources</h2>
        <button
          type="button"
          onClick={() => setTab("play")}
          aria-label="Close sources"
          className="td-sources-close"
        >
          ×
        </button>
      </div>
      <ul className="td-sources-list">
        <li>Source #1 — coming soon</li>
        <li>Source #2 — coming soon</li>
        <li>Source #3 — coming soon</li>
      </ul>
    </aside>
  );
}
