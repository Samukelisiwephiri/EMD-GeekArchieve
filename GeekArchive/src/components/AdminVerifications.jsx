"use client";

import React, { useState } from "react";
import { BadgeCheck, CheckCircle2, ExternalLink, Github, ShieldCheck, XCircle } from "lucide-react";
import { ACCOUNT_TYPES, STATUS } from "../lib/verification";

const TONE = {
  pending: "bg-[#FBF5E6] text-[#6B5320]",
  verified: "bg-[#E3F1DB] text-[#2F5A2F]",
  rejected: "bg-[#FBEDEA] text-[#8A2C1E]",
  unverified: "bg-[#F5F1EC] text-[#6E5A4F]",
};

function Detail({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8A786D]">{label}</dt>
      <dd className="text-sm text-[#2C1A10]">{children}</dd>
    </div>
  );
}

/** Admin queue: approve or reject verification requests that need a person. */
export default function AdminVerifications({ requests, onReview }) {
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending" && r.status !== "unverified");

  const review = async (request, decision) => {
    if (decision === "rejected" && !note.trim()) {
      setError("Please give a short reason so the person knows what to fix.");
      return;
    }
    setBusy(request.userId);
    setError("");
    try {
      await onReview(request.userId, decision, decision === "rejected" ? note.trim() : "");
      setRejecting(null);
      setNote("");
    } catch (err) {
      setError(err?.message || "Couldn't save the decision.");
    } finally {
      setBusy(null);
    }
  };

  const card = (r, actions) => (
    <article key={r.userId} aria-label={`Verification request from ${r.userName}`} className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-[#2C1A10]">{r.orgName || r.userName}</p>
          <p className="text-xs text-[#6E5A4F]">
            {ACCOUNT_TYPES[r.accountType]?.label || r.accountType}
            {r.orgName && ` · contact: ${r.userName}`}
            {r.submittedAt && ` · sent ${new Date(r.submittedAt).toLocaleDateString()}`}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[r.status]}`}>{STATUS[r.status]?.label}</span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Detail label="Institution">{r.institution}</Detail>
        <Detail label="Registration number">{r.registrationNumber && <code className="font-mono">{r.registrationNumber}</code>}</Detail>
        <Detail label="Account email">{r.email}</Detail>
        <Detail label="GitHub">
          {r.githubUsername && (
            <a href={`https://github.com/${r.githubUsername}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[#3F5D3F] underline">
              <Github className="h-3.5 w-3.5" />@{r.githubUsername}
            </a>
          )}
        </Detail>
        <Detail label="Website">
          {r.website && (
            <a href={r.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[#3F5D3F] underline">
              <ExternalLink className="h-3.5 w-3.5" />{r.website}
            </a>
          )}
        </Detail>
        <Detail label="Evidence link">
          {r.evidenceUrl && (
            <a href={r.evidenceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[#3F5D3F] underline">
              <ExternalLink className="h-3.5 w-3.5" />{r.evidenceUrl}
            </a>
          )}
        </Detail>
        <Detail label="Decision note">{r.reviewNote}</Detail>
      </dl>
      {actions}
    </article>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DFD5] bg-white p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#2C1A10]">
            <ShieldCheck className="h-5 w-5 text-[#5E7A5E]" />
            Verification requests
          </h2>
          <p className="mt-1 text-xs text-[#6E5A4F]">
            Check CIPC numbers at bizportal.gov.za and NPO numbers at the DSD NPO register before approving.
          </p>
        </div>
        <span className="rounded-full bg-[#FBF5E6] px-3 py-1 text-xs font-semibold text-[#6B5320]">{pending.length} waiting</span>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-[#E7C3BC] bg-[#FBEDEA] px-4 py-2.5 text-xs text-[#8A2C1E]">{error}</p>
      )}

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
          <BadgeCheck className="mx-auto h-6 w-6 text-[#8FA58F]" />
          <p className="mt-2 font-semibold text-[#2C1A10]">Nothing waiting</p>
          <p className="mt-1 text-sm text-[#6E5A4F]">New requests that need a person will appear here.</p>
        </div>
      ) : (
        pending.map((r) =>
          card(
            r,
            <div className="mt-4 border-t border-[#EEE8E1] pt-4">
              {rejecting === r.userId ? (
                <div className="space-y-2">
                  <label htmlFor={`reason-${r.userId}`} className="block text-xs font-semibold text-[#3B2314]">Reason (shown to the person)</label>
                  <input id={`reason-${r.userId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Registration number doesn't match the business name" className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy === r.userId} onClick={() => review(r, "rejected")} className="rounded-xl bg-[#A33A2A] px-3.5 py-2 text-xs font-semibold text-white">Reject request</button>
                    <button type="button" onClick={() => { setRejecting(null); setNote(""); setError(""); }} className="rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#3B2314]">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy === r.userId} onClick={() => review(r, "verified")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4C654C]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button type="button" onClick={() => { setRejecting(r.userId); setNote(""); setError(""); }} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7C3BC] bg-white px-3.5 py-2 text-xs font-semibold text-[#8A2C1E]">
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          )
        )
      )}

      {decided.length > 0 && (
        <details className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-[#3B2314]">Decided and automatic ({decided.length})</summary>
          <div className="mt-3 space-y-3">{decided.map((r) => card(r, null))}</div>
        </details>
      )}
    </section>
  );
}
