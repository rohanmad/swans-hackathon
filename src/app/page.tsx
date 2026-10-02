"use client";
import { useCallback, useEffect, useState } from "react";
import { nested, text, type AppStatus, type ClioRecord } from "@/lib/types";
import { AttorneyApp } from "@/ui/AttorneyApp";
import { SwanMark } from "@/ui/components/SwanMark";

const CONNECTION_ERRORS: Record<string, string> = {
  configuration: "Clio credentials are missing or invalid. Fill in .env.local and restart the server.",
  authorization: "Clio authorization did not complete. Check the callback URL and permissions, then try again."
};

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || `Request failed (${response.status}).`);
  return body as T;
}

function matterLabel(matter: ClioRecord) {
  const client = nested(matter, "client");
  return [text(matter, "display_number"), text(matter, "description"), client && text(client, "name")].filter(Boolean).join(" · ");
}

const button = "inline-flex h-9 items-center rounded-[5px] bg-ink px-4 text-[13px] text-paper transition-opacity hover:opacity-90 disabled:opacity-50";
const secondary = "inline-flex h-9 items-center rounded-[5px] border border-line bg-surface px-4 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50";

export default function Home() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [matters, setMatters] = useState<ClioRecord[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    try { setStatus(await readJson<AppStatus>(await fetch("/api/clio/status", { cache: "no-store" }))); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load status."); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("connection_error");
    if (code) setError(CONNECTION_ERRORS[code] ?? "Connection failed.");
    if (code || params.has("connected")) window.history.replaceState(null, "", "/");
    void refresh();
  }, [refresh]);

  const running = status?.job?.state === "running";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), 1500);
    return () => clearInterval(timer);
  }, [running, refresh]);

  const loadMatters = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const { data } = await readJson<{ data: ClioRecord[] }>(await fetch("/api/clio/matters", { cache: "no-store" }));
      setMatters(data);
      if (data.length) setSelected(s => s || String(data[0].id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not list matters."); }
    finally { setBusy(false); }
  }, []);

  async function startImport(matterId: string) {
    setBusy(true); setError(null);
    try {
      await readJson(await fetch("/api/clio/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matterId }) }));
      setSwitching(false);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start the import."); }
    finally { setBusy(false); }
  }

  const snapshot = status?.snapshot;
  const job = status?.job;
  const needsMatter = status?.connected && (!snapshot || switching);
  useEffect(() => { if (needsMatter && !matters) void loadMatters(); }, [needsMatter, matters, loadMatters]);

  if (status?.connected && snapshot && status.digest && !switching) {
    const failed = Object.entries(snapshot.collections).filter(([, c]) => c.status === "failed");
    return (
      <>
        {(failed.length > 0 || job?.state === "failed" || error) && (
          <div className="border-b border-high/25 bg-high-soft px-10 py-2 text-[12.5px] text-high">
            {error ?? (job?.state === "failed" ? `Last sync failed: ${job.error}` : `Missing from this view: ${failed.map(([n, c]) => `${n} (${c.error})`).join("; ")}`)}
          </div>
        )}
        <AttorneyApp key={String(snapshot.matter.id) + snapshot.syncedAt} snapshot={snapshot} digest={status.digest} syncing={running || busy} onResync={() => startImport(String(snapshot.matter.id))} onSwitchMatter={() => setSwitching(true)} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2">
          <SwanMark size={20} />
          <span className="text-[15px] font-semibold tracking-[0.18em]">SWANS</span>
          <span className="text-[12px] text-muted">Case Intelligence</span>
        </div>
        <h1 className="mt-8 text-[30px] leading-tight font-semibold tracking-[-0.025em]">
          {!status ? "Loading…" : !status.connected ? "Connect your Clio account" : running ? "Reading the matter from Clio…" : "Choose a matter to brief"}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          Read-only access to Clio Manage. Nothing is ever written back to your case records.
        </p>

        {error && <p className="mt-4 rounded-[5px] border border-high/25 bg-high-soft px-3 py-2 text-[13px] text-high">{error}</p>}

        <div className="mt-8">
          {status && !status.configured && (
            <p className="text-[13px] text-high">{status.configError ?? "Add CLIO_CLIENT_ID and CLIO_CLIENT_SECRET to .env.local and restart the server."} Register the callback <code className="font-mono text-[12px]">{status.redirectUri}</code>.</p>
          )}
          {status?.configured && !status.connected && <a className={button} href="/api/clio/connect">Connect Clio</a>}
          {running && job && (
            <div>
              <div className="h-1 overflow-hidden rounded-full bg-line"><div className="h-full w-1/3 animate-pulse rounded-full bg-swan" /></div>
              <p className="mt-3 font-mono text-[12px] text-muted">{job.step}</p>
            </div>
          )}
          {needsMatter && !running && (
            <div className="space-y-3">
              {matters === null ? <p className="text-[13px] text-muted">Loading matters…</p> : matters.length === 0 ? <p className="text-[13px] text-muted">No matters are visible to this connection.</p> : (
                <select value={selected} onChange={e => setSelected(e.target.value)} className="h-10 w-full rounded-[5px] border border-line bg-surface px-3 text-[13.5px] outline-none focus:border-line-strong">
                  {matters.map(m => <option key={String(m.id)} value={String(m.id)}>{matterLabel(m)}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <button type="button" className={button} disabled={busy || !selected} onClick={() => startImport(selected)}>Import and brief</button>
                {snapshot && <button type="button" className={secondary} onClick={() => setSwitching(false)}>Cancel</button>}
                <a className={secondary} href="/api/clio/connect">Reconnect</a>
              </div>
              {job?.state === "failed" && <p className="text-[13px] text-high">Last import failed: {job.error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
