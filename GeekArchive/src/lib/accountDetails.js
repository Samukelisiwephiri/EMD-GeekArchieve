// Details every account registers with. Shared by the sign-up form, the "complete your
// details" step (Google/GitHub sign-ups and older accounts) and the verification form.
// The database checks the same rules (see account_details in supabase/schema.sql).
//
// Private: only the account holder and admins can read these. Other users only ever
// see the display name (a student's name, or an organisation's name).
import { ACCOUNT_TYPES, normaliseRegistration, validateRegistration } from "./verification";

export const YOUTH_ACCOUNT_TYPES = ["student", "developer", "it_professional"];
export const ORG_ACCOUNT_TYPES = ["smme", "ngo"];

export const accountTypesFor = (group) => (group === "organization" ? ORG_ACCOUNT_TYPES : YOUTH_ACCOUNT_TYPES);
export const accountTypeLabel = (type) => ACCOUNT_TYPES[type]?.label || "";

export const emptyAccountDetails = (group) => ({
  fullName: "",
  phone: "",
  accountType: accountTypesFor(group)[0],
  institution: "",
  organizationName: "",
  registrationNumber: "",
});

/** "071 234 5678", "+27 71 234 5678" or "27712345678" -> "+27712345678"; "" if it isn't a SA mobile. */
export function normalisePhone(value) {
  const digits = String(value || "").replace(/[\s()-]/g, "");
  const local = digits.startsWith("+27") ? digits.slice(3) : digits.startsWith("27") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : null;
  return local && /^[6-8]\d{8}$/.test(local) ? `+27${local}` : "";
}

/**
 * Checks the details for a "youth" or "organization" account.
 * @returns {string} an error message, or "" when everything required is there.
 */
export function validateAccountDetails(details, group) {
  const d = details || {};
  const name = String(d.fullName || "").trim();
  if (name.length < 2 || !/\s/.test(name)) return "Enter your full name (first name and surname).";
  if (name.length > 120) return "That name is too long.";
  if (!normalisePhone(d.phone)) return "Enter a South African mobile number, e.g. 071 234 5678.";
  if (!accountTypesFor(group).includes(d.accountType)) {
    return group === "organization" ? "Choose SMME or NGO." : "Choose whether you are a student, developer or IT professional.";
  }
  if (d.accountType === "student" && !String(d.institution || "").trim()) {
    return "Enter your university or college.";
  }
  if (String(d.institution || "").trim().length > 150) return "That institution name is too long.";
  if (group === "organization") {
    const org = String(d.organizationName || "").trim();
    if (org.length < 2) return "Enter your organisation's registered name.";
    if (org.length > 150) return "That organisation name is too long.";
    const regError = validateRegistration(d.accountType, d.registrationNumber);
    if (regError) return regError;
  }
  return "";
}

/** The cleaned-up details to store. */
export function cleanAccountDetails(details, group) {
  const isOrg = group === "organization";
  return {
    fullName: String(details.fullName || "").trim().replace(/\s+/g, " "),
    phone: normalisePhone(details.phone),
    accountType: details.accountType,
    institution: !isOrg && String(details.institution || "").trim() ? String(details.institution).trim() : "",
    organizationName: isOrg ? String(details.organizationName || "").trim() : "",
    registrationNumber: isOrg ? normaliseRegistration(details.registrationNumber) : "",
  };
}

/** The name other people see: the student's name, or the organisation's name. */
export const displayNameFor = (details, group) =>
  group === "organization" ? details.organizationName || details.fullName : details.fullName;

// Supabase row <-> app
export const fromAccountDetailsRow = (row) =>
  row && {
    fullName: row.full_name || "",
    phone: row.phone || "",
    accountType: row.account_type,
    institution: row.institution || "",
    organizationName: row.organization_name || "",
    registrationNumber: row.registration_number || "",
  };
