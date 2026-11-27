"use client";

import React, { useState } from "react";
import {
  BadgeCheck,
  Building2,
  Clock,
  Code2,
  Copy,
  Github,
  GraduationCap,
  Loader2,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  ACCOUNT_TYPES,
  isGitHubUsername,
  isInstitutionEmail,
  makeGitHubCode,
  normaliseRegistration,
  validateRegistration,
} from "../lib/verification";

const TYPE_ICONS = {
  student: GraduationCap,
  developer: Code2,
  it_professional: Server,
  smme: Building2,
  ngo: Building2,
};

const input = "w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm";
const label = "mb-1 block text-xs font-semibold text-[#3B2314]";

export function VerifiedBadge({ status, compact = false }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F1DB] px-2 py-0.5 text-[11px] font-semibold text-[#2F5A2F]">
        <BadgeCheck className="h-3.5 w-3.5" />
        {compact ? "" : "Verified"}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF5E6] px-2 py-0.5 text-[11px] font-semibold text-[#6B5320]">
        <Clock className="h-3 w-3" />
        {compact ? "" : "Pending"}
      </span>
    );
  }
  return null;
}

/**
 * Lets the signed-in user verify who they are. The parent decides the outcome
 * (demo mode) or saves the request so the database decides (Supabase mode).
 */
