"use client";

import React, { useState } from "react";
import { Download, Lock, ShieldCheck, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { POPIA_NOTICE_VERSION } from "../lib/verification";

const CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT || "";

/** POPIA privacy notice (s18: what we collect, why, who receives it, rights). */
export function PrivacyNotice() {
  const h = "mt-4 text-sm font-bold text-[#163126]";
  const p = "mt-1 text-sm leading-relaxed text-[#3B2314]";
  return (
    <div>
      <p className="text-xs text-[#8A786D]">Version {POPIA_NOTICE_VERSION} · Protection of Personal Information Act (POPIA)</p>
      <h3 className={h}>Who we are</h3>
      <p className={p}>
        Geek Archive (by Embedded Intelligence) connects students and developers with SMMEs and NGOs. We are the
        responsible party for the personal information you give us here.
        {CONTACT ? ` Contact our Information Officer at ${CONTACT}.` : " Contact the Geek Archive team to reach our Information Officer."}
      </p>
      <h3 className={h}>What we collect and why</h3>
      <ul className={`${p} list-disc space-y-1 pl-5`}>
        <li><strong>Account:</strong> your name, email and role — to sign you in and show the right tools.</li>
        <li><strong>Verification:</strong> your institution, GitHub username, or organisation name and registration number — so everyone knows who they are dealing with. We never ask for ID numbers, student numbers or documents.</li>
        <li><strong>Talent profile and projects (students/developers):</strong> skills, availability, portfolio, project descriptions, GitHub links and demo videos — so organisations can find your work.</li>
        <li><strong>Messages:</strong> what organisations send students, and the reply email/phone the organisation chooses to share.</li>
        <li><strong>Consent record:</strong> when you agreed to this notice.</li>
      </ul>
      <h3 className={h}>Who can see it</h3>
      <p className={p}>
        Verified SMMEs, NGOs and sponsors can see students&apos; profiles and projects (never their email or phone
        number). Other students and developers can&apos;t. Messages are visible only to the sender and the recipient.
        The Geek Archive team sees verification requests in order to review them.
      </p>
      <h3 className={h}>Service providers and cross-border transfers</h3>
      <p className={p}>
        Data is stored with Supabase (database and sign-in). When an organisation asks for an AI project analysis,
        the project&apos;s title, description, technologies and public GitHub content — but no personal information —
        are sent to Anthropic (Claude) in the United States. Demo videos play from YouTube (privacy-enhanced mode),
        Vimeo or Loom. These providers process data under their own security safeguards, as POPIA section 72 requires.
      </p>
      <h3 className={h}>How long we keep it</h3>
      <p className={p}>
        Until you delete your account. Deleting it removes your profile, projects, messages and verification record.
        Backups are overwritten within 30 days.
      </p>
      <h3 className={h}>Your rights</h3>
      <p className={p}>
        You can see, download, correct or delete your information at any time from <em>Privacy &amp; my data</em>,
        object to processing, and withdraw consent (by deleting your account). You may also complain to the
        Information Regulator (South Africa) at inforegulator.org.za.
      </p>
    </div>
  );
}

/** Blocks the app until the user consents to the current privacy notice. */
export function ConsentGate({ open, userName, onAgree, onSignOut }) {
  const [agreed, setAgreed] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  return (
    <Modal open={open} onClose={onSignOut} title="Before you continue" subtitle={`Welcome, ${userName}`} size="md">
      <p className="text-sm leading-relaxed text-[#3B2314]">
        Geek Archive handles personal information under South Africa&apos;s POPIA. Please read how we use it and agree
        before continuing.
      </p>
      <button type="button" onClick={() => setShowNotice((v) => !v)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3F5D3F] underline">
        <Lock className="h-4 w-4" />
        {showNotice ? "Hide the privacy notice" : "Read the privacy notice"}
      </button>
      {showNotice && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-4">
          <PrivacyNotice />
        </div>
      )}
      <label className="mt-4 flex items-start gap-2.5 text-sm text-[#2C1A10]">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-[#5E7A5E]" />
        <span>I have read the privacy notice and agree that Geek Archive may process my information as described.</span>
      </label>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={!agreed} onClick={onAgree} className="rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F] disabled:cursor-not-allowed disabled:opacity-50">
          Agree and continue
        </button>
        <button type="button" onClick={onSignOut} className="rounded-xl border border-[#D8CFC4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3B2314]">
          Sign out
        </button>
      </div>
    </Modal>
  );
}

/** "Privacy & my data": the notice, a data summary, download, and account deletion. */
export function PrivacyCenter({ user, consentAt, summary, buildExport, onDeleteAccount, deleteBlockedReason = "" }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const download = () => {
    const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geek-archive-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    setDeleting(true);
    setError("");
    try {
      await onDeleteAccount();
    } catch (err) {
      setError(err?.message || "Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#E6DFD5] bg-[#FAF8F5] p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#163126]">
          <ShieldCheck className="h-4 w-4" />
          What we hold about you
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {summary.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8A786D]">{label}</dt>
              <dd className="text-sm font-semibold text-[#2C1A10]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-[#6E5A4F]">
          Consent given {consentAt ? new Date(consentAt).toLocaleString() : "—"} (privacy notice version {POPIA_NOTICE_VERSION}).
        </p>
        <button type="button" onClick={download} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2 text-sm font-semibold text-[#C8DD9F]">
          <Download className="h-4 w-4" />
          Download my data (JSON)
        </button>
      </section>

      <details className="rounded-2xl border border-[#E6DFD5] p-4">
        <summary className="cursor-pointer text-sm font-bold text-[#163126]">Privacy notice</summary>
        <div className="mt-2"><PrivacyNotice /></div>
      </details>

      <section className="rounded-2xl border border-[#E7C3BC] bg-[#FDF6F4] p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#8A2C1E]">
          <Trash2 className="h-4 w-4" />
          Delete my account
        </h3>
        <p className="mt-1 text-sm text-[#5C2A20]">
          This permanently deletes your account, {user.isYouth ? "talent profile, projects, " : ""}messages and
          verification record. It can&apos;t be undone.
        </p>
        {deleteBlockedReason ? (
          <p role="note" className="mt-3 rounded-lg border border-[#E8D9A8] bg-[#FBF6E6] px-3 py-2 text-xs text-[#6B5420]">
            {deleteBlockedReason}
          </p>
        ) : (
        <>
        <label htmlFor="delete-confirm" className="mt-3 block text-xs font-semibold text-[#5C2A20]">
          Type <strong>DELETE</strong> to confirm
        </label>
        <input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" className="mt-1 w-full max-w-xs rounded-xl border border-[#E7C3BC] bg-white px-3.5 py-2 text-sm" />
        <div className="mt-3">
          <button type="button" disabled={confirmText !== "DELETE" || deleting} onClick={remove} className="rounded-xl bg-[#A33A2A] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {deleting ? "Deleting…" : "Permanently delete my account"}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-[#8A2C1E]">{error}</p>}
        </>
        )}
      </section>
    </div>
  );
}
