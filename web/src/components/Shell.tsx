import { useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { LayoutGrid, ListChecks, Radio, Library, Link2, Settings2, Menu, X, Plug, Database, GitCompare, RefreshCw, WifiOff, ShieldAlert } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { isLive } from "@/lib/model";
import { Button, Card, Pill, cx } from "./ui";
import { getBrokerUrl } from "@/lib/api";
import { ConnectDialog } from "./ConnectDialog";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/app/live", label: "Live run", icon: Radio },
  { to: "/app/audit", label: "Audit chain", icon: Link2 },
  { to: "/app/runs", label: "Runs", icon: ListChecks },
  { to: "/app/library", label: "Attack library", icon: Library },
  { to: "/app/compare", label: "Compare models", icon: GitCompare },
];

export function Shell() {
  const s = useStore();
  const now = useNow(1000);
  const live = isLive(s.entries, now);
  const [open, setOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
  const pageTitle = pathname.match(/^\/app\/runs\/[^/]+/) ? "Run detail" : pathname.startsWith("/app/settings") ? "Settings" : current?.label ?? "Dashboard";
  const sinceLastPoll = s.lastPollAt ? Math.round((now - s.lastPollAt) / 1000) : null;
  // Before the first answer from the broker, never show an empty record as if it were real.
  // Settings stays reachable so the broker address can be changed.
  const gate: "ready" | "loading" | "unreachable" =
    s.source !== "broker" || s.lastPollAt > 0 || pathname.startsWith("/app/settings") ? "ready"
    : s.brokerOnline === false || s.error ? "unreachable" : "loading";

  const nav = (
    <nav className="flex flex-col gap-2">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => cx("b-nav text-[14px]", isActive && "active")}>
          <Icon size={17} strokeWidth={2.5} />
          {label}
          {label === "Live run" && live && <span className="ml-auto h-3 w-3 border border-line bg-red" />}
        </NavLink>
      ))}
    </nav>
  );

  const sourceBlock = (
    <div className="b-card-flat p-3">
      <div className="flex items-center justify-between">
        <div className="label text-muted">Data source</div>
        <span className={cx("h-3 w-3 border border-line", s.brokerOnline ? "bg-green" : s.brokerOnline === false ? "bg-red" : "bg-faint")} title={s.brokerOnline ? "Broker online" : "Broker unreachable"} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        {s.source === "broker" ? <Plug size={16} strokeWidth={2.5} /> : <Database size={16} strokeWidth={2.5} />}
        <div className="display text-[15px]">{s.source === "broker" ? (s.role === "operator" ? "Live · operator" : "Live · visitor") : "Not connected"}</div>
        {s.mockMode && s.source === "broker" && <Pill tone="amber" className="ml-auto">mock</Pill>}
      </div>
      {(s.modelName || s.judgeModel) && (
        <div className="mt-2 space-y-0.5 text-[12px] text-ink-2">
          {s.modelName && <div>Testing <span className="mono font-semibold text-ink">{s.modelName}</span></div>}
          {s.judgeModel && <div>Judge <span className="mono font-semibold text-ink">{s.judgeModel}</span></div>}
        </div>
      )}
      {s.source !== "broker" && <div className="mt-3"><Button size="sm" variant="primary" className="w-full" onClick={() => setConnectOpen(true)}>Connect broker</Button></div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-white/40 px-4 py-5 backdrop-blur-xl lg:flex">
          <Link to="/" className="mb-7 flex items-center gap-2.5 px-1">
            <Logo />
            <span className="display text-[17px]">CrashLab</span>
          </Link>
          {nav}
          <div className="mt-auto space-y-3">
            {sourceBlock}
            <NavLink to="/app/settings" className={({ isActive }) => cx("b-nav text-[14px]", isActive && "active")}>
              <Settings2 size={17} strokeWidth={2.5} /> Settings
            </NavLink>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-white/55 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
              <Link to="/" className="flex items-center gap-2 lg:hidden"><Logo /><span className="display text-[16px]">CrashLab</span></Link>
              <div className="hidden items-center gap-2 lg:flex">
                <span className="label">Sandbox</span><span className="label opacity-50">/</span><span className="display text-[15px]">{pageTitle}</span>
                {s.modelName && <span className="ml-3 hidden rounded-full border border-line bg-white/60 px-2.5 py-0.5 text-[12px] text-ink-2 xl:inline">testing <span className="mono font-semibold text-ink">{s.modelName}</span>{s.judgeModel && <> · judge <span className="mono font-semibold text-ink">{s.judgeModel}</span></>}</span>}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {live && <Pill tone="red" dot className="hidden sm:inline-flex">run in progress</Pill>}
                <div className="hidden items-center gap-2 rounded-full border border-line bg-white/70 py-1 pl-3 pr-1.5 text-[12.5px] font-semibold md:flex" title={getBrokerUrl()}>
                  <span className={cx("h-2.5 w-2.5 border border-line", s.brokerOnline ? "bg-green" : s.brokerOnline === false ? "bg-red" : "bg-faint")} />
                  <span className="text-[12px] font-semibold">
                    {s.brokerOnline === false ? "broker unreachable" : s.source === "broker" ? `${s.role === "operator" ? "operator" : "live"} · ${sinceLastPoll == null ? "…" : sinceLastPoll + "s"}` : s.brokerOnline ? `online${s.mockMode ? " · mock" : ""}` : "checking"}
                  </span>
                  {s.role === "operator"
                    ? <button onClick={s.disconnect} className="b-pill ink cursor-pointer">sign out</button>
                    : <button onClick={() => setConnectOpen(true)} className="b-pill ink cursor-pointer">operator login</button>}
                </div>
                
                <button onClick={() => setOpen(true)} aria-label="Open menu" className="border border-line bg-card p-1.5 lg:hidden"><Menu size={18} strokeWidth={2.5} /></button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {s.source === "broker" && (s.integrity.anchor.state === "changed" || !s.integrity.links.ok) && (
              <div role="alert" className="mb-6 flex flex-wrap items-start gap-3 rounded-[14px] border border-red-2/40 bg-red/20 p-4 text-[13.5px]">
                <ShieldAlert size={20} className="mt-0.5 shrink-0 text-red-2" />
                <div className="min-w-0 flex-1">
                  <div className="display text-[16px] text-red-2">{!s.integrity.links.ok ? "The record's chain structure is inconsistent" : "The record changed since this browser last saw it"}</div>
                  <p className="mt-1 text-ink-2">{!s.integrity.links.ok ? `${s.integrity.links.problems[0].reason} (entry ${s.integrity.links.problems[0].seq}).` : s.integrity.anchor.state === "changed" ? s.integrity.anchor.reason : ""} If the operator reset or restored the log on purpose, accept the new record. Otherwise treat the record as untrustworthy.</p>
                </div>
                <div className="flex gap-2">
                  <Link to="/app/audit" className="b-btn h-9 px-3 text-[13px]">Open the audit chain</Link>
                  {s.integrity.anchor.state === "changed" && <button onClick={s.acceptRecord} className="b-btn primary h-9 px-3 text-[13px]">Accept the new record</button>}
                </div>
              </div>
            )}
            {gate === "ready" ? <Outlet /> : <BrokerGate state={gate} onRetry={s.recheckHealth} error={s.error} url={getBrokerUrl()} />}
          </main>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[290px] flex-col border-r border-line bg-paper px-4 py-5">
            <div className="mb-6 flex items-center justify-between px-1">
              <span className="flex items-center gap-2"><Logo /><span className="display text-[16px]">CrashLab</span></span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="border border-line bg-card p-1.5"><X size={18} strokeWidth={2.5} /></button>
            </div>
            {nav}
            <div className="mt-auto">{sourceBlock}</div>
          </div>
        </div>
      )}

      {connectOpen && <ConnectDialog onClose={() => setConnectOpen(false)} />}
    </div>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center rounded-[9px] bg-accent" style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </svg>
    </span>
  );
}


