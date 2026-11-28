"use client";

import React, { useState } from "react";
import { Mail, ShieldCheck, UserMinus, UserPlus, X } from "lucide-react";

const INPUT =
  "w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none";

const RESULT_TEXT = {
  promoted: (email) => `${email} already had a confirmed account and is now an admin.`,
  already: (email) => `${email} is already an admin.`,
  invited: (email) =>
    `Invite saved. ${email} becomes an admin as soon as they sign up and confirm that email address.`,
};

/**
 * Admin team: who the admins are, open invites, and adding/removing admins.
 * team = { admins: [{ userId, name, email, since }], invites: [{ email, since }] }
 */
export default function AdminTeam({ team, currentUserId, loading, onInvite, onCancelInvite, onRemove }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  const run = async (key, action) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const invite = (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setError("Enter the person's email address, e.g. thandi@geekarchive.co.za.");
      return;
    }
    run("invite", async () => {
      const result = await onInvite(value);
      setNotice((RESULT_TEXT[result] || RESULT_TEXT.invited)(value));
      setEmail("");
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E6DFD5] bg-white p-5" aria-labelledby="team-heading">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#5E7A5E]" />
          <div>
            <h2 id="team-heading" className="text-lg font-bold text-[#2C1A10]">Admin team</h2>
            <p className="text-xs text-[#6E5A4F]">
              Admins review verification requests and manage this team. Invite people by email: they become admins
              once they have a confirmed account with that address.
            </p>
          </div>
        </div>

        <form onSubmit={invite} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <label htmlFor="admin-invite-email" className="mb-1 block text-xs font-semibold text-[#3B2314]">
              Invite an admin
            </label>
            <input
              id="admin-invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.co.za"
              className={INPUT}
            />
          </div>
          <button
            type="submit"
            disabled={busy === "invite"}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {busy === "invite" ? "Inviting…" : "Invite"}
          </button>
        </form>
        {notice && (
          <p role="status" className="mt-3 rounded-lg border border-[#B9DBA9] bg-[#EEF7E8] px-3 py-2 text-xs text-[#2F5A2F]">{notice}</p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">{error}</p>
        )}
      </section>

      <section className="rounded-2xl border border-[#E6DFD5] bg-white p-5" aria-label="Admins">
        <h3 className="text-sm font-bold text-[#2C1A10]">
          Admins <span className="font-normal text-[#8A786D]">({team.admins.length})</span>
        </h3>
        {loading && !team.admins.length ? (
          <p className="mt-2 text-sm text-[#6E5A4F]" role="status">Loading the team…</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#EFEAE4]">
            {team.admins.map((a) => {
              const isMe = a.userId === currentUserId;
              return (
                <li key={a.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5" aria-label={`Admin ${a.name || a.email}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2C1A10]">
                      {a.name || a.email} {isMe && <span className="font-normal text-[#8A786D]">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-[#6E5A4F]">{a.email}</p>
                  </div>
                  {!isMe &&
                    (confirmRemove === a.userId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8A2C1E]">Remove admin rights?</span>
                        <button
                          type="button"
                          onClick={() => run(`remove-${a.userId}`, async () => {
                            await onRemove(a.userId);
                            setConfirmRemove(null);
                            setNotice(`${a.name || a.email} is no longer an admin.`);
                          })}
                          disabled={busy === `remove-${a.userId}`}
                          className="rounded-lg bg-[#A33A2A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Yes, remove
                        </button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="rounded-lg border border-[#D8CFC4] px-3 py-1.5 text-xs font-semibold text-[#3B2314]">
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(a.userId)}
                        aria-label={`Remove ${a.name || a.email} as admin`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E7C3BC] px-3 py-1.5 text-xs font-semibold text-[#8A2C1E] hover:bg-[#FBEDEA]"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#E6DFD5] bg-white p-5" aria-label="Open invites">
        <h3 className="text-sm font-bold text-[#2C1A10]">
          Open invites <span className="font-normal text-[#8A786D]">({team.invites.length})</span>
        </h3>
        {team.invites.length === 0 ? (
          <p className="mt-2 text-sm text-[#6E5A4F]">No open invites.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#EFEAE4]">
            {team.invites.map((i) => (
              <li key={i.email} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <p className="inline-flex min-w-0 items-center gap-1.5 text-sm text-[#2C1A10]">
                  <Mail className="h-4 w-4 shrink-0 text-[#8A786D]" />
                  <span className="truncate">{i.email}</span>
                  <span className="text-xs text-[#8A786D]">· waiting for sign-up</span>
                </p>
                <button
                  type="button"
                  onClick={() => run(`cancel-${i.email}`, async () => {
                    await onCancelInvite(i.email);
                    setNotice(`Invite for ${i.email} cancelled.`);
                  })}
                  disabled={busy === `cancel-${i.email}`}
                  aria-label={`Cancel invite for ${i.email}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#D8CFC4] px-3 py-1.5 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5] disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel invite
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
