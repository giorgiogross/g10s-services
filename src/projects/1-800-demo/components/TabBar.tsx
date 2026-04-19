import { use1800DemoStore } from "../store/1-800-demo-store";

export function TabBar() {
  const tab = use1800DemoStore((s) => s.tab);
  const setTab = use1800DemoStore((s) => s.setTab);

  return (
    <nav role="tablist" aria-label="Demo sections" className="td-tabbar">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "play"}
        onClick={() => setTab("play")}
        className="td-tab"
      >
        <span className="td-tab-icon" aria-hidden="true">▶</span>
        Play
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "sources"}
        onClick={() => setTab("sources")}
        className="td-tab"
      >
        <span className="td-tab-icon" aria-hidden="true">❖</span>
        Sources
      </button>
      <a
        role="tab"
        href="/"
        aria-selected={false}
        className="td-tab"
      >
        <span className="td-tab-icon" aria-hidden="true">◆</span>
        g10s
      </a>
    </nav>
  );
}
