"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Mail } from "lucide-react";
import type { Client, DeskLine } from "../types";
import { cx } from "../lib/format";

export function RequestClient({ client, items, compact }: { client: Client; items: DeskLine[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const body = [
    `Hi ${client.name},`,
    "",
    "Please send the following so we can move your case forward:",
    "",
    ...(items.length ? items.map((item, i) => `${i + 1}. ${item.text}`) : ["(Add the items you need from the client.)"]),
    "",
    "Thank you."
  ].join("\n");
  const href = client.email
    ? `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent("Information needed for your case")}&body=${encodeURIComponent(body)}`
    : undefined;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-surface px-3 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink",
          compact ? "h-8" : "mt-4 h-9"
        )}
      >
        <Mail size={13} strokeWidth={1.7} />
        Request info from client
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/25 p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[520px] rounded-[8px] border border-line bg-paper p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="label">Draft · not sent to Clio</div>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">Request info from {client.name}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              This opens your email app. Nothing is written back to Clio. Edit the list before you send.
            </p>
            {items.length > 0 ? (
              <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[13px] text-ink">
                {items.map((item, i) => <li key={item.sourceId + i}>{item.text}{item.meta ? <span className="text-muted"> · {item.meta}</span> : null}</li>)}
              </ol>
            ) : (
              <p className="mt-4 text-[13px] text-muted">No open Clio tasks are waiting on the client. You can still send a blank request and fill it in.</p>
            )}
            {!client.email && <p className="mt-3 text-[13px] text-high">No email is on this client&apos;s Clio contact.</p>}
            <div className="mt-5 flex gap-2">
              {href && <a href={href} className="inline-flex h-9 items-center rounded-[5px] bg-ink px-4 text-[13px] text-paper hover:opacity-90">Open email draft</a>}
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 items-center rounded-[5px] border border-line bg-surface px-4 text-[13px] text-ink-2 hover:text-ink">Close</button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
