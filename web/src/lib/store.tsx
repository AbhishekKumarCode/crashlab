import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ForbiddenError, VIEWER_TOKEN, getBrokerUrl, clearToken, getAudit, getConfig, getHealth, getStoredToken, healStaleBrokerUrl, storeToken, triggerRun as apiTriggerRun, triggerCompare as apiTriggerCompare, verifyChain as apiVerify, type AuditEntry, type VerifyResult } from "./api";
import { checkLinks, checkAnchor, loadAnchor, saveAnchor, type Anchor, type AnchorStatus, type LinkCheck } from "./integrity";

export type Source = "demo" | "broker";

export type Role = "operator" | "viewer";
type Store = {
  source: Source;
  role: Role;                  // operator = audit token entered; viewer = baked public token
  integrity: { links: LinkCheck; anchor: AnchorStatus };  // checks done in this browser, without the broker's key
  acceptRecord: () => void;    // accept the current record as the new reference point
  canRun: boolean;             // may start a run (operators always; visitors when the broker allows it)
  connected: boolean;          // broker + token working
  brokerOnline: boolean | null; // health probe
  mockMode: boolean;
  modelName: string | null;
  judgeModel: string | null;   // parsed from the latest verdict note
  secretMarkers: string[];     // operator only; used to highlight leaks
  entries: AuditEntry[];
  loading: boolean;
  error: string | null;
  lastPollAt: number;
  connect: (token: string, remember?: boolean) => Promise<string | null>; // null = ok, else error message
  recheckHealth: () => Promise<void>;
  disconnect: () => void;
  useDemo: () => void;
  verify: (simulateTamperSeq?: number) => Promise<VerifyResult>;
  triggerRun: (model?: string) => Promise<string>;
  triggerCompare: (models: string[]) => Promise<string>;
};

const Ctx = createContext<Store | null>(null);

