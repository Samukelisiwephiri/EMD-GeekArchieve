"use client";

import React, { useMemo, useState } from "react";
import { BadgeCheck, MailCheck, Search, Users } from "lucide-react";
import { ACCOUNT_TYPES, STATUS } from "../lib/verification";

const TONE = {
  pending: "bg-[#FBF5E6] text-[#6B5320]",
  verified: "bg-[#E3F1DB] text-[#2F5A2F]",
  rejected: "bg-[#FBEDEA] text-[#8A2C1E]",
  unverified: "bg-[#F5F1EC] text-[#6E5A4F]",
};
const ROLE = { youth: "Student / developer", organization: "SMME / NGO", admin: "Admin" };
const FILTERS = [
  ["all", "All"],
  ["unverified", "Not verified"],
  ["pending", "Waiting for review"],
  ["unconfirmed", "Email not confirmed"],
  ["verified", "Verified"],
];

/**
 * Admin: every account, with what's holding it back. Admins can confirm an email
 * whose confirmation never arrived and verify an account directly.
 * accounts = [{ userId, name, email, role, accountType, institution, organizationName,
 *               emailConfirmed, status, createdAt }]
 */
export default function AdminAccounts({ accounts, loading, onConfirmEmail, onVerify }) {
  const [filter, setFilter] = useState("unverified");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const counts = useMemo(() => {
    const c = { all: accounts.length, unverified: 0, pending: 0, unconfirmed: 0, verified: 0 };
    for (const a of accounts) {
      if (a.role !== "admin" && a.status !== "verified") c.unverified += 1;
      if (a.status === "pending") c.pending += 1;
      if (!a.emailConfirmed) c.unconfirmed += 1;
      if (a.status === "verified") c.verified += 1;
    }
    return c;
  }, [accounts]);

  const shown = accounts.filter((a) => {
    if (filter === "unverified" && (a.role === "admin" || a.status === "verified")) return false;
    if (filter === "pending" && a.status !== "pending") return false;
    if (filter === "unconfirmed" && a.emailConfirmed) return false;
    if (filter === "verified" && a.status !== "verified") return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [a.name, a.email, a.institution, a.organizationName].some((v) => String(v || "").toLowerCase().includes(q));
  });

  const act = async (key, action, done) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(done);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="accounts-heading">
      <div className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-5 w-5 text-[#5E7A5E]" />
          <div>
            <h2 id="accounts-heading" className="text-lg font-bold text-[#2C1A10]">All accounts</h2>
            <p className="text-xs text-[#6E5A4F]">
              Everyone who has signed up, including people who never sent a verification request. Confirm an email
              when someone&apos;s confirmation email didn&apos;t arrive, and verify accounts you&apos;ve checked.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter accounts">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filter === key ? "bg-[#163126] text-[#C8DD9F]" : "border border-[#E6DFD5] bg-[#FAF8F5] text-[#3B2314]"
                }`}
              >
                {label} ({counts[key]})
              </button>
            ))}
          </div>
          <label className="relative block md:w-72">
            <span className="sr-only">Search accounts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A786D]" />
            <input
              id="accounts-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, school or organisation"
              className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] py-2 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        {notice && <p role="status" className="mt-3 rounded-lg border border-[#B9DBA9] bg-[#EEF7E8] px-3 py-2 text-xs text-[#2F5A2F]">{notice}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">{error}</p>}
      </div>

      {loading && !accounts.length ? (
        <p className="rounded-2xl border border-[#E6DFD5] bg-white p-5 text-sm text-[#6E5A4F]" role="status">Loading accounts…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
          <BadgeCheck className="mx-auto h-6 w-6 text-[#8FA58F]" />
          <p className="mt-2 font-semibold text-[#2C1A10]">No accounts here</p>
          <p className="mt-1 text-sm text-[#6E5A4F]">Try another filter or search.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((a) => {
            const label = a.name || a.email;
            return (
              <li key={a.userId} aria-label={`Account ${label}`} className="rounded-2xl border border-[#E6DFD5] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2C1A10]">{label}</p>
                    <p className="truncate text-xs text-[#6E5A4F]">{a.email}</p>
                    <p className="mt-1 text-xs text-[#5C493E]">
                      {ROLE[a.role] || a.role}
                      {a.accountType && ` · ${ACCOUNT_TYPES[a.accountType]?.label || a.accountType}`}
                      {a.institution && ` · ${a.institution}`}
                      {a.organizationName && ` · ${a.organizationName}`}
                      {a.createdAt && ` · joined ${new Date(a.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!a.emailConfirmed && (
                      <span className="rounded-full bg-[#FBF5E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B5320]">Email not confirmed</span>
                    )}
                    {a.role === "admin" ? (
                      <span className="rounded-full bg-[#EEF4EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#2F472F]">Admin</span>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[a.status] || TONE.unverified}`}>
                        {a.status === "unverified" ? "No request sent" : STATUS[a.status]?.label || a.status}
                      </span>
                    )}
                  </div>
                </div>
                {(!a.emailConfirmed || (a.role !== "admin" && a.status !== "verified")) && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[#EEE8E1] pt-3">
                    {!a.emailConfirmed && (
                      <button
                        type="button"
                        onClick={() => act(`confirm-${a.userId}`, () => onConfirmEmail(a.userId), `${label}'s email is confirmed. They can sign in now.`)}
                        disabled={Boolean(busy)}
                        aria-label={`Confirm email for ${label}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#C8D4C7] bg-white px-3.5 py-2 text-xs font-semibold text-[#163126] hover:bg-[#F4F9EC] disabled:opacity-60"
                      >
                        <MailCheck className="h-3.5 w-3.5" />
                        {busy === `confirm-${a.userId}` ? "Confirming…" : "Confirm email"}
                      </button>
                    )}
                    {a.role !== "admin" && a.status !== "verified" && (
                      <button
                        type="button"
                        onClick={() => act(`verify-${a.userId}`, () => onVerify(a.userId), `${label} is verified.`)}
                        disabled={Boolean(busy)}
                        aria-label={`Verify ${label}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4C654C] disabled:opacity-60"
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {busy === `verify-${a.userId}` ? "Verifying…" : "Verify"}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
