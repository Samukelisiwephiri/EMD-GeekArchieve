"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import {
  accountTypeLabel,
  accountTypesFor,
  cleanAccountDetails,
  emptyAccountDetails,
  validateAccountDetails,
} from "../lib/accountDetails";

const labelCls = "mb-1 block text-xs font-semibold text-[#3B2314]";
const inputCls =
  "w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none";

/**
 * The required details for a "youth" or "organization" account. Controlled:
 * `value` is the details object and `onChange` receives the updated object.
 */
export function AccountDetailsFields({ group, value, onChange, idPrefix = "ad" }) {
  const isOrg = group === "organization";
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const id = (key) => `${idPrefix}-${key}`;
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={id("name")} className={labelCls}>
          {isOrg ? "Your full name (contact person)" : "Full name"}
        </label>
        <input id={id("name")} required autoComplete="name" value={value.fullName} onChange={set("fullName")} placeholder="e.g. Thandi Mokoena" className={inputCls} />
      </div>
      <div>
        <label htmlFor={id("phone")} className={labelCls}>Mobile number</label>
        <input id={id("phone")} required type="tel" inputMode="tel" autoComplete="tel" value={value.phone} onChange={set("phone")} placeholder="071 234 5678" className={inputCls} />
        <p className="mt-1 text-[11px] text-[#8A786D]">Private: only you and Geek Archive admins can see it.</p>
      </div>
      <div>
        <label htmlFor={id("type")} className={labelCls}>{isOrg ? "Organisation type" : "I am a"}</label>
        <select id={id("type")} required value={value.accountType} onChange={set("accountType")} className={inputCls}>
          {accountTypesFor(group).map((type) => (
            <option key={type} value={type}>{accountTypeLabel(type)}</option>
          ))}
        </select>
      </div>
      {!isOrg && (
        <div>
          <label htmlFor={id("institution")} className={labelCls}>
            University or college{" "}
            {value.accountType !== "student" && <span className="font-normal text-[#8A786D]">(optional)</span>}
          </label>
          <input id={id("institution")} required={value.accountType === "student"} value={value.institution} onChange={set("institution")} placeholder="e.g. University of Johannesburg" className={inputCls} />
        </div>
      )}
      {isOrg && (
        <>
          <div>
            <label htmlFor={id("org")} className={labelCls}>Registered organisation name</label>
            <input id={id("org")} required autoComplete="organization" value={value.organizationName} onChange={set("organizationName")} placeholder="e.g. Bra Joe's Tuckshop (Pty) Ltd" className={inputCls} />
          </div>
          <div>
            <label htmlFor={id("reg")} className={labelCls}>
              {value.accountType === "ngo" ? "NPO or NPC registration number" : "CIPC registration number"}
            </label>
            <input id={id("reg")} required value={value.registrationNumber} onChange={set("registrationNumber")} placeholder={value.accountType === "ngo" ? "123-456 NPO" : "2019/123456/07"} className={inputCls} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Asked after sign-in when an account has no registered details yet (Google/GitHub
 * sign-ups and accounts created before details were required). Can't be skipped.
 */
export function AccountDetailsGate({ open, group, initialName, onSave, onSignOut }) {
  const [value, setValue] = useState(() => ({ ...emptyAccountDetails(group), fullName: initialName || "" }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateAccountDetails(value, group);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      await onSave(cleanAccountDetails(value, group));
    } catch (err) {
      setError(err?.message || "Could not save your details. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onSignOut} title="Complete your details" subtitle="Required before you continue" size="md">
      <form onSubmit={submit} noValidate>
        <p className="mb-4 text-sm leading-relaxed text-[#3B2314]">
          Every Geek Archive account is registered with these details. They help us verify you and keep the
          platform safe.
        </p>
        <AccountDetailsFields group={group} value={value} onChange={setValue} idPrefix="gate" />
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">{error}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F] disabled:opacity-60">
            {busy ? "Saving…" : "Save and continue"}
          </button>
          <button type="button" onClick={onSignOut} className="rounded-xl border border-[#D8CFC4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3B2314]">
            Sign out
          </button>
        </div>
      </form>
    </Modal>
  );
}
