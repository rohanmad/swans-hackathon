"use client";
import { useCallback, useEffect, useState } from "react";
import { COLLECTIONS, nested, text, type AppStatus, type ClioRecord } from "@/lib/types";

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
      if (data.length && !selected) setSelected(String(data[0].id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not list matters."); }
    finally { setBusy(false); }
  }

  async function startImport() {
    setBusy(true); setError(null);
    try {
      await readJson(await fetch("/api/clio/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matterId: selected }) }));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start the import."); }
    finally { setBusy(false); }
  }

  const snapshot = status?.snapshot;
  const job = status?.job;

  return (
    <main>
      <h1>CaseBrief</h1>
      <p className="muted">Read-only briefing from Clio Manage. Nothing is written back to Clio.</p>

      {connectionError && <p className="error">{connectionError}</p>}
      {error && <p className="error">{error}</p>}

      <section>
        <h2>1. Connect Clio</h2>
        {!status ? <p className="muted">Loading…</p>
          : !status.configured ? (
            <p className="error">{status.configError ?? "Add CLIO_CLIENT_ID and CLIO_CLIENT_SECRET to .env.local and restart the server."} The callback URL must be registered as <code>{status.redirectUri}</code>.</p>
          ) : status.connected ? (
            <div className="row"><span className="ok">Connected.</span><a className="button secondary" href="/api/clio/connect">Reconnect</a></div>
          ) : (
            <div className="row">
              <a className="button" href="/api/clio/connect">Connect Clio</a>
              <span className="muted">Callback: <code>{status.redirectUri}</code></span>
            </div>
          )}
      </section>

      {status?.connected && (
        <section>
          <h2>2. Choose a matter</h2>
          <div className="row">
            <button className="secondary" onClick={loadMatters} disabled={busy}>{matters ? "Reload matters" : "List matters"}</button>
            {matters && (matters.length ? (
              <select value={selected} onChange={e => setSelected(e.target.value)}>
                {matters.map(m => <option key={String(m.id)} value={String(m.id)}>{matterLabel(m)}</option>)}
              </select>
            ) : <span className="muted">No matters visible to this connection.</span>)}
            {matters && matters.length > 0 && <button onClick={startImport} disabled={busy || running || !selected}>Import</button>}
          </div>
          {job && (
            <p className={job.state === "failed" ? "error" : "muted"}>
              Import {job.state}: {job.step}{job.error ? ` — ${job.error}` : ""}
            </p>
          )}
        </section>
      )}

      {snapshot && (
        <section>
          <h2>3. Imported case: {matterLabel(snapshot.matter)}</h2>
          <p className="muted">Synced {new Date(snapshot.syncedAt).toLocaleString()} · {snapshot.status}</p>
          <table>
            <thead><tr><th>Collection</th><th>Records</th><th>Status</th></tr></thead>
            <tbody>
              {COLLECTIONS.map(name => {
                const result = snapshot.collections[name];
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{result?.records.length ?? 0}</td>
                    <td className={result?.status === "failed" ? "error" : "ok"}>{result?.status ?? "missing"}{result?.error ? `: ${result.error}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
