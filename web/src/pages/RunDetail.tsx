import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, ShieldCheck, ShieldAlert } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { deriveRuns, fmtDate, fmtTime, fmtDuration } from "@/lib/model";
import { Button, Card, Pill, Hash, Empty, Heading, cx } from "@/components/ui";
import { AttackCard } from "@/components/Timeline";
import type { VerifyResult } from "@/lib/api";

export function RunDetail() {
  const { id } = useParams();
  const s = useStore();
  const now = useNow(2000);
  const runs = useMemo(() => deriveRuns(s.entries, now), [s.entries, now]);
  const run = runs.find((r) => r.id === id);
  const [filter, setFilter] = useState<"all" | "passed_through">("all");
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  if (!run) return <Empty title="Run not found" desc="It may belong to a different data source." action={<Button to="/app/runs">Back to runs</Button>} />;
  const shown = run.attacks.filter((a) => filter === "all" || a.verdict?.data.verdict === filter);
  const entries = s.entries.filter((e) => e.seq >= run.seqFrom && e.seq <= run.seqTo);
  async function doVerify() { setBusy(true); try { setVerify(await s.verify()); } finally { setBusy(false); } }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ run: { id: run!.id, startedAt: run!.startedAt, endedAt: run!.endedAt }, entries }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `crashlab-${run!.id}-evidence.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      <div>
        <Link to="/app/runs" className="label inline-flex items-center gap-1 underline decoration-2 underline-offset-4"><ArrowLeft size={14} /> All runs</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-[34px] sm:text-[44px]">Run {run.index}: <span className={cx(run.passed ? "text-red-2" : "text-green-2")}>{run.passed ? `${run.passed} of ${run.attacks.length} got through` : `all ${run.attacks.length} blocked`}</span></h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink-2">{fmtDate(run.startedAt)}, {fmtTime(run.startedAt)} · took {fmtDuration(run.startedAt, run.endedAt)} · {run.blocked} blocked, {run.ambiguous} unsure{run.pending ? `, ${run.pending} judging` : ""} {run.live ? <Pill tone="red" dot>live</Pill> : <Pill tone="green">sealed</Pill>}</p>
          </div>
          <div className="flex gap-3"><Button onClick={exportJson}><Download size={15} strokeWidth={2.5} /> Export</Button><Button variant="primary" onClick={doVerify} disabled={busy}>{busy ? "Checking…" : "Verify record"}</Button></div>
        </div>
      </div>
      {verify && <div className={cx("flex items-center gap-3 border border-line px-4 py-3 text-[13.5px] font-semibold rise", verify.ok ? "bg-green" : "bg-red text-white")}>{verify.ok ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}{verify.ok ? <>Whole record intact: all {verify.count} entries recompute to the same hashes.</> : <>Record broken at entry {verify.brokenAtSeq}: {verify.reason}.</>}</div>}
      <section>
        <Heading title="Every attack in this run" desc="Sent, replied, judged, sealed." right={<div className="flex border border-line bg-card"><button onClick={() => setFilter("all")} className={cx("label px-3 py-2", filter === "all" && "bg-white/80")}>All {run.attacks.length}</button><button onClick={() => setFilter("passed_through")} className={cx("label border-l border-line px-3 py-2", filter === "passed_through" && "bg-red text-white")}>Through {run.passed}</button></div>} />
        <div className="space-y-6">{shown.map((a) => <AttackCard key={a.attackId} a={a} index={run.attacks.indexOf(a) + 1} />)}{shown.length === 0 && <Card flat className="p-8 text-center text-[13px] font-semibold">Nothing got through in this run.</Card>}</div>
      </section>
      <p className="text-[12.5px] font-semibold text-ink-2">Entries {run.seqFrom} to {run.seqTo} of the record. First hash <Hash value={entries[0]?.hash ?? ""} />, last hash <Hash value={entries[entries.length - 1]?.hash ?? ""} />. The judge only ever received the reply text, never the prompt; the broker enforces that, not this page.</p>
    </div>
  );
}