export default function VerificationCenter({ user, group, verification, supabaseMode, onSubmit, onLinkGitHub }) {
  const types = Object.entries(ACCOUNT_TYPES).filter(([, t]) => t.group === group);
  const [accountType, setAccountType] = useState(verification?.accountType || types[0][0]);
  const [institution, setInstitution] = useState(verification?.institution || "");
  const [evidenceUrl, setEvidenceUrl] = useState(verification?.evidenceUrl || "");
  const [githubUsername, setGithubUsername] = useState(verification?.githubUsername || "");
  const [githubCode] = useState(() => verification?.githubCode || makeGitHubCode());
  const [orgName, setOrgName] = useState(verification?.orgName || "");
  const [registration, setRegistration] = useState(verification?.registrationNumber || "");
  const [website, setWebsite] = useState(verification?.website || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(!verification || verification.status === "unverified");
  const [copied, setCopied] = useState(false);

  const status = verification?.status || "unverified";
  const institutionEmail = isInstitutionEmail(user?.email);

  const submit = async (record) => {
    setBusy(true);
    setError("");
    try {
      await onSubmit({ accountType, ...record });
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitStudent = (method) => {
    if (!institution.trim()) return setError("Please enter your university or college.");
    if (evidenceUrl && !/^https:\/\//i.test(evidenceUrl.trim())) return setError("The link must start with https://");
    return submit({ method, institution: institution.trim(), evidenceUrl: evidenceUrl.trim() });
  };

  const checkGitHub = async () => {
    if (!isGitHubUsername(githubUsername)) return setError("Enter your GitHub username (not the full link).");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/verify-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: githubUsername.trim(), code: githubCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.verified) throw new Error(data.error || "GitHub verification failed.");
      await onSubmit({
        accountType,
        method: "github_bio",
        githubUsername: data.github.login,
        githubUrl: data.github.url,
        githubCode,
      });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitOrganisation = () => {
    if (!orgName.trim()) return setError("Please enter the registered name of your organisation.");
    const regError = validateRegistration(accountType, registration);
    if (regError) return setError(regError);
    if (website && !/^https?:\/\//i.test(website.trim())) return setError("The website must start with https://");
    return submit({
      method: "admin_review",
      orgName: orgName.trim(),
      registrationNumber: normaliseRegistration(registration),
      website: website.trim(),
    });
  };

  return (
    <div className="space-y-5">
      {/* Current status */}
      {status === "verified" && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#B9DBA9] bg-[#EEF7E8] p-4">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#2F5A2F]" />
          <div>
            <p className="font-bold text-[#1F3D1F]">You&apos;re verified</p>
            <p className="mt-0.5 text-sm text-[#2F472F]">
              {ACCOUNT_TYPES[verification.accountType]?.label}
              {verification.method === "institution_email" && ` · ${verification.institution} email`}
              {(verification.method === "github_bio" || verification.method === "github_oauth") &&
                ` · GitHub @${verification.githubUsername}`}
              {verification.method === "admin_review" && " · approved by the Geek Archive team"}
            </p>
          </div>
        </div>
      )}
      {status === "pending" && !editing && (
        <div className="rounded-2xl border border-[#E8D9B5] bg-[#FBF5E6] p-4">
          <p className="flex items-center gap-2 font-bold text-[#6B5320]">
            <Clock className="h-5 w-5" />
            Waiting for review
          </p>
          <p className="mt-1 text-sm text-[#6B5320]">
            The Geek Archive team checks requests within 2 working days. You&apos;ll be able to use everything once
            you&apos;re approved.
          </p>
          <button type="button" onClick={() => setEditing(true)} className="mt-2 text-xs font-semibold text-[#6B5320] underline">
            Change my details
          </button>
        </div>
      )}
      {status === "rejected" && !editing && (
        <div className="rounded-2xl border border-[#E7C3BC] bg-[#FBEDEA] p-4">
          <p className="flex items-center gap-2 font-bold text-[#8A2C1E]">
            <ShieldAlert className="h-5 w-5" />
            Your request wasn&apos;t approved
          </p>
          {verification.reviewNote && <p className="mt-1 text-sm text-[#8A2C1E]">Reason: {verification.reviewNote}</p>}
          <button type="button" onClick={() => setEditing(true)} className="mt-2 text-xs font-semibold text-[#8A2C1E] underline">
            Update and try again
          </button>
        </div>
      )}

      {editing && status !== "verified" && (
        <>
          <fieldset>
            <legend className={label}>I am a…</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {types.map(([key, t]) => {
                const Icon = TYPE_ICONS[key];
                const active = key === accountType;
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition ${
                      active ? "border-[#5E7A5E] bg-[#EEF4EE] ring-2 ring-[#C8DD9F]" : "border-[#E6DFD5] bg-white hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="account-type"
                      value={key}
                      checked={active}
                      onChange={() => {
                        setAccountType(key);
                        setError("");
                      }}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-1.5 font-semibold text-[#2C1A10]">
                      <Icon className="h-4 w-4 text-[#5E7A5E]" />
                      {t.label}
                    </span>
                    <span className="text-[11px] text-[#6E5A4F]">{t.method}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {accountType === "student" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="v-institution" className={label}>University or college</label>
                <input id="v-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. University of Johannesburg" className={input} />
              </div>
              {institutionEmail ? (
                <div className="rounded-xl border border-[#C8DD9F] bg-[#F4F9EC] p-3.5">
                  <p className="text-sm text-[#2F472F]">
                    You signed in with a university email (<strong>{user.email}</strong>), so we can verify you
                    straight away{supabaseMode ? " once that email is confirmed" : ""}.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submitStudent("institution_email")}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2 text-sm font-semibold text-[#C8DD9F] disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    Verify with my university email
                  </button>
                </div>
              ) : (
                <>
                  <p className="rounded-xl bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#6E5A4F]">
                    Tip: sign in with your university email (ending in <strong>.ac.za</strong>) to be verified
                    instantly. Otherwise, the team will review your request.
                  </p>
                  <div>
                    <label htmlFor="v-evidence" className={label}>
                      Link that shows you study there <span className="font-normal text-[#8A786D]">(optional)</span>
                    </label>
                    <input id="v-evidence" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://… e.g. your LinkedIn or a hackathon page" className={input} />
                    <p className="mt-1 text-[11px] text-[#8A786D]">Please don&apos;t upload or share ID documents or student cards.</p>
                  </div>
                  <button type="button" disabled={busy} onClick={() => submitStudent("admin_review")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send for review
                  </button>
                </>
              )}
            </div>
          )}

          {(accountType === "developer" || accountType === "it_professional") && (
            <div className="space-y-3">
              {supabaseMode ? (
                <div className="rounded-xl border border-[#C8DD9F] bg-[#F4F9EC] p-3.5">
                  <p className="text-sm text-[#2F472F]">
                    Connect the GitHub account you build with. GitHub confirms it&apos;s yours, and you&apos;re verified
                    as soon as you come back.
                  </p>
                  <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await onLinkGitHub(accountType); } catch (err) { setError(err?.message || "Couldn't connect GitHub."); setBusy(false); } }} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#24292F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                    <Github className="h-4 w-4" />
                    Connect GitHub
                  </button>
                </div>
              ) : (
                <>
                  <ol className="space-y-2 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-3.5 text-sm text-[#3B2314]">
                    <li>
                      <strong>1.</strong> Copy this code:{" "}
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[#163126] ring-1 ring-[#D8CFC4]">{githubCode}</code>{" "}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(githubCode);
                            setCopied(true);
                          } catch {
                            setCopied(false);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#3F5D3F] hover:underline"
                      >
                        <Copy className="h-3 w-3" />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </li>
                    <li>
                      <strong>2.</strong> Paste it anywhere in your bio at{" "}
                      <a href="https://github.com/settings/profile" target="_blank" rel="noreferrer noopener" className="font-semibold text-[#3F5D3F] underline">
                        github.com/settings/profile
                      </a>{" "}
                      and save. You can remove it after you&apos;re verified.
                    </li>
                    <li><strong>3.</strong> Enter your username and check.</li>
                  </ol>
                  <div>
                    <label htmlFor="v-github" className={label}>GitHub username</label>
                    <input id="v-github" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="e.g. thandi-dev" autoComplete="off" className={input} />
                  </div>
                  <button type="button" disabled={busy} onClick={checkGitHub} className="inline-flex items-center gap-1.5 rounded-xl bg-[#24292F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                    Check my GitHub
                  </button>
                </>
              )}
            </div>
          )}

          {(accountType === "smme" || accountType === "ngo") && (
            <div className="space-y-3">
              <div>
                <label htmlFor="v-org" className={label}>Registered organisation name</label>
                <input id="v-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Bra Joe's Tuckshop (Pty) Ltd" className={input} />
              </div>
              <div>
                <label htmlFor="v-reg" className={label}>{accountType === "smme" ? "CIPC registration number" : "NPO or NPC registration number"}</label>
                <input id="v-reg" value={registration} onChange={(e) => setRegistration(e.target.value)} placeholder={accountType === "smme" ? "2019/123456/07" : "123-456 NPO"} className={input} />
              </div>
              <div>
                <label htmlFor="v-web" className={label}>Website or social page <span className="font-normal text-[#8A786D]">(optional)</span></label>
                <input id="v-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={input} />
              </div>
              <button type="button" disabled={busy} onClick={submitOrganisation} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Send for review
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
              {error}
            </p>
          )}
        </>
      )}

      <p className="text-[11px] leading-relaxed text-[#8A786D]">
        Why we verify: SMMEs need to trust who they hire, and students need to know who is contacting them. We only
        collect what the check needs — never ID numbers or documents.
      </p>
    </div>
  );
}
