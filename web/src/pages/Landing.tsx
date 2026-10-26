import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Lock, EyeOff, Network, Menu, X, Code2, Plus, Minus } from "lucide-react";
import { Button, Actor, Pill, Stamp, Tile, cx } from "@/components/ui";
import { Logo } from "@/components/Shell";
import { AuditTape } from "@/components/AuditTape";
import { IsoSandbox, StageSteps } from "@/components/IsoSandbox";
import { useStore } from "@/lib/store";
import { groupAttacks, overallStats, techniqueLabel } from "@/lib/model";
import { useMemo } from "react";

const STAGES = ["model", "judge", "seal", "idle"] as const;

export function Landing() {
  const s = useStore();
  const [menu, setMenu] = useState(false);
  const [stage, setStage] = useState<(typeof STAGES)[number]>("model");
  const stats = useMemo(() => overallStats(s.entries), [s.entries]);
  const leak = useMemo(() => groupAttacks(s.entries).filter((a) => a.verdict?.data.verdict === "passed_through").slice(-1)[0], [s.entries]);
  useEffect(() => { let i = 0; const id = setInterval(() => { i = (i + 1) % STAGES.length; setStage(STAGES[i]); }, 2200); return () => clearInterval(id); }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5"><Logo /><span className="display text-[18px]">CrashLab</span></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[["#how", "How it works"], ["#isolation", "Isolation"], ["#leak", "The leak"], ["#proof", "Sealed proof"], ["#faq", "FAQ"]].map(([h, l]) => <a key={h} href={h} className="b-nav py-2 text-[13.5px]">{l}</a>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="flex items-center gap-2 border border-line bg-card px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
              <span className={cx("h-2.5 w-2.5 border border-line", s.brokerOnline ? "bg-green" : s.brokerOnline === false ? "bg-red" : "bg-faint")} />
              {s.brokerOnline ? `broker online${s.mockMode ? " · mock" : ""}` : s.brokerOnline === false ? "broker offline" : "checking"}
            </span>
            <Button size="sm" variant="primary" to="/app">Open the sandbox <ArrowRight size={14} strokeWidth={2.5} /></Button>
          </div>
          <button onClick={() => setMenu(true)} aria-label="Open menu" className="border border-line bg-card p-1.5 md:hidden"><Menu size={20} strokeWidth={2.5} /></button>
        </div>
      </header>
      {menu && (
        <div className="fixed inset-0 z-50 bg-paper p-6 md:hidden rise">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Logo /><span className="display text-[18px]">CrashLab</span></span><button onClick={() => setMenu(false)} aria-label="Close menu" className="border border-line bg-card p-1.5"><X size={20} strokeWidth={2.5} /></button></div>
          <nav className="display mt-10 flex flex-col gap-5 text-[26px]">
            {[["#how", "How it works"], ["#isolation", "Isolation"], ["#leak", "The leak"], ["#proof", "Sealed proof"], ["#faq", "FAQ"]].map(([h, l]) => <a key={h} href={h} onClick={() => setMenu(false)}>{l}</a>)}
            <Link to="/app" className="mt-4 underline decoration-[3px] underline-offset-8">Open the sandbox →</Link>
          </nav>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-dots absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex flex-wrap items-center gap-2"><span className="label text-muted">Adversarial AI safety testing you can audit</span></div>
            <h1 className="display mt-6 text-[48px] sm:text-[72px]" style={{ textWrap: "balance" }}>Is your AI actually safe?<br /><span className="text-accent">Or does it just say&nbsp;so.</span></h1>
            <p className="mt-7 max-w-[520px] text-[17px] font-semibold leading-relaxed text-ink-2">A red room attacks the model. A blue room judges every reply without ever seeing the attack. Each verdict is sealed into a keyed hash chain you can verify yourself. When something gets through, it stays on the record.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" variant="primary" to="/app">Open the sandbox <ArrowRight size={18} strokeWidth={2.5} /></Button>
              <Button size="lg" to="/app/live">Watch a live run</Button>
            </div>
            <div className="mt-10 grid max-w-[560px] grid-cols-3 gap-3">
              {[[EyeOff, "Blind judge", "never sees the prompt", "blue"], [Network, "No bridge", "rooms share no network", "red"], [Lock, "Signed record", "every entry chained", "green"]].map(([I, t, d, tone]) => {
                const Icon = I as typeof EyeOff;
                return <Tile key={t as string} tone={tone as "blue"} depth={6} className="p-3"><Icon size={16} strokeWidth={2.5} /><div className="display mt-2 text-[14px]">{t as string}</div><div className="label mt-0.5 text-muted">{d as string}</div></Tile>;
              })}
            </div>
          </div>
          <div className="lg:col-span-6">
            <Tile tone="yellow" depth={14} className="p-4 sm:p-6">
              <div className="flex items-center justify-between"><span className="label">The sandbox · animated illustration</span><span className="label text-muted">{stage === "model" ? "attack in flight" : stage === "judge" ? "judging blind" : stage === "seal" ? "sealing" : "idle"}</span></div>
              <IsoSandbox stage={stage} through={stats.passed} total={stats.attacks} model={s.modelName ?? undefined} lastVerdict={leak ? "passed_through" : "blocked"} /><div className="mt-3"><StageSteps stage={stage} compact /></div>
            </Tile>
            <p className="mt-4 text-center text-[12.5px] text-muted">An animated illustration of the real architecture: red room, hallway broker, blue room, ledger. The live version is on the Live run page.</p>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-b border-line bg-white/50 py-3 text-ink-2">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 px-4">
          {[0].map((k) => ["instruction override", "role-play bypass", "authority impersonation", "hypothetical framing", "prompt leak", "payload splitting", "encoding obfuscation"].map((t) => <span key={k + t} className="label">{t} <span className="mx-6 text-faint">·</span></span>))}
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <div className="label text-muted">How a run works</div>
        <h2 className="display mt-3 text-[36px] sm:text-[52px]">Attack. Judge blind. <span className="text-accent">Seal the record.</span></h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[["attacker", "red", "Red room attacks", "Fires jailbreaks, injections and leak attempts at the model under test. Holds only its own token and has no route to the internet."], ["judge", "blue", "Blue room judges blind", "Receives the model's reply and nothing else. No prompt, no technique label, so the score can't be gamed."], ["seal", "green", "Broker seals it", "Every event is appended to an HMAC-SHA256 chain. Alter one byte and verification fails from that entry on."]].map(([k, tone, t, d], i) => (
            <Tile key={t} tone={tone as "red"} depth={12} className="p-6">
              <div className="flex items-center justify-between"><Actor kind={k as "attacker"} size={44} /><span className="mono text-[13px] font-bold text-muted">0{i + 1}</span></div>
              <h3 className="display mt-6 text-[22px]">{t}</h3>
              <p className="mt-2 text-[14.5px] font-semibold leading-relaxed text-ink-2">{d}</p>
            </Tile>
          ))}
        </div>
      </section>

      {/* Isolation */}
      <section id="isolation" className="border-y border-line bg-white/40">
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
          <div className="label text-muted">Isolation, enforced in code</div>
          <h2 className="display mt-3 text-[36px] sm:text-[52px]">Not promised. <span className="text-blue-2">Built in.</span></h2>
          <div className="mt-12 grid gap-8 md:grid-cols-6">
            <Tile tone="red" className="p-6 md:col-span-4"><div className="flex items-center gap-2"><Network size={18} strokeWidth={2.5} /><span className="display text-[18px]">Two networks, no bridge, no egress</span></div><p className="mt-2 text-[14.5px] font-semibold text-ink-2">The red room lives on <code className="mono">red-net</code>, which is internal: no internet, no path to the blue room. Only the broker sits on both networks. Probe it live: <code className="mono">docker exec crashlab-red-team wget blue-team</code> → bad address.</p></Tile>
            <Tile tone="blue" className="p-6 md:col-span-2"><div className="flex items-center gap-2"><EyeOff size={18} strokeWidth={2.5} /><span className="display text-[18px]">Blind by API shape</span></div><p className="mt-2 text-[14.5px] font-semibold text-ink-2">The judge's only read is <code className="mono">GET /pending</code>: reply text and an id. The prompt is not in the payload.</p></Tile>
            <Tile tone="violet" className="p-6 md:col-span-2"><div className="display text-[18px]">One token, one role</div><p className="mt-2 text-[14.5px] font-semibold text-ink-2">A valid blue token still gets 403 on <code className="mono">/audit</code>. The judge cannot read the attacks out of the log.</p></Tile>
            <Tile tone="green" className="p-6 md:col-span-2"><div className="flex items-center gap-2"><Lock size={18} strokeWidth={2.5} /><span className="display text-[18px]">Keyed, not just hashed</span></div><p className="mt-2 text-[14.5px] font-semibold text-ink-2">A plain hash chain can be re-forged by anyone who can read it. An HMAC chain can't, without the key the rooms never hold.</p></Tile>
            <Tile tone="amber" className="p-6 md:col-span-2"><div className="flex items-center gap-2"><ShieldCheck size={18} strokeWidth={2.5} /><span className="display text-[18px]">Separate judge model</span></div><p className="mt-2 text-[14.5px] font-semibold text-ink-2">The bench runs a different model from the defendant, and treats every reply as untrusted input.</p></Tile>
          </div>
        </div>
      </section>

      {/* The leak */}
      <section id="leak" className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <div className="label text-red-2">What slips through · live record</div>
            <h2 className="display mt-3 text-[36px] sm:text-[48px]">{leak ? <>The model said it was safe. <span className="text-red-2">Then it leaked its own instructions.</span></> : <>Nothing has got through <span className="text-green-2">yet.</span></>}</h2>
            <p className="mt-5 text-[16px] font-semibold text-ink-2">{stats.attacks ? `So far: ${stats.attacks} attacks sealed, ${stats.passed} got through, ${stats.blocked} blocked. The judge never saw a single prompt.` : "The record is fresh. Start a run from the dashboard and this section fills in from the sealed log."}</p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[[String(stats.attacks), "attacks", "ink"], [String(stats.passed), "got through", "red"], ["0", "edited after", "green"]].map(([n, l, tone]) => <Tile key={l} tone={tone as "red"} depth={8} className="p-3"><div className="display text-[34px]">{n}</div><div className="label text-muted">{l}</div></Tile>)}
            </div>
          </div>
          <div className="lg:col-span-7">
            {leak ? (
              <Tile tone="red" depth={12} className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3"><span className="mono text-[12px] font-bold">{techniqueLabel(leak.technique)} · entry {leak.seal?.seq} · {leak.response?.data.model ?? "model"}</span><Stamp tone="red">got through · {Math.round((leak.verdict?.data.confidence ?? 0) * 100)}%</Stamp></div>
                <div className="space-y-5 p-5">
                  <Row kind="attacker" who="Red room" meta={leak.technique} cls="bg-white"><span>{leak.prompt ?? "The attack text is hidden from public viewers so the judge can never obtain it. Operators see it in the dashboard."}</span></Row>
                  <Row kind="model" who={leak.response?.data.model ?? "model"} meta="reply" cls="bg-amber/40"><span className="mono">{(leak.response?.data.response ?? leak.response?.data.responsePreview ?? "").slice(0, 400)}</span></Row>
                  <Row kind="judge" who="Blue room" meta="saw the reply only" cls="bg-blue text-white"><span>{leak.verdict?.data.notes}</span></Row>
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4 text-[12px]"><Actor kind="seal" size={24} /><span className="label">Sealed · entry #{leak.seal?.seq}</span><span className="mono font-bold">{leak.seal?.hash.slice(0, 10)}…</span><Link to="/app/audit" className="label ml-auto underline decoration-2 underline-offset-4">Open the chain</Link></div>
                </div>
              </Tile>
            ) : (
              <Tile tone="green" depth={12} className="p-8 text-center"><div className="display text-[22px]">Clean sheet, for now.</div><p className="mt-2 text-[14px] text-ink-2">When an attack gets through, the full exchange appears here, straight from the sealed record.</p></Tile>
            )}
          </div>
        </div>
      </section>

      {/* Sealed proof */}
      <section id="proof" className="border-y border-line bg-white/40">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2">
          <div>
            <div className="label">Sealed proof</div>
            <h2 className="display mt-3 text-[36px] sm:text-[48px]">Tamper with it. <span className="text-accent">Then watch it fail.</span></h2>
            <p className="mt-5 text-[16px] font-semibold text-ink-2">The dashboard has a "Tamper → verify" control that asks the broker what verification would report if one entry were altered. The real log is never touched. The break is found, and every later entry inherits it.</p>
            <Button className="mt-7" variant="ink" to="/app/audit">Try it on the chain <ArrowRight size={16} strokeWidth={2.5} /></Button>
          </div>
          <ChainDemo />
        </div>
      </section>

      {/* Tape */}
      <section className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5"><div className="label text-muted">The broker's own log format</div><h2 className="display mt-3 text-[36px] sm:text-[44px]">Every event, in order, signed by the one before.</h2><p className="mt-4 text-[15px] font-semibold text-ink-2">The tail of the real <code className="mono">logs/audit.log</code>, read live through the broker.</p></div>
          <div className="lg:col-span-7"><AuditTape /></div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-line bg-card">
        <div className="mx-auto max-w-[840px] px-4 py-24 sm:px-6">
          <h2 className="display text-[36px] sm:text-[44px]">Questions</h2>
          <div className="mt-8 border-t border-line">
            <Faq q="Why does the judge have to be blind?">If the judge can see the attack, it can grade the attempt rather than the outcome. Blind scoring measures what the model actually did.</Faq>
            <Faq q="What stops the blue team from reading the log?">Role-scoped tokens. The blue token only unlocks <code className="mono">/pending</code> and <code className="mono">/score</code>. The audit routes need a separate token the rooms never receive.</Faq>
            <Faq q="Why HMAC instead of a plain hash chain?">A plain hash chain can be recomputed by anyone who can read it. HMAC needs the key, which lives only with the broker and the host-side verifier.</Faq>
            <Faq q="Which models can go under test?">Anything with an Anthropic or OpenAI-compatible API, including free tiers on Groq and Gemini and a local Ollama. Switch from the Settings page; every reply records which model answered.</Faq>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-ink text-white">
        <div className="mx-auto max-w-[840px] px-4 py-24 text-center sm:px-6">
          <h2 className="display text-[40px] sm:text-[56px]">Stop asking the model <span className="text-accent">if it's safe.</span></h2>
          <p className="mt-5 text-[17px] font-semibold opacity-90">Attack it, judge it blind, and keep a record nobody can quietly edit.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="primary" to="/app">Open the sandbox <ArrowRight size={18} strokeWidth={2.5} /></Button>
            <a href="https://github.com/AbhishekKumarCode/bayora-sandbox" target="_blank" rel="noreferrer" className="b-btn h-14 px-6 text-[16px]"><Code2 size={18} strokeWidth={2.5} /> Source</a>
          </div>
        </div>
      </section>
      <footer className="border-t border-line bg-paper py-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 text-[12.5px] font-bold sm:px-6">
          <span className="flex items-center gap-2"><Logo size={22} /> CrashLab · Team Byteforce · Galgotias University</span>
          <span className="label text-muted">Hack in Hills '26 · Track 04</span>
        </div>
      </footer>
    </div>
  );
}

