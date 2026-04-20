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
      <div className="td-sources-inner">
        <div className="td-sources-header">
          <h2>Case Study</h2>
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
          <li>
            <span className="td-sources-label">Artist:</span>{" "}
            <a
              href="https://1-800girls.com/?utm_source=g10s"
              target="_blank"
              rel="noreferrer noopener"
            >
              1-800 GIRLS
            </a>
          </li>
          <li>
            <span className="td-sources-label">Artist:</span> Hella
          </li>
          <li>
            Artwork inspired by{" "}
            <a
              href="https://1-800girls.lnk.to/clarencepier"
              target="_blank"
              rel="noreferrer noopener"
            >
              official clarence pier artwork
            </a>
            .
          </li>
          <li>
            <a href="/">g10s</a> equips artists, brands and creators with
            custom-made tech to build deeper connections with their audiences.
          </li>
          <li className="td-sources-disclaimer">
            <strong>DISCLAIMER:</strong> This page is a case study of how a
            custom release experience can be done, and is{" "}
            <em>not</em> an official collaboration with the artists. If you
            own the rights to any of the material displayed and want it
            removed, please send a short note to{" "}
            <a href="mailto:lab@g10s.xyz">lab@g10s.xyz</a> or on Instagram to{" "}
            <a
              href="https://instagram.com/g10s.xyz"
              target="_blank"
              rel="noreferrer noopener"
            >
              @g10s.xyz
            </a>
            .
          </li>
        </ul>
      </div>
    </aside>
  );
}