function BrokerGate({ state, onRetry, error, url }: { state: "loading" | "unreachable"; onRetry: () => Promise<void>; error: string | null; url: string }) {
  const [busy, setBusy] = useState(false);
  if (state === "loading") {
    return (
      <div className="mx-auto max-w-[720px] space-y-4 pt-8" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-[15px] font-semibold text-ink-2"><RefreshCw size={16} className="animate-spin" /> Loading the sealed record…</div>
        <div className="skeleton h-12 w-3/4" /><div className="skeleton h-5 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-3"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div>
      </div>
    );
  }
  return (
    <Card className="mx-auto mt-8 max-w-[720px] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber/50 text-amber-2"><WifiOff size={22} /></div>
      <h1 className="display mt-4 text-[26px]">The broker isn't reachable right now</h1>
      <p className="mx-auto mt-2 max-w-[520px] text-[14.5px] text-ink-2">This dashboard reads the sealed record from a broker that runs on the team's own machine, so it can be offline for a few minutes (a restart, a network change). The record itself is safe on disk. This page keeps retrying by itself.</p>
      {error && <p className="mono mx-auto mt-3 max-w-[560px] break-words text-[12px] text-muted">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={async () => { setBusy(true); try { await onRetry(); } finally { setBusy(false); } }} disabled={busy}><RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "Checking…" : "Try again"}</Button>
        <Button to="/">How it works</Button>
        <Button variant="ghost" to="/app/settings">Change broker address</Button>
      </div>
      <p className="mono mt-4 text-[11.5px] text-muted">trying {url}</p>
    </Card>
  );
}