const POLL_MS = 2000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<Source>(() => (getStoredToken() || VIEWER_TOKEN ? "broker" : "demo"));
  const [role, setRole] = useState<Role>(() => (getStoredToken() ? "operator" : "viewer"));
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [brokerOnline, setBrokerOnline] = useState<boolean | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [modelName, setModelName] = useState<string | null>(null);
  const [secretMarkers, setSecretMarkers] = useState<string[]>([]);
  const [viewerCanRun, setViewerCanRun] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(() => loadAnchor(getBrokerUrl()));
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPollAt, setLastPollAt] = useState(0);
  const lastCount = useRef(-1);

  useEffect(() => {
    let alive = true;
    healStaleBrokerUrl().finally(() => {
      getHealth().then((h) => { if (alive) { setBrokerOnline(h.ok); setMockMode(h.mockMode); } }).catch(() => alive && setBrokerOnline(false));
      if (getStoredToken() || VIEWER_TOKEN) getConfig().then((c) => { if (alive) { setModelName(c.mockMode ? null : c.model); setSecretMarkers(c.secretMarkers ?? []); setViewerCanRun(Boolean(c.canRun)); } }).catch(() => {});
    });
    const id = setInterval(() => {
      getHealth().then((h) => { if (alive) { setBrokerOnline(h.ok); setMockMode(h.mockMode); } }).catch(() => alive && setBrokerOnline(false));
    }, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const poll = useCallback(async () => {
    try {
      const { entries: next } = await getAudit();
      // only replace state when something changed, so React never re-renders for nothing
      if (next.length !== lastCount.current || (next.length && next[next.length - 1].hash !== entries[entries.length - 1]?.hash)) {
        lastCount.current = next.length;
        setEntries(next);
      }
      setConnected(true);
      setError(null);
      setLastPollAt(Date.now());
    } catch (e) {
      if (e instanceof ForbiddenError) {
        if (getStoredToken()) {
          clearToken();
          setRole("viewer");
          setError(VIEWER_TOKEN ? "The operator token was rejected. Back to read-only viewing." : "The audit token was rejected.");
          if (!VIEWER_TOKEN) { setConnected(false); setSource("demo"); setEntries([]); }
        } else {
          setConnected(false);
          setSource("demo");
          setEntries([]);
          setError("The broker rejected the viewer token.");
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [entries]);

  useEffect(() => {
    if (source !== "broker") return;
    setLoading(true);
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const recheckHealth = useCallback(async () => {
    try { const h = await getHealth(); setBrokerOnline(h.ok); setMockMode(h.mockMode); }
    catch { setBrokerOnline(false); }
    // model name is operator-only, so it needs the audit token
    if (getStoredToken() || VIEWER_TOKEN) {
      try { const c = await getConfig(); setModelName(c.mockMode ? null : c.model); setSecretMarkers(c.secretMarkers ?? []); setViewerCanRun(Boolean(c.canRun)); } catch { /* keep last */ }
    } else {
      setModelName(null);
    }
  }, []);

  const connect = useCallback(async (token: string, remember = false) => {
    storeToken(token.trim(), remember);
    try {
      const { entries: next } = await getAudit();
      lastCount.current = next.length;
      setEntries(next);
      setConnected(true);
      setError(null);
      setSource("broker");
      setRole("operator");
      setLastPollAt(Date.now());
      recheckHealth();
      return null;
    } catch (e) {
      clearToken();
      const msg = e instanceof ForbiddenError
        ? "The broker rejected that token (403). It must be the AUDIT_TOKEN from the broker's .env, not the red or blue token."
        : e instanceof Error ? e.message : String(e);
      setError(msg);
      return msg;
    }
  }, [recheckHealth]);

  // "Disconnect" = drop operator rights. With a viewer token we keep reading live data.
  const disconnect = useCallback(() => {
    clearToken();
    setRole("viewer");
    setError(null);
    if (!VIEWER_TOKEN) { setConnected(false); setSource("demo"); setEntries([]); }
  }, []);

  const useDemo = useCallback(() => {
    setSource("demo");
    setConnected(false);
    setEntries([]);
  }, []);

  const verify = useCallback(async (simulateTamperSeq?: number): Promise<VerifyResult> => {
    if (source === "broker") return apiVerify(simulateTamperSeq);
    throw new Error("Not connected to a broker.");
  }, [source]);

  const guard = useCallback(() => {
    if (source !== "broker") throw new Error("Not connected to a broker.");
  }, [source]);
  const canRun = source === "broker" && (role === "operator" || viewerCanRun);
  const triggerRun = useCallback(async (model?: string) => {
    guard();
    if (!canRun) throw new Error("This broker does not allow visitors to start runs.");
    const r = await apiTriggerRun(role === "operator" ? model : undefined);
    return r.status;
  }, [guard, canRun, role]);
  const triggerCompare = useCallback(async (models: string[]) => {
    guard();
    if (role !== "operator") throw new Error("Comparing models needs the operator token.");
    const r = await apiTriggerCompare(models);
    return r.status;
  }, [guard, role]);

  // Integrity checks that need no key: structure of the chain, and whether the
  // latest entry this browser saw last time is still there, unchanged.
  const links = useMemo(() => checkLinks(entries), [entries]);
  // Not before the first successful load: until then `entries` is just empty, which would look like a wiped record.
  const anchorStatus = useMemo(() => checkAnchor(entries, lastPollAt === 0 ? null : anchor), [entries, anchor, lastPollAt]);
  useEffect(() => {
    if (source !== "broker" || lastPollAt === 0 || entries.length === 0) return;
    if (anchorStatus.state === "changed" || !links.ok) return; // never overwrite the reference with a suspicious record
    const last = entries[entries.length - 1];
    if (!anchor || anchor.seq !== last.seq || anchor.hash !== last.hash) {
      const a = { seq: last.seq, hash: last.hash, at: Date.now() };
      saveAnchor(getBrokerUrl(), a); setAnchor(a);
    }
  }, [entries, source, lastPollAt, anchorStatus.state, links.ok, anchor]);
  const acceptRecord = useCallback(() => {
    const last = entries[entries.length - 1];
    if (!last) { try { localStorage.removeItem(`bayora_anchor:${getBrokerUrl()}`); } catch { /* ignore */ } setAnchor(null); return; }
    const a = { seq: last.seq, hash: last.hash, at: Date.now() };
    saveAnchor(getBrokerUrl(), a); setAnchor(a);
  }, [entries]);
  const integrity = useMemo(() => ({ links, anchor: anchorStatus }), [links, anchorStatus]);

  const judgeModel = useMemo(() => {
    // The last verdict that was produced by an LLM judge names the judge; a single
    // keyword-fallback verdict must not make the header flicker.
    let sawVerdict = false;
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.event !== "blue_team_verdict") continue;
      sawVerdict = true;
      const m = /llm judge \(([^)]+)\)/.exec(e.data.notes ?? "");
      if (m) return m[1];
    }
    return sawVerdict ? "keyword classifier" : null;
  }, [entries]);

  const value = useMemo<Store>(() => ({
    source, role, canRun, integrity, acceptRecord, connected, brokerOnline, mockMode, modelName, judgeModel, secretMarkers, entries, loading, error, lastPollAt,
    connect, disconnect, useDemo, verify, triggerRun, triggerCompare, recheckHealth,
  }), [source, role, canRun, integrity, acceptRecord, connected, brokerOnline, mockMode, modelName, judgeModel, secretMarkers, entries, loading, error, lastPollAt, connect, disconnect, useDemo, verify, triggerRun, triggerCompare, recheckHealth]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export function useNow(tickMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), tickMs); return () => clearInterval(id); }, [tickMs]);
  return now;
}
