// Account verification rules shared by the app and the API routes.
//
// Data minimisation (POPIA s10): no ID numbers, student numbers or document uploads
// are collected. Each check uses the least personal information that still works.

export const ACCOUNT_TYPES = {
  student: { label: "Student", group: "youth", method: "Institution email (.ac.za) or admin review" },
  developer: { label: "Software developer / programmer", group: "youth", method: "GitHub account" },
  it_professional: { label: "IT professional", group: "youth", method: "GitHub account" },
  smme: { label: "SMME / business", group: "organization", method: "CIPC registration + admin review" },
  ngo: { label: "NGO / NPO", group: "organization", method: "NPO registration + admin review" },
};

export const STATUS = {
  unverified: { label: "Not verified", tone: "neutral" },
  pending: { label: "Pending review", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
};

// CIPC company/close-corporation registration number, e.g. 2019/123456/07.
const CIPC_RE = /^(19|20)\d{2}\/\d{6}\/\d{2}$/;
// Department of Social Development NPO number, e.g. 123-456 NPO (also accepts "123-456NPO").
const NPO_RE = /^\d{3}-\d{3}\s?NPO$/i;
const GITHUB_USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function normaliseRegistration(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
}

export function validateRegistration(accountType, value) {
  const v = normaliseRegistration(value);
  if (accountType === "smme") {
    return CIPC_RE.test(v) ? null : "Use your CIPC registration number, e.g. 2019/123456/07.";
  }
  if (accountType === "ngo") {
    return NPO_RE.test(v) || CIPC_RE.test(v)
      ? null
      : "Use your NPO number (e.g. 123-456 NPO) or, for an NPC, your CIPC number (e.g. 2019/123456/08).";
  }
  return null;
}

export function isGitHubUsername(value) {
  return GITHUB_USERNAME_RE.test(String(value || "").trim());
}

/** South African university/college emails end in .ac.za (e.g. student@uj.ac.za). */
export function isInstitutionEmail(email) {
  return /^[^@\s]+@[^@\s]+\.ac\.za$/i.test(String(email || "").trim());
}

/** Short one-time code a developer pastes into their GitHub bio to prove ownership. */
export function makeGitHubCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `GA-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export const POPIA_NOTICE_VERSION = "2026-11-27";