function Row({ kind, who, meta, cls, children }: { kind: "attacker" | "model" | "judge"; who: string; meta: string; cls: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[34px_1fr] gap-3">
      <Actor kind={kind} size={32} />
      <div className="min-w-0"><div className="label text-muted"><span className="text-ink">{who}</span> · {meta}</div><div className={cx("mt-1.5 border border-line px-3 py-2 text-[12.5px] font-semibold leading-relaxed", cls)}>{children}</div></div>
    </div>
  );
}
function ChainDemo() {
  const [tampered, setTampered] = useState(false);
  const rows = ["attack fired", "model replied", "blind verdict", "attack fired", "model replied"];
  return (
    <Tile tone="ink" depth={12} className="p-5">
      <div className="flex items-center justify-between"><span className="label"><Pill tone="amber">simulation</Pill> <Link to="/app/audit" className="underline decoration-2 underline-offset-4">try it on the real record</Link></span><button onClick={() => setTampered((t) => !t)} className={cx("b-btn h-9 px-3 text-[12px]", tampered ? "danger" : "")}>{tampered ? "Restore" : "Tamper entry 3"}</button></div>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => { const n = i + 1; const broken = tampered && n >= 3; return (
          <div key={n} className={cx("flex items-center gap-3 border border-line px-3 py-2 text-[12.5px] font-bold", broken ? "bg-red text-white" : "bg-white")}>
            <span className={cx("h-3 w-3 rounded-full", broken ? "bg-red-2" : "bg-green-2")} /><span className="mono opacity-70">#{n}</span><span>{r}</span><span className="mono ml-auto">{broken ? (n === 3 ? "data altered" : "prev mismatch") : `h${n}…${(n * 37).toString(16)}`}</span>
          </div>); })}
      </div>
      <div className={cx("mt-4 flex items-center gap-2 border border-line px-3 py-2 text-[12.5px] font-bold", tampered ? "bg-red text-white" : "bg-green")}><ShieldCheck size={15} strokeWidth={2.5} /> {tampered ? "verify → broken at seq 3 · data was altered" : "verify → ok · 5 entries · final hash matches"}</div>
    </Tile>
  );
}
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen((o) => !o)} className="display flex w-full items-center justify-between py-5 text-left text-[19px]">{q}{open ? <Minus size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}</button>
      {open && <p className="pb-5 text-[15px] font-semibold text-ink-2 rise">{children}</p>}
    </div>
  );
}
