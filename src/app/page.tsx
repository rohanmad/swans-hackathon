"use client";
import { useCallback, useEffect, useState } from "react";
import { nested, text, type AppStatus, type ClioRecord } from "@/lib/types";
import { Dashboard } from "./dashboard";

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

export default function Home() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [matters, setMatters] = useState<ClioRecord[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const refresh = useCallback(async () => {
    try { setStatus(await readJson<AppStatus>(await fetch("/api/clio/status", { cache: "no-store" }))); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load status."); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("connection_error");
    if (code) setConnectionError(CONNECTION_ERRORS[code] ?? "Connection failed.");
    if (code || params.has("connected")) window.history.replaceState(null, "", "/");
    void refresh();
  }, [refresh]);

  const running = status?.job?.state === "running";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), 1500);
    return () => clearInterval(timer);
  }, [running, refresh]);

  async function loadMatters() {
    setBusy(true); setError(null);
    try {
      const { data } = await readJson<{ data: ClioRecord[] }>(await fetch("/api/clio/matters", { cache: "no-store" }));
      setMatters(data);
      const current = status?.snapshot ? String(status.snapshot.matter.id) : "";
      if (data.length) setSelected(current && data.some(m => String(m.id) === current) ? current : String(data[0].id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not list matters."); }
    finally { setBusy(false); }
  }

  async function startImport(matterId: string) {
    setBusy(true); setError(null);
    try {
      await readJson(await fetch("/api/clio/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matterId }) }));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start the import."); }
    finally { setBusy(false); }
  }

  const snapshot = status?.snapshot;
  const job = status?.job;
  const failed = snapshot ? Object.entries(snapshot.collections).filter(([, c]) => c.status === "failed") : [];

  return (
    <main className={snapshot ? "wide" : ""}>
      <header className="topbar">
        <span className="brand">CaseBrief</span>
        <span className="muted small">Read-only from Clio Manage · nothing is written back</span>
        <span className="spacer" />
        {status?.connected && snapshot && (
          <>
            <span className="muted small">Synced {new Date(snapshot.syncedAt).toLocaleString()}</span>
            <button className="secondary small-btn" onClick={() => startImport(String(snapshot.matter.id))} disabled={busy || running}>{running ? "Syncing…" : "Re-sync"}</button>
            <button className="secondary small-btn" onClick={() => { setShowImport(!showImport); if (!matters) void loadMatters(); }}>Switch matter</button>
          </>
        )}
      </header>

      {connectionError && <p className="error">{connectionError}</p>}
      {error && <p className="error">{error}</p>}
      {job && (running || job.state === "failed") && <p className={job.state === "failed" ? "error" : "muted"}>Import {job.state}: {job.step}{job.error ? ` — ${job.error}` : ""}</p>}
      {failed.length > 0 && <p className="error">Some Clio collections could not be read and are missing from this view: {failed.map(([name, c]) => `${name} (${c.error})`).join("; ")}</p>}

      {!status ? <p className="muted">Loading…</p>
        : !status.configured ? (
          <section><h2>Connect Clio</h2><p className="error">{status.configError ?? "Add CLIO_CLIENT_ID and CLIO_CLIENT_SECRET to .env.local and restart the server."} The callback URL must be registered as <code>{status.redirectUri}</code>.</p></section>
        ) : !status.connected ? (
          <section>
            <h2>Connect Clio</h2>
            <p className="muted">CaseBrief reads your matter from Clio Manage with read-only access.</p>
            <a className="button" href="/api/clio/connect">Connect Clio</a>
          </section>
        ) : (!snapshot || showImport) && (
          <section>
            <h2>{snapshot ? "Switch matter" : "Choose a matter to brief"}</h2>
            <div className="row">
              <button className="secondary" onClick={loadMatters} disabled={busy}>{matters ? "Reload matters" : "List matters"}</button>
              {matters && (matters.length ? (
                <select value={selected} onChange={e => setSelected(e.target.value)}>
                  {matters.map(m => <option key={String(m.id)} value={String(m.id)}>{matterLabel(m)}</option>)}
                </select>
              ) : <span className="muted">No matters visible to this connection.</span>)}
              {matters && matters.length > 0 && <button onClick={() => { void startImport(selected); setShowImport(false); }} disabled={busy || running || !selected}>Import and brief</button>}
              <a className="button secondary" href="/api/clio/connect">Reconnect</a>
            </div>
          </section>
        )}

      {status?.connected && snapshot && status.digest && <Dashboard key={String(snapshot.matter.id) + snapshot.syncedAt} snapshot={snapshot} digest={status.digest} />}
    </main>
  );
}
