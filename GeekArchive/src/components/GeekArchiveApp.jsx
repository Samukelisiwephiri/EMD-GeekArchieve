"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Users,
  Code2,
  Palette,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Layers,
  LogIn,
  LogOut,
  ExternalLink,
  Search,
  UserRoundPlus,
  Link2,
  MapPin,
  Menu,
  X,
  Pencil,
  Trash2,
  Github,
  PlayCircle,
  Mail,
  MessageSquare,
  Send,
  Phone,
  Inbox,
  Lock,
  BadgeCheck,
  UserRound,
  Upload,
  RotateCcw,
} from "lucide-react";
import InteractiveAuthBackdrop from "./InteractiveAuthBackdrop";
import ProjectLinks, { VideoPlayer } from "./ProjectLinks";
import {
  Billboard,
  ProjectDetail,
  ProjectRow,
  ProjectTile,
  rowsFor,
  usePreviewSetting,
  useVideoSources,
} from "./ProjectTheatre";
import Modal from "./Modal";
import StudentProfile from "./StudentProfile";
import AiAnalysisPanel from "./AiAnalysisPanel";
import VerificationCenter, { VerifiedBadge } from "./VerificationCenter";
import AdminVerifications from "./AdminVerifications";
import AdminTeam from "./AdminTeam";
import AdminAccounts from "./AdminAccounts";
import { ConsentGate, PrivacyCenter, PrivacyNotice } from "./Privacy";
import { AccountDetailsFields, AccountDetailsGate } from "./AccountDetails";
import {
  accountTypesFor,
  cleanAccountDetails,
  displayNameFor,
  emptyAccountDetails,
  fromAccountDetailsRow,
  validateAccountDetails,
} from "../lib/accountDetails";
import { ACCOUNT_TYPES, POPIA_NOTICE_VERSION, isInstitutionEmail } from "../lib/verification";
import { CATEGORIES, CATEGORY_BY_ID, categoryLabel, suggestCategory } from "../lib/categories";
import GitHubImport from "./GitHubImport";
import SearchSuggest, { matchProject } from "./SearchSuggest";
import AiRecommendPanel from "./AiRecommendPanel";
import LandingSections from "./LandingSections";
import { parseGitHubRepo, toVideoEmbed, SUPPORTED_VIDEO_HINT } from "../lib/media";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  VIDEO_ACCEPT,
  checkVideoFile,
  hasDemoVideo,
  removeAllDemoVideos,
  removeDemoVideo,
  uploadDemoVideo,
} from "../lib/demoVideos";

// Comma-separated input -> trimmed list without blanks or case-insensitive duplicates.
const uniqueList = (value) => {
  const seen = new Set();
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// --- Supabase <-> app mapping for the `prototypes` table ---------------------------
// The embedding column is left out on purpose: it is large and the UI does not use it.
const PROTOTYPE_COLUMNS =
  "id, title, aliases, summary, description, repo_url, tech_stack, completion_pct, " +
  "missing_modules, domain, demo_video_url, demo_video_path, category, showcased, suggested_price, is_illustrative, included_tailoring, " +
  "created_by, owner_display_name, owner_role, created_at";

const ROLE_LABELS = { youth: "Youth Pod Talent", organization: "SMME / NGO", admin: "SMME / NGO" };

const fromPrototypeRow = (row) => ({
  id: row.id,
  title: row.title,
  aliases: row.aliases || [],
  summary: row.summary || "",
  description: row.description || "",
  repo: row.repo_url || "",
  demoVideo: row.demo_video_url || "",
  demoVideoPath: row.demo_video_path || "",
  category: row.category || "",
  showcased: row.showcased !== false,
  stack: row.tech_stack || [],
  completion: row.completion_pct,
  missing: row.missing_modules || [],
  estimatedValue:
    row.suggested_price == null ? null : `R${Number(row.suggested_price).toLocaleString("en-US")}`,
  domain: row.domain || "",
  illustrative: Boolean(row.is_illustrative),
  includedTailoring: row.included_tailoring || [],
  ownerId: row.created_by,
  ownerName: row.owner_display_name || "",
  ownerRole: ROLE_LABELS[row.owner_role],
  postedAt: row.created_at,
});

// Only the fields a poster may set. Owner, name and role are stamped by the database.
const toPrototypeRow = (project) => ({
  ...(project.title ? { title: project.title } : {}),
  summary: project.summary || "",
  description: project.description || "",
  repo_url: project.repo || null,
  demo_video_url: project.demoVideo || null,
  demo_video_path: project.demoVideoPath || null,
  category: project.category || null,
  ...(typeof project.showcased === "boolean" ? { showcased: project.showcased } : {}),
  tech_stack: project.stack || [],
  domain: project.domain || null,
});

// --- Supabase <-> app mapping for the `contact_requests` table ----------------------
const CONTACT_COLUMNS =
  "id, prototype_id, project_title, student_id, organization_id, organization_name, " +
  "message, reply_email, reply_phone, status, created_at";

const fromContactRow = (row) => ({
  id: row.id,
  projectId: row.prototype_id,
  projectTitle: row.project_title || "",
  studentId: row.student_id,
  orgId: row.organization_id,
  orgName: row.organization_name || "An organization",
  message: row.message,
  replyEmail: row.reply_email,
  replyPhone: row.reply_phone || "",
  status: row.status,
  createdAt: row.created_at,
});

const CONTACT_MESSAGE_MIN = 10;
const CONTACT_MESSAGE_MAX = 2000;

// --- Verification records (Supabase <-> app) ---------------------------------------
const VERIFICATION_COLUMNS =
  "user_id, account_type, status, method, institution, evidence_url, github_username, " +
  "org_name, registration_number, website, submitted_at, reviewed_at, review_note";

const fromVerificationRow = (row, extra = {}) => ({
  userId: row.user_id,
  accountType: row.account_type,
  status: row.status,
  method: row.method,
  institution: row.institution || "",
  evidenceUrl: row.evidence_url || "",
  githubUsername: row.github_username || "",
  orgName: row.org_name || "",
  registrationNumber: row.registration_number || "",
  website: row.website || "",
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at,
  reviewNote: row.review_note || "",
  userName: row.display_name || extra.userName || "",
  email: row.email || extra.email || "",
});

// Demo admin account for reviewing verification requests without Supabase.
const DEMO_ADMIN_EMAIL = "admin@geekarchive.demo";

// Demo mode has no real accounts, so a user is identified by their name.
const demoUserId = (name) => `demo:${String(name || "").trim().toLowerCase()}`;

// ["React", "react", "Flutter", ""] -> [{ key: "flutter", label: "Flutter", count: 1 },
//                                     { key: "react", label: "React", count: 2 }]
const countOptions = (values) => {
  const byKey = new Map();
  values.forEach((value) => {
    const spelling = String(value || "").trim();
    if (!spelling) return;
    const key = spelling.toLowerCase();
    const entry = byKey.get(key) || { key, count: 0, spellings: new Map() };
    entry.count += 1;
    entry.spellings.set(spelling, (entry.spellings.get(spelling) || 0) + 1);
    byKey.set(key, entry);
  });
  // Show the most common spelling; on a tie prefer one that starts with a capital.
  const startsUpper = (s) => (s[0] !== s[0].toLowerCase() ? 1 : 0);
  return [...byKey.values()]
    .map(({ key, count, spellings }) => ({
      key,
      count,
      label: [...spellings.entries()].sort(
        ([a, na], [b, nb]) => nb - na || startsUpper(b) - startsUpper(a)
      )[0][0],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// "Thandi Mokoena" -> "TM"
const initialsOf = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "?";


// "thandi.mokoena@example.co.za" -> "Thandi Mokoena"
const nameFromEmail = (email) =>
  email && email.includes("@")
    ? email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

const INITIAL_PROTOTYPES = [
  {
    id: "proto-1",
    title: "Imbewu Learn",
    summary: "AI-powered learning that preserves Indigenous knowledge across generations.",
    description:
      "Imbewu Learn is an AI-powered educational platform designed to preserve indigenous and generational knowledge and make it accessible to younger generations. The platform enables knowledge holders to digitally contribute cultural knowledge, while Imbewu Ask allows users to ask questions about traditions, languages, cultural practices and everyday indigenous knowledge. The platform aims to provide culturally relevant responses based on the user's cultural background and context. By combining AI with community-driven knowledge preservation, Imbewu Learn creates an interactive bridge between generations and helps ensure valuable African knowledge is not lost. Its vision is to grow from South Africa to a broader African platform for preserving, discovering and learning from indigenous knowledge.",
    repo: "",
    stack: ["AI"],
    completion: null,
    missing: [],
    estimatedValue: null,
    domain: "Education & Indigenous Knowledge",
  },
  {
    id: "proto-2",
    title: "RekaLoka",
    aliases: ["Reka Local"],
    summary: "An inclusive local marketplace that helps vendors grow and sell independently.",
    description:
      "RekaLoka is an inclusive, vendor-first digital marketplace that connects local vendors, informal traders, home growers and customers through one platform for buying and selling products and services. Its main purpose is to empower entrepreneurs with disabilities, particularly visually impaired business owners, by giving them accessible tools to manage and grow their businesses independently.",
    repo: "",
    stack: [],
    completion: null,
    missing: [],
    estimatedValue: null,
    domain: "Inclusive Local Commerce",
  },
  {
    id: "proto-3",
    title: "Hlokomela AI",
    summary: "Civic infrastructure monitoring that connects community reports, AI, and IoT sensors.",
    description:
      "Hlokomela AI is an AI-powered civic infrastructure platform that connects communities, municipalities and IoT devices in one system. Community members can report infrastructure problems through a digital platform, while AI assists with analysing and categorising reports, including images, to help identify potential issues and prioritise them. Its IoT component uses physical sensors connected to an ESP32 to monitor infrastructure conditions and send real-time readings to a dashboard. Municipalities can view community reports and sensor data through a dedicated dashboard, allowing them to identify issues, monitor infrastructure and respond more efficiently. The platform creates a continuous feedback loop: communities report problems, AI helps interpret the information, IoT devices provide real-time data, and municipalities use the combined information to make informed decisions and take action. It can expand to additional municipalities and infrastructure use cases as the business grows.",
    repo: "",
    stack: ["AI", "IoT", "ESP32"],
    completion: null,
    missing: [],
    estimatedValue: null,
    domain: "Civic Infrastructure & IoT",
  },
  {
    id: "proto-4",
    title: "Inkanini RS485",
    summary: "An industrial OT intrusion-detection firewall with live RS485 bus monitoring.",
    description:
      "Inkanini RS485 is an industrial operational technology (OT) intrusion detection firewall and RS485 bus telemetry monitoring system built by Team Embedded Intelligence for HackSecure 2026. It protects industrial RS485 serial communication lines and perimeter/sensor nodes from unauthorized write attacks and physical line faults, pairing hardware-level isolation with a live web monitoring dashboard.",
    repo: "",
    stack: ["RS485", "OT security", "Web dashboard"],
    completion: null,
    missing: [],
    estimatedValue: null,
    domain: "Industrial OT Security & Telemetry",
  },
  {
    id: "example-kasi-ledger",
    title: "KasiLedger",
    summary: "An illustrative mobile stock and customer-credit tracker for neighborhood shops.",
    description:
      "Illustrative example concept: a mobile-friendly tool for a neighborhood shop to record stock, sales, and customer credit in one place. This sample package shows how an existing project could be tailored for a local business.",
    repo: "",
    stack: [],
    completion: 70,
    missing: [],
    estimatedValue: "R14,500",
    domain: "SMME Commerce & Local Retail",
    illustrative: true,
    includedTailoring: [
      "Low-data stock and credit flows",
      "Custom product and category list",
      "Shop handover and usage guide",
    ],
  },
  {
    id: "example-community-aid",
    title: "UbuntuAid",
    summary: "An illustrative grant and voucher hub for community organizations.",
    description:
      "Illustrative example concept: a community platform for collecting grant applications, tracking voucher status, and preparing a simple impact summary for an NGO or community organization.",
    repo: "",
    stack: [],
    completion: 62,
    missing: [],
    estimatedValue: "R18,500",
    domain: "NGO & Social Impact",
    illustrative: true,
    includedTailoring: [
      "Organization-specific application fields",
      "Grant and voucher status dashboard",
      "Simple impact export",
    ],
  },
  {
    id: "example-mzansi-fleet",
    title: "MzansiFleet",
    summary: "An illustrative trip and route log for a local taxi or delivery operator.",
    description:
      "Illustrative example concept: a simple operations tool for logging routes and trips, tracking fuel costs, and helping a small taxi or delivery team review its daily activity.",
    repo: "",
    stack: [],
    completion: 55,
    missing: [],
    estimatedValue: "R21,000",
    domain: "Logistics & Mobility",
    illustrative: true,
    includedTailoring: [
      "Driver-friendly route and trip log",
      "Fuel and trip-cost summary",
      "Team handover checklist",
    ],
  },
];


// Everyday words that say nothing about the need ("we run a shop and ...").
const MATCH_STOPWORDS = new Set(
  "and the for our are was were with that this from have has had but not you your they them their its can will would could should into about just than then when what which who how all any each some very also only own run need needs want help lose lot lots".split(" ")
);

// A pod's stage, worked out from the students' answers to their invitations.
function podStageFor(pod) {
  if (pod.signedOff) return "Delivered & Signed Off";
  const statuses = pod.members.filter((m) => m.userId).map((m) => m.status || "accepted");
  if (statuses.includes("accepted")) return "Students accepted: work in progress";
  if (statuses.includes("invited")) return "Waiting for students to accept";
  return "Looking for students";
}

// Example offers on the Received offers tab, so students can see how offers work.
// They live only in the browser: answering one sends nothing and saves nothing.
const SAMPLE_OFFERS = [
  {
    id: "sample-spaza",
    orgName: "Mamelodi Spaza Collective (sample)",
    projectTitle: "Stock & Sales Tracker",
    offer: "R3 500 stipend for 4 weeks, plus a reference letter",
    offerMessage:
      "Hi! We run 12 spaza shops and still count stock on paper. We loved your demo video and would like you to help us adapt it for our shops.",
    need: "Know what's selling and when to reorder, without spreadsheets.",
    role: "Developer",
    task: "Adapt the tracker to work offline on low-cost Android phones.",
  },
  {
    id: "sample-ngo",
    orgName: "Ikhaya Youth Care NGO (sample)",
    projectTitle: "Volunteer Scheduling App",
    offer: "Certificate of contribution and a paid data bundle each week",
    offerMessage:
      "We coordinate 40 volunteers by WhatsApp and people often miss shifts. Could you help us make the scheduling simpler?",
    need: "Volunteers should see and swap their shifts on their phones.",
    role: "UI/UX Designer",
    task: "Design a simple shift calendar that works on small screens.",
  },
  {
    id: "sample-salon",
    orgName: "Glow Up Salon, Soweto (sample)",
    projectTitle: "Bookings & Reminders",
    offer: "R2 000 once the booking page is live",
    offerMessage: "",
    need: "Clients book by phone and forget appointments.",
    role: "Business Student",
    task: "Work out pricing for deposits and SMS reminders.",
  },
];

const MEMBER_STATUS = {
  invited: { label: "Offer sent · waiting for an answer", className: "bg-[#FBF6E6] text-[#6B5420] border-[#E8D9A8]" },
  accepted: { label: "Accepted", className: "bg-[#EEF7E8] text-[#2F5A2F] border-[#B9DBA9]" },
  declined: { label: "Declined", className: "bg-[#FBEDEA] text-[#8A2C1E] border-[#E7C3BC]" },
};

// Shown in place of features that need a verified account.
function VerifyGate({ title, text, status, onVerify, className = "" }) {
  return (
    <div className={`rounded-2xl border border-[#C8DD9F] bg-gradient-to-br from-[#F4F9EC] to-white p-6 ${className}`}>
      <BadgeCheck className="h-7 w-7 text-[#5E7A5E]" />
      <h2 className="mt-3 text-lg font-bold text-[#163126]">{title}</h2>
      <p className="mt-1 text-sm text-[#3E4F46]">{text}</p>
      {status === "pending" && (
        <p className="mt-3 rounded-lg bg-[#FBF5E6] px-3 py-2 text-xs text-[#6B5320]">Your request is being reviewed.</p>
      )}
      <button
        type="button"
        onClick={onVerify}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F]"
      >
        <BadgeCheck className="h-4 w-4" />
        {status === "pending" ? "View my request" : "Verify my account"}
      </button>
    </div>
  );
}

// Small count bubble on a menu tab (e.g. unread messages). Screen readers hear ", 2 unread".
function TabBadge({ count }) {
  if (!count) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="min-w-[18px] rounded-full bg-[#C2410C] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white"
      >
        {count > 9 ? "9+" : count}
      </span>
      <span className="sr-only">, {count} unread</span>
    </>
  );
}

export default function GeekArchiveApp() {
  const [showAuthLanding, setShowAuthLanding] = useState(true);
  const [authMode, setAuthMode] = useState("signin");
  const [authRole, setAuthRole] = useState("Youth Pod Talent");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  // Email address waiting for confirmation (shows "Send the confirmation email again").
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  // Password recovery: true after the user opens the reset link from their email.
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState({ type: "", text: "" });
  const [user, setUser] = useState(
    isSupabaseConfigured
      ? null
      : {
          id: demoUserId("Naledi Khumalo"),
          name: "Naledi Khumalo",
          role: "Youth Pod Talent",
          provider: "Demo",
        }
  );

  const [activeTab, setActiveTab] = useState("talent");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the mobile menu on Esc, or when the window grows to the desktop layout.
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [mobileMenuOpen]);
  // With Supabase, projects come from the database (filtered by its access rules).
  const [prototypes, setPrototypes] = useState(isSupabaseConfigured ? [] : INITIAL_PROTOTYPES);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsLoadError, setProjectsLoadError] = useState("");
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  // Contact requests from SMMEs/NGOs to students (one per organization per project).
  const [contactRequests, setContactRequests] = useState([]);
  const [contactFormProjectId, setContactFormProjectId] = useState(null);
  // The project an SMME/NGO has opened (its demo video autoplays).
  const [openProjectId, setOpenProjectId] = useState(null);
  // The student whose profile an SMME/NGO is viewing.
  const [viewProfileUserId, setViewProfileUserId] = useState(null);
  const [contactDraft, setContactDraft] = useState({ message: "", email: "", phone: "" });
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState("");
  const [respondingRequestId, setRespondingRequestId] = useState(null);
  const [messagesError, setMessagesError] = useState("");
  // Real pods: requested by verified SMMEs/NGOs, staffed with verified students.
  const [pods, setPods] = useState([]);
  const [podRequest, setPodRequest] = useState({ status: "idle", message: "" });
  const [archiveQuery, setArchiveQuery] = useState("");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverSkill, setDiscoverSkill] = useState(""); // lower-case skill, "" = all
  const [discoverCategory, setDiscoverCategory] = useState(""); // category id, "" = all
  const [talentProfiles, setTalentProfiles] = useState([]);
  const [newTalent, setNewTalent] = useState({
    name: "Naledi Khumalo",
    role: "Developer",
    skills: "",
    portfolio: "",
    availability: "",
    preferredFocus: "",
    strengthArea: "",
    experienceLevel: "Student / Junior",
    location: "",
  });
  // Verification (by user id), POPIA consent and the related windows.
  const [verifications, setVerifications] = useState({});
  const [consents, setConsents] = useState({});
  const [adminRequests, setAdminRequests] = useState([]);
  const [showVerify, setShowVerify] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [signupConsent, setSignupConsent] = useState(false);
  // Sign-up details (required) and the password confirmation.
  const [signupDetails, setSignupDetails] = useState(() => emptyAccountDetails("youth"));
  const [authPassword2, setAuthPassword2] = useState("");
  // Registered details per user id. With Supabase only the signed-in user's are loaded.
  const [accountDetails, setAccountDetails] = useState({});
  // Demo mode: accounts registered in this tab, by email, so signing in finds them again.
  const [demoAccounts, setDemoAccounts] = useState({});
  // Admin team (Team tab). Demo mode keeps it in the page, starting with the built-in demo admin.
  const [adminTeam, setAdminTeam] = useState({ admins: [], invites: [] });
  const [adminTeamLoading, setAdminTeamLoading] = useState(false);
  // Admin: every account (Accounts tab).
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminAccountsLoading, setAdminAccountsLoading] = useState(false);
  // With Supabase: whose verification status has been loaded (so a verified user never
  // sees a flash of "Verify your account" while it loads).
  const [verificationCheckedFor, setVerificationCheckedFor] = useState(null);
  const [demoTeam, setDemoTeam] = useState(() => ({
    admins: [{ userId: "demo:admin", name: "Geek Archive Admin", email: DEMO_ADMIN_EMAIL, since: new Date().toISOString() }],
    invites: [],
  }));
  // Google/GitHub sign-in buttons only appear when that method is switched on in Supabase
  // (Authentication -> Providers). Demo mode shows both.
  const [authProviders, setAuthProviders] = useState(() => (supabase ? { google: false, github: false } : { google: true, github: true }));
  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (!cancelled && settings?.external) {
          setAuthProviders({ google: Boolean(settings.external.google), github: Boolean(settings.external.github) });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardRole = user?.role || authRole;
  const isYouth = dashboardRole === "Youth Pod Talent";
  const isAdmin = Boolean(user?.isAdmin);
  const myVerification = user?.id ? verifications[user.id] || null : null;
  const isVerified = isAdmin || myVerification?.status === "verified";
  // Only claim someone isn't verified once their status has actually loaded.
  const verificationKnown = !supabase || isAdmin || (Boolean(user?.id) && verificationCheckedFor === user.id);
  // With Supabase, row-level security only returns verified students' work, so every
  // loaded row is from a verified owner. In demo mode we check the local records.
  const isOwnerVerified = (ownerId) => (supabase ? true : verifications[ownerId]?.status === "verified");
  // Organisations must be verified to see student work, and students must be verified to be shown.
  const canSeeStudentWork = (ownerId) => isVerified && isOwnerVerified(ownerId);
  const consentAt = user?.consentAt || (user?.id ? consents[user.id] : null) || null;
  const needsConsent = Boolean(user) && !showAuthLanding && !consentAt;
  const myDetails = user?.id ? accountDetails[user.id] || null : null;
  const myGroup = isYouth ? "youth" : "organization";
  // Every account needs its registered details (Google/GitHub sign-ups and older accounts
  // are asked after sign-in). With Supabase, wait until they've been looked up.
  const needsDetails =
    Boolean(user) && !showAuthLanding && !isAdmin && !needsConsent && (!supabase || user.detailsChecked) && !myDetails;
  const navTabs = isAdmin
    ? [
        { id: "verifications", label: "Verifications" },
        { id: "accounts", label: "Accounts" },
        { id: "team", label: "Team" },
        { id: "discover", label: "Discover projects" },
        { id: "archive", label: "Browse projects" },
      ]
    : isYouth
    ? [
        { id: "opportunities", label: "Received offers" },
        { id: "talent", label: "My profile" },
        { id: "myprojects", label: "My projects" },
        { id: "messages", label: "Messages" },
        { id: "pods", label: "My pods" },
      ]
    : [
        { id: "match", label: "Describe a need" },
        { id: "discover", label: "Discover projects" },
        { id: "archive", label: "Browse projects" },
        { id: "pods", label: "Pod workspace" },
      ];

  const [problemBrief, setProblemBrief] = useState(
    "I run a neighborhood spaza shop and lose track of daily stock counts and customer credit balances on paper."
  );
  const [orgType, setOrgType] = useState("SMME");
  const [matchedResult, setMatchedResult] = useState({
    translatedSpec: problemBrief,
    prototype: null,
    pod: [
      { role: "Developer", assignee: "No profile yet — add talent", task: "Complete core modules & validation" },
      { role: "UI/UX Designer", assignee: "No profile yet — add talent", task: "Design an accessible mobile-first flow" },
      { role: "Business Student", assignee: "No profile yet — add talent", task: "Build the launch and handover plan" },
    ],
  });

  const [newRepoTitle, setNewRepoTitle] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoVideo, setNewRepoVideo] = useState("");
  // Uploaded demo video for the form: a storage path (Supabase) or a blob: URL (demo mode).
  const [newRepoVideoPath, setNewRepoVideoPath] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [respondingPodId, setRespondingPodId] = useState(null);
  const [podInviteError, setPodInviteError] = useState("");
  // Example offers and the student's practice answers (never saved).
  const [sampleAnswers, setSampleAnswers] = useState({});
  // What an SMME/NGO offers the students when requesting a pod, plus a short message.
  const [podOffer, setPodOffer] = useState("");
  const [podMessage, setPodMessage] = useState("");
  const [newRepoCategory, setNewRepoCategory] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoStack, setNewRepoStack] = useState("");
  const [auditNote, setAuditNote] = useState("");


  // Profiles belong to an account (userId), not a name, so students can rename themselves.
  const ownTalentProfile = user?.id
    ? talentProfiles.find((profile) => profile.userId === user.id) || null
    : null;
  const [editingTalent, setEditingTalent] = useState(false);
  const [talentSaving, setTalentSaving] = useState(false);
  const [talentError, setTalentError] = useState("");
  const [confirmDeleteTalent, setConfirmDeleteTalent] = useState(false);
  const [talentDeleting, setTalentDeleting] = useState(false);
  const showTalentForm = !ownTalentProfile || editingTalent;

  // Pods this organisation requested / this student is assigned to.
  const orgPods = pods.filter((pod) => pod.orgId && pod.orgId === user?.id);
  const myRoleIn = (pod) => pod.members.find((m) => m.userId && m.userId === user?.id);
  // Pods the student is invited to or accepted (a declined invitation disappears).
  const myPods = pods.filter((pod) => myRoleIn(pod) && myRoleIn(pod).status !== "declined");
  const myOpenPods = myPods.filter((pod) => !pod.signedOff);
  const myActivePods = myOpenPods.filter((pod) => myRoleIn(pod).status === "accepted");

  // Real accounts: when Supabase keys are set, restore the session and follow sign-in changes.
  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;

    const applySession = async (session) => {
      if (cancelled) return;
      if (!session) {
        setUser(null);
        setShowAuthLanding(true);
        return;
      }
      const authUser = session.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role, popia_consent_at")
        .eq("id", authUser.id)
        .maybeSingle();
      const { data: detailsRow } = await supabase
        .from("account_details")
        .select("full_name, phone, account_type, institution, organization_name, registration_number")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (cancelled) return;
      setAccountDetails(detailsRow ? { [authUser.id]: fromAccountDetailsRow(detailsRow) } : {});
      const storedRole = profile?.role || authUser.user_metadata?.role;
      const isAdminAccount = storedRole === "admin";
      const role = isAdminAccount ? "Admin" : storedRole === "organization" ? "SMME / NGO" : "Youth Pod Talent";
      const name =
        profile?.display_name ||
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.full_name ||
        nameFromEmail(authUser.email) ||
        "Member";
      setUser({
        id: authUser.id,
        name,
        role,
        email: authUser.email || "",
        provider: authUser.app_metadata?.provider || "email",
        isAdmin: isAdminAccount,
        consentAt: profile?.popia_consent_at || null,
        detailsChecked: true,
      });
      setNewTalent((current) => ({ ...current, name }));
      setActiveTab(isAdminAccount ? "verifications" : role === "Youth Pod Talent" ? "talent" : "match");
      setShowAuthLanding(false);
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecoveringPassword(true);
      // Deferred so Supabase isn't queried from inside its own auth callback.
      setTimeout(() => applySession(session), 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Load projects from Supabase whenever a real (non-demo) user signs in.
  // Row-level security decides what comes back: SMMEs/NGOs get every active
  // project; youth get only their own posts and projects they're assigned to.
  const signedInUserId = user?.id && !user.id.startsWith("demo:") ? user.id : null;
  useEffect(() => {
    if (!supabase || !signedInUserId) return undefined;
    let cancelled = false;
    setProjectsLoading(true);
    setProjectsLoadError("");
    supabase
      .from("prototypes")
      .select(PROTOTYPE_COLUMNS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setProjectsLoadError(`Could not load projects: ${error.message}`);
        } else {
          setPrototypes((data || []).map(fromPrototypeRow));
        }
        setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedInUserId]);

  // Load contact requests. RLS returns only requests this person sent (SMME/NGO)
  // or received (student).
  useEffect(() => {
    if (!supabase || !signedInUserId) return undefined;
    let cancelled = false;
    setMessagesError("");
    supabase
      .from("contact_requests")
      .select(CONTACT_COLUMNS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setMessagesError(`Could not load messages: ${error.message}`);
        else setContactRequests((data || []).map(fromContactRow));
      });
    return () => {
      cancelled = true;
    };
  }, [signedInUserId]);

  // Load talent profiles. Students get their own; SMMEs/NGOs get every student's
  // (row-level security enforces both). Names come from the account/projects.
  useEffect(() => {
    if (!supabase || !signedInUserId) return undefined;
    let cancelled = false;
    let query = supabase
      .from("talent_profiles")
      .select(
        "user_id, role, skills, portfolio_url, availability, preferred_focus, strength_area, experience_level, location"
      );
    if (isYouth) query = query.eq("user_id", signedInUserId);
    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        if (isYouth) setTalentError(`Could not load your profile: ${error.message}`);
        return;
      }
      setTalentProfiles(
        (data || []).map((row) => ({
          id: `talent-${row.user_id}`,
          userId: row.user_id,
          name: row.user_id === signedInUserId ? user?.name || "" : "",
          role: row.role,
          skills: row.skills || [],
          portfolio: row.portfolio_url || "",
          availability: row.availability || "",
          preferredFocus: row.preferred_focus || "",
          strengthArea: row.strength_area || "",
          experienceLevel: row.experience_level || "Student / Junior",
          location: row.location || "",
        }))
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInUserId, isYouth]);

  useEffect(() => {
    if (supabase && signedInUserId) loadPods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInUserId]);

  // Load this user's verification (and, for admins, the review queue).
  useEffect(() => {
    if (!supabase || !signedInUserId) return undefined;
    let cancelled = false;
    (async () => {
      let { data } = await supabase
        .from("verifications")
        .select(VERIFICATION_COLUMNS)
        .eq("user_id", signedInUserId)
        .maybeSingle();
      // Back from linking GitHub: re-submit so the database checks the linked identity.
      let pendingGitHub = null;
      try {
        pendingGitHub = window.localStorage.getItem("ga-verify-github");
        if (pendingGitHub) window.localStorage.removeItem("ga-verify-github");
      } catch {
        pendingGitHub = null;
      }
      if (pendingGitHub && data?.status !== "verified") {
        const res = await supabase
          .from("verifications")
          .upsert({ user_id: signedInUserId, account_type: pendingGitHub, method: "github_oauth" }, { onConflict: "user_id" })
          .select(VERIFICATION_COLUMNS)
          .single();
        if (!res.error) data = res.data;
      }
      if (cancelled) return;
      if (data) setVerifications({ [signedInUserId]: fromVerificationRow(data) });
      setVerificationCheckedFor(signedInUserId);
      if (user?.isAdmin) {
        const { data: rows } = await supabase.rpc("admin_list_verifications");
        if (!cancelled && rows) setAdminRequests(rows.map((row) => fromVerificationRow(row)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInUserId, user?.isAdmin]);

  const handleAuthSubmit = async (e, providerLabel = "Email") => {
    if (e) e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    const isOAuth = providerLabel === "Google" || providerLabel === "GitHub";

    const signupGroup = authRole === "SMME / NGO" ? "organization" : "youth";
    const isEmailSignup = !isOAuth && authMode === "signup";
    if (isEmailSignup) {
      const problem = validateAccountDetails(signupDetails, signupGroup);
      if (problem) {
        setAuthError(problem);
        return;
      }
      if (authPassword.length < 8) {
        setAuthError("Choose a password of at least 8 characters.");
        return;
      }
      if (authPassword !== authPassword2) {
        setAuthError("The two passwords don't match.");
        return;
      }
    }
    if (isEmailSignup && !signupConsent) {
      setAuthError("Please agree to the privacy notice to create an account.");
      return;
    }
    const signupClean = isEmailSignup ? cleanAccountDetails(signupDetails, signupGroup) : null;

    if (supabase) {
      setAuthLoading(true);
      try {
        if (isOAuth) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: providerLabel.toLowerCase(),
            options: { redirectTo: window.location.origin },
          });
          if (error) throw error;
          return; // The browser now redirects to the provider.
        }
        if (authMode === "signup") {
          const { data, error } = await supabase.auth.signUp({
            email: authEmail.trim(),
            password: authPassword,
            options: {
              // The link in the confirmation email returns here (must be in Supabase's Redirect URLs).
              emailRedirectTo: window.location.origin,
              data: {
                display_name: displayNameFor(signupClean, signupGroup),
                full_name: signupClean.fullName,
                phone: signupClean.phone,
                account_type: signupClean.accountType,
                institution: signupClean.institution,
                organization_name: signupClean.organizationName,
                registration_number: signupClean.registrationNumber,
                role: authRole === "SMME / NGO" ? "organization" : "youth",
                popia_consent_at: new Date().toISOString(),
                popia_notice_version: POPIA_NOTICE_VERSION,
              },
            },
          });
          if (error) throw error;
          if (!data.session) {
            setAuthNotice(
              `We sent a confirmation link to ${authEmail.trim()}. Open it to confirm your account, then sign in. ` +
                "Check your spam folder if it isn't there in a few minutes."
            );
            setUnconfirmedEmail(authEmail.trim());
            setAuthMode("signin");
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: authEmail.trim(),
            password: authPassword,
          });
          if (error) throw error;
        }
        setAuthPassword("");
        setAuthPassword2("");
      } catch (err) {
        if (err?.code === "email_not_confirmed" || /email not confirmed/i.test(err?.message || "")) {
          setAuthError(
            "Your email address isn't confirmed yet. Open the confirmation link we emailed you (check spam too), " +
              "or send it again below."
          );
          setUnconfirmedEmail(authEmail.trim());
        } else {
          setAuthError(err?.message || "Something went wrong. Please try again.");
        }
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // Demo mode (no Supabase keys): nothing is verified, a local demo user is created.
    const derivedName = isOAuth
      ? providerLabel === "GitHub"
        ? "Kagiso Mokoena"
        : "Zinhle Ndlovu"
      : nameFromEmail(authEmail) || "Tshepo Molefe";

    const emailKey = authEmail.trim().toLowerCase();
    const builtInDemoAdmin = !isOAuth && emailKey === DEMO_ADMIN_EMAIL;
    const teamAdmin = !isOAuth && demoTeam.admins.find((a) => a.email === emailKey && a.userId !== "demo:admin");
    const invitedAdmin = !isOAuth && demoTeam.invites.some((i) => i.email === emailKey);
    const demoAdmin = builtInDemoAdmin;
    const registered = !isOAuth && !isEmailSignup ? demoAccounts[emailKey] : null;
    // If this demo user already saved a profile, keep the name they chose there.
    const demoId = demoAdmin
      ? "demo:admin"
      : registered?.id || demoUserId(signupClean ? displayNameFor(signupClean, signupGroup) : derivedName);
    const displayName = demoAdmin
      ? "Geek Archive Admin"
      : signupClean
        ? displayNameFor(signupClean, signupGroup)
        : talentProfiles.find((profile) => profile.userId === demoId)?.name || registered?.name || derivedName;
    if (signupClean && !demoAdmin) {
      setAccountDetails((current) => ({ ...current, [demoId]: signupClean }));
      setDemoAccounts((current) => ({ ...current, [emailKey]: { id: demoId, name: displayName } }));
    }
    if (!isOAuth && authMode === "signup" && signupConsent) {
      setConsents((current) => ({ ...current, [demoId]: current[demoId] || new Date().toISOString() }));
    }
    // Demo stand-in for the database's invite rule: an invited email becomes an admin on sign-in.
    const becomesAdmin = demoAdmin || Boolean(teamAdmin) || invitedAdmin;
    if (invitedAdmin) {
      setDemoTeam((current) => ({
        admins: [...current.admins, { userId: demoId, name: displayName, email: emailKey, since: new Date().toISOString() }],
        invites: current.invites.filter((i) => i.email !== emailKey),
      }));
    }
    setUser({
      id: demoId,
      email: isOAuth ? "" : authEmail.trim(),
      name: displayName,
      role: becomesAdmin ? "Admin" : authRole,
      provider: providerLabel,
      isAdmin: becomesAdmin,
    });
    setNewTalent((current) => ({ ...current, name: displayName }));
    setActiveTab(becomesAdmin ? "verifications" : authRole === "Youth Pod Talent" ? "talent" : "match");
    setShowAuthLanding(false);
  };

  const handleResendConfirmation = async () => {
    if (!supabase || !unconfirmedEmail) return;
    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(
        /rate|seconds|limit/i.test(error.message || "")
          ? "Too many emails were sent just now. Please wait a minute and try again."
          : error.message || "Couldn't send the email. Please try again."
      );
      return;
    }
    setAuthNotice(`Confirmation email sent again to ${unconfirmedEmail}. Check your inbox and spam folder.`);
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setAuthNotice("");
    if (!authEmail.trim().includes("@")) {
      setAuthError("Enter your email address above first, then click “Forgot password?”.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
      redirectTo: window.location.origin,
    });
    setAuthLoading(false);
    // Same message either way, so the form doesn't reveal which emails have accounts.
    if (error && error.status !== 429) {
      setAuthError(error.message);
      return;
    }
    setAuthNotice(
      error ? "Too many requests. Please wait a minute and try again." : "If that email has an account, we've sent a link to reset the password."
    );
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setRecoveryMessage({ type: "error", text: "Use at least 8 characters." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setRecoveryMessage({ type: "error", text: error.message });
      return;
    }
    setNewPassword("");
    setRecoveryMessage({ type: "ok", text: "Your password has been changed." });
    setRecoveringPassword(false);
  };

  const handleSignOut = async (options) => {
    if (supabase) {
      if (options?.localOnly === true) {
        // After deleting an account, the server has already removed the user and all its
        // sessions, so there is nothing to revoke: a server sign-out would only be refused
        // (403). Just forget the saved session in this browser.
        try {
          window.localStorage.removeItem(supabase.auth.storageKey);
        } catch {
          // storage blocked: the session goes when the tab closes
        }
      } else {
        await supabase.auth.signOut();
      }
      // The next person must only see what the database allows them to.
      setPrototypes([]);
      setContactRequests([]);
      setTalentProfiles([]);
      setPods([]);
    }
    setUser(null);
    setShowVerify(false);
    setShowPrivacy(false);
    setAdminRequests([]);
    if (supabase) setVerifications({});
    setEditingTalent(false);
    setTalentError("");
    setConfirmDeleteTalent(false);
    setOpenProjectId(null);
    clearProjectForm();
    setConfirmDeleteId(null);
    closeContactForm();
    setMessagesError("");
    // Pod messages belong to the person who was signed in.
    setPodRequest({ status: "idle", message: "" });
    setPodInviteError("");
    setAuthPassword("");
    setAuthMode("signin");
    setShowAuthLanding(true);
  };

  const handleExplorePlatform = () => {
    const role = authRole;
    const name = user?.name || "Preview User";
    setUser((current) => ({
      id: current?.id || demoUserId(name),
      name,
      role,
      provider: current?.provider || "Preview",
    }));
    setNewTalent((current) => ({ ...current, name }));
    setActiveTab(role === "Youth Pod Talent" ? "talent" : "match");
    setShowAuthLanding(false);
  };

  const handleTranslateAndMatch = (e) => {
    e.preventDefault();
    const text = problemBrief.toLowerCase();
    const searchTerms = text
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2 && !MATCH_STOPWORDS.has(term));
    const rankedProjects = prototypes
      .filter(
        (project) =>
          project.ownerRole !== "Youth Pod Talent" ||
          (project.showcased !== false && hasDemoVideo(project) && canSeeStudentWork(project.ownerId))
      )
      .map((project) => {
        const searchable = [
          project.title,
          project.domain,
          categoryLabel(project.category),
          project.summary,
          project.description,
          ...(project.aliases || []),
          ...project.stack,
        ]
          .join(" ")
          .toLowerCase();
        const relevance = searchTerms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
        // Real, verified student work that fits the brief comes before the built-in examples.
        const isStudentWork = project.ownerRole === "Youth Pod Talent" && !project.illustrative;
        return { project, score: relevance + (isStudentWork && relevance >= 2 ? 2 : 0) };
      })
      .sort((a, b) => b.score - a.score);
    const chosenProto = rankedProjects[0]?.score > 0 ? rankedProjects[0].project : null;
    const findTalentProfile = (role) => {
      const candidates = talentDirectory.filter(
        (profile) => profile.role === role && canSeeStudentWork(profile.userId)
      );
      if (!candidates.length) return null;
      const normalizedBrief = text.replace(/[^a-z0-9]+/g, " ").trim();
      const matched = candidates.find((profile) =>
        profile.skills.some((skill) =>
          normalizedBrief.includes(skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
        )
      );
      return matched || candidates[0];
    };
    const developerProfile = findTalentProfile("Developer");
    const designerProfile = findTalentProfile("UI/UX Designer");
    const businessProfile = findTalentProfile("Business Student");

    setMatchedResult({
      translatedSpec: problemBrief.trim(),
      prototype: chosenProto,
      pod: [
        {
          role: "Developer",
          assignee: developerProfile
            ? `${developerProfile.name} · ${developerProfile.availability}`
            : "No profile yet — add talent",
          profile: developerProfile,
          task: chosenProto
            ? `Finish core modules & harden ${chosenProto.stack[0] || "core"} endpoints`
            : "Review the brief and select a suitable project",
        },
        {
          role: "UI/UX Designer",
          assignee: designerProfile
            ? `${designerProfile.name} · ${designerProfile.availability}`
            : "No profile yet — add talent",
          profile: designerProfile,
          task: "Craft accessible mobile-first screens & low-data states",
        },
        {
          role: "Business Student",
          assignee: businessProfile
            ? `${businessProfile.name} · ${businessProfile.availability}`
            : "No profile yet — add talent",
          profile: businessProfile,
          task: `Create ${orgType} adoption plan, pricing & handover guide`,
        },
      ],
    });
  };

  const handleIngestPrototype = async (e) => {
    e.preventDefault();
    // SMMEs/NGOs only view projects; posting is for youth talent.
    if (!isYouth || !newRepoTitle.trim() || projectSaving) return;
    setProjectError("");

    const created = {
      id: `proto-${Date.now()}`,
      title: newRepoTitle.trim(),
      summary: newRepoDescription.trim().split(/[.!?]/)[0] || "",
      description: newRepoDescription.trim(),
      repo: parseGitHubRepo(newRepoUrl)?.url || newRepoUrl.trim(),
      demoVideo: newRepoVideo.trim(),
      demoVideoPath: newRepoVideoPath,
      // Pick from the form, or guess from what they wrote.
      category: newRepoCategory || suggestCategory(newRepoTitle, newRepoDescription, newRepoStack, auditNote),
      showcased: true,
      stack: uniqueList(newRepoStack),
      completion: null,
      missing: [],
      estimatedValue: null,
      domain: auditNote.trim(),
      ownerId: user?.id,
      ownerName: user?.name,
      ownerRole: user?.role,
      postedAt: new Date().toISOString(),
    };
    if (created.repo && !parseGitHubRepo(created.repo)) {
      setProjectError("The GitHub link should look like https://github.com/your-name/your-repo");
      return;
    }
    if (videoUploading) {
      setProjectError("Your demo video is still uploading. Wait for it to finish, then save.");
      return;
    }
    if (created.demoVideo && !toVideoEmbed(created.demoVideo)) {
      setProjectError(`That demo video link can't be played. Use ${SUPPORTED_VIDEO_HINT}.`);
      return;
    }
    if (!created.demoVideoPath && !created.demoVideo) {
      setProjectError("Add a demo video of your project. Organisations only see projects with a demo.");
      return;
    }
    const titleKey = created.title.toLowerCase();
    const isOwnProject = (project) => project.ownerId === user?.id;
    const hasName = (project) =>
      project.title.toLowerCase() === titleKey ||
      (project.aliases || []).some((alias) => alias.toLowerCase() === titleKey);

    let existing;
    let merged;
    if (editingProjectId) {
      // Editing: the form holds the full new version of the project, so empty fields clear.
      existing = prototypes.find((project) => project.id === editingProjectId && isOwnProject(project));
      if (!existing) {
        setProjectError("You can only edit your own projects.");
        return;
      }
      const clash = prototypes.find(
        (project) => project.id !== existing.id && isOwnProject(project) && hasName(project)
      );
      if (clash) {
        setProjectError(`You already have a project called "${clash.title}". Choose a different name.`);
        return;
      }
      merged = {
        title: created.title,
        summary: created.summary,
        description: created.description,
        repo: created.repo,
        demoVideo: created.demoVideo,
        demoVideoPath: created.demoVideoPath,
        category: created.category,
        stack: created.stack,
        domain: created.domain,
      };
    } else {
      // Posting again with the same name updates the poster's own project, never someone else's.
      existing = prototypes.find((project) => isOwnProject(project) && hasName(project));
      merged = existing && {
        summary: created.summary || existing.summary,
        description: created.description || existing.description,
        repo: created.repo || existing.repo,
        demoVideo: created.demoVideo || existing.demoVideo,
        demoVideoPath: created.demoVideoPath || existing.demoVideoPath,
        category: newRepoCategory || existing.category || created.category,
        stack: created.stack.length ? created.stack : existing.stack,
        domain: created.domain || existing.domain,
      };
    }

    const resetForm = () => {
      // The project now points at the new video, so the one it replaced can go.
      if (existing?.demoVideoPath && existing.demoVideoPath !== merged.demoVideoPath) {
        removeDemoVideo(existing.demoVideoPath);
      }
      clearProjectForm();
      setActiveTab("myprojects");
    };

    if (supabase) {
      if (!user?.id || user.id.startsWith("demo:")) {
        setProjectError("Please sign in to post a project.");
        return;
      }
      setProjectSaving(true);
      try {
        const request = existing
          ? supabase
              .from("prototypes")
              .update(toPrototypeRow(merged))
              .eq("id", existing.id)
          : supabase
              .from("prototypes")
              .insert({ ...toPrototypeRow(created), created_by: user.id });
        const { data, error } = await request.select(PROTOTYPE_COLUMNS).single();
        if (error) throw error;
        const saved = fromPrototypeRow(data);
        setPrototypes((prev) =>
          existing ? prev.map((project) => (project.id === saved.id ? saved : project)) : [saved, ...prev]
        );
        if (existing) syncMatchedPrototype(saved.id, saved);
        resetForm();
      } catch (err) {
        setProjectError(err?.message || "Could not save your project. Please try again.");
      } finally {
        setProjectSaving(false);
      }
      return;
    }

    // Demo mode: keep projects in memory only.
    setPrototypes((prev) =>
      existing
        ? prev.map((project) => (project.id === existing.id ? { ...project, ...merged } : project))
        : [created, ...prev]
    );
    if (existing) syncMatchedPrototype(existing.id, { ...existing, ...merged });
    resetForm();
  };

  // "Owner/repo-name" -> "Repo Name"
  const prettyRepoName = (name) =>
    name.replace(/[-_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().replace(/\b\w/g, (c) => c.toUpperCase());

  const handleImportRepos = async (repos) => {
    if (!isYouth || !isVerified || !user?.id) return;
    setProjectError("");
    const existing = new Set(prototypes.filter((p) => p.ownerId === user.id).map((p) => (p.repo || "").toLowerCase()));
    const fresh = repos.filter((r) => !existing.has(r.url.toLowerCase()));
    const drafts = fresh.map((r, i) => ({
      id: `proto-${Date.now()}-${i}`,
      title: prettyRepoName(r.name),
      summary: (r.description || "").split(/[.!?]/)[0] || "",
      description: r.description || "",
      repo: r.url,
      demoVideo: "",
      demoVideoPath: "", // hidden from organisations until the student adds a demo video
      stack: uniqueList([r.language, ...(r.topics || []).slice(0, 5)].filter(Boolean).join(",")),
      completion: null,
      missing: [],
      estimatedValue: null,
      domain: "", // the category chip already shows this
      category: r.category,
      showcased: true,
      ownerId: user.id,
      ownerName: user.name,
      ownerRole: user.role,
      postedAt: new Date().toISOString(),
    }));
    if (!drafts.length) return;
    if (supabase) {
      const { data, error } = await supabase
        .from("prototypes")
        .insert(drafts.map((d) => ({ ...toPrototypeRow(d), created_by: user.id })))
        .select(PROTOTYPE_COLUMNS);
      if (error) {
        setProjectError(error.message);
        return;
      }
      setPrototypes((prev) => [...data.map(fromPrototypeRow), ...prev]);
      return;
    }
    setPrototypes((prev) => [...drafts, ...prev]);
  };

  const handleToggleShowcase = async (project) => {
    if (project.ownerId !== user?.id) return;
    const showcased = !(project.showcased !== false);
    if (supabase) {
      const { error } = await supabase.from("prototypes").update({ showcased }).eq("id", project.id);
      if (error) {
        setProjectError(error.message);
        return;
      }
    }
    setPrototypes((prev) => prev.map((p) => (p.id === project.id ? { ...p, showcased } : p)));
  };

  // The video the project being edited already has (kept until a save replaces it).
  const savedVideoPath = editingProjectId
    ? prototypes.find((p) => p.id === editingProjectId)?.demoVideoPath || ""
    : "";

  // Deletes a video uploaded in the form that no saved project uses.
  const discardUnsavedVideo = (path = newRepoVideoPath) => {
    if (path && path !== savedVideoPath) removeDemoVideo(path);
  };

  const handleVideoFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still triggers a change
    if (!file || videoUploading) return;
    setProjectError("");
    const problem = checkVideoFile(file);
    if (problem) {
      setProjectError(problem);
      return;
    }
    if (supabase && (!user?.id || user.id.startsWith("demo:"))) {
      setProjectError("Please sign in to upload a video.");
      return;
    }
    setVideoUploading(true);
    try {
      const path = await uploadDemoVideo(file, user?.id);
      discardUnsavedVideo();
      setNewRepoVideoPath(path);
    } catch (err) {
      setProjectError(err?.message || "Upload failed. Please try again.");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    discardUnsavedVideo();
    setNewRepoVideoPath("");
  };

  const cancelProjectForm = () => {
    discardUnsavedVideo();
    clearProjectForm();
  };

  const clearProjectForm = () => {
    setNewRepoTitle("");
    setNewRepoUrl("");
    setNewRepoVideo("");
    setNewRepoVideoPath("");
    setNewRepoCategory("");
    setNewRepoDescription("");
    setNewRepoStack("");
    setAuditNote("");
    setEditingProjectId(null);
    setProjectError("");
  };

  // Keep the "Suggested project" on the SMME match screen in step with edits/deletes.
  const syncMatchedPrototype = (projectId, updated) =>
    setMatchedResult((current) =>
      current.prototype?.id === projectId ? { ...current, prototype: updated } : current
    );

  const handleStartEditProject = (project) => {
    if (project.ownerId !== user?.id || videoUploading) return;
    discardUnsavedVideo();
    setEditingProjectId(project.id);
    setConfirmDeleteId(null);
    setProjectError("");
    setNewRepoTitle(project.title);
    setNewRepoUrl(project.repo || "");
    setNewRepoVideo(project.demoVideo || "");
    setNewRepoVideoPath(project.demoVideoPath || "");
    setNewRepoCategory(project.category || "");
    setNewRepoDescription(project.description || "");
    setNewRepoStack((project.stack || []).join(", "));
    setAuditNote(project.domain || "");
    document.getElementById("project-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDeleteProject = async (project) => {
    if (project.ownerId !== user?.id || deletingProjectId) return;
    setProjectError("");
    if (supabase) {
      setDeletingProjectId(project.id);
      try {
        const { data, error } = await supabase
          .from("prototypes")
          .delete()
          .eq("id", project.id)
          .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("This project could not be deleted.");
      } catch (err) {
        setProjectError(err?.message || "Could not delete the project. Please try again.");
        setDeletingProjectId(null);
        setConfirmDeleteId(null);
        return;
      }
      setDeletingProjectId(null);
    }
    removeDemoVideo(project.demoVideoPath);
    setPrototypes((prev) => prev.filter((p) => p.id !== project.id));
    syncMatchedPrototype(project.id, null);
    if (editingProjectId === project.id) cancelProjectForm();
    setConfirmDeleteId(null);
  };

  // --- Contacting students ---------------------------------------------------------
  const openContactForm = (project) => {
    setContactFormProjectId(project.id);
    setContactError("");
    setContactDraft({
      message: `Hi ${project.ownerName?.split(" ")[0] || "there"}, we're interested in "${project.title}" and would like to talk about working together.`,
      email: user?.email && user.email.includes("@") ? user.email : "",
      phone: "",
    });
  };

  const closeContactForm = () => {
    setContactFormProjectId(null);
    setContactError("");
    setContactDraft({ message: "", email: "", phone: "" });
  };

  // The request this SMME/NGO already sent about a project, if any.
  const sentRequestFor = (projectId) =>
    contactRequests.find((request) => request.projectId === projectId && request.orgId === user?.id);

  // "Message sent / interested / not available" for a project this organisation contacted.
  const contactStatusFor = (proto) => {
    const sent = sentRequestFor(proto.id);
    if (!sent) return null;
    const statusText = {
      new: "Message sent · waiting for the student to reply",
      interested: `${proto.ownerName || "The student"} is interested and will contact you at ${sent.replyEmail}`,
      declined: `${proto.ownerName || "The student"} isn't available for this right now`,
    }[sent.status];
    return (
      <p
        role="status"
        className={`inline-flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
          sent.status === "interested"
            ? "bg-[#EEF4EE] text-[#2F472F]"
            : sent.status === "declined"
            ? "bg-[#F5F1EC] text-[#6E5A4F]"
            : "bg-[#FBF5E6] text-[#6B5320]"
        }`}
      >
        {sent.status === "interested" ? (
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
        ) : (
          <Mail className="mt-px h-3.5 w-3.5 shrink-0" />
        )}
        <span>{statusText}</span>
      </p>
    );
  };

  const renderContactForm = (proto) => (
      <form
        onSubmit={(e) => handleSendContactRequest(e, proto)}
        aria-label={`Message to ${proto.ownerName || "the student"}`}
        className="space-y-3"
      >
        <p className="text-xs text-[#6E5A4F]">
          Your message and contact details go to {proto.ownerName || "the student"} only. Their
          own contact details stay private until they reply.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#3B2314]">Message</span>
          <textarea
            rows={4}
            required
            minLength={CONTACT_MESSAGE_MIN}
            maxLength={CONTACT_MESSAGE_MAX}
            value={contactDraft.message}
            onChange={(e) => setContactDraft((d) => ({ ...d, message: e.target.value }))}
            className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] p-3 text-sm"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#3B2314]">Your email</span>
            <input
              type="email"
              required
              value={contactDraft.email}
              onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="you@business.co.za"
              className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#3B2314]">
              Phone <span className="font-normal text-[#8A786D]">(optional)</span>
            </span>
            <input
              type="tel"
              value={contactDraft.phone}
              onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="e.g. 071 234 5678"
              className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3 py-2 text-sm"
            />
          </label>
        </div>
        {contactError && (
          <p role="alert" className="rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
            {contactError}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={contactSending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5E7A5E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4C654C] disabled:cursor-wait disabled:opacity-70"
          >
            <Send className="h-3.5 w-3.5" />
            {contactSending ? "Sending…" : "Send message"}
          </button>
          <button
            type="button"
            onClick={closeContactForm}
            disabled={contactSending}
            className="rounded-xl border border-[#D8CFC4] bg-white px-4 py-2 text-sm font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
          >
            Cancel
          </button>
        </div>
      </form>
  );

  const handleSendContactRequest = async (e, project) => {
    e.preventDefault();
    if (isYouth || contactSending) return;
    const message = contactDraft.message.trim();
    const email = contactDraft.email.trim();
    const phone = contactDraft.phone.trim();
    if (message.length < CONTACT_MESSAGE_MIN) {
      setContactError(`Please write a message of at least ${CONTACT_MESSAGE_MIN} characters.`);
      return;
    }
    if (sentRequestFor(project.id)) {
      setContactError("You've already contacted this student about this project.");
      return;
    }
    setContactError("");

    if (supabase) {
      if (!signedInUserId) {
        setContactError("Please sign in to contact students.");
        return;
      }
      setContactSending(true);
      try {
        // Student, organization name and project title are filled in by the database.
        const { data, error } = await supabase
          .from("contact_requests")
          .insert({
            prototype_id: project.id,
            organization_id: user.id,
            message,
            reply_email: email,
            reply_phone: phone || null,
          })
          .select(CONTACT_COLUMNS)
          .single();
        if (error) throw error;
        setContactRequests((prev) => [fromContactRow(data), ...prev]);
        closeContactForm();
      } catch (err) {
        setContactError(err?.message || "Could not send your message. Please try again.");
      } finally {
        setContactSending(false);
      }
      return;
    }

    // Demo mode: keep requests in memory.
    setContactRequests((prev) => [
      {
        id: `contact-${Date.now()}`,
        projectId: project.id,
        projectTitle: project.title,
        studentId: project.ownerId,
        orgId: user?.id,
        orgName: user?.name || "An organization",
        message,
        replyEmail: email,
        replyPhone: phone,
        status: "new",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    closeContactForm();
  };

  // Student answers a request: "interested" or "declined".
  const handleRespondToRequest = async (request, status) => {
    if (!isYouth || request.studentId !== user?.id || respondingRequestId) return;
    setMessagesError("");
    if (supabase) {
      setRespondingRequestId(request.id);
      try {
        const { data, error } = await supabase
          .from("contact_requests")
          .update({ status })
          .eq("id", request.id)
          .select(CONTACT_COLUMNS)
          .single();
        if (error) throw error;
        const saved = fromContactRow(data);
        setContactRequests((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      } catch (err) {
        setMessagesError(err?.message || "Could not save your answer. Please try again.");
      } finally {
        setRespondingRequestId(null);
      }
      return;
    }
    setContactRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status } : r)));
  };

  const handleAddTalent = async (e) => {
    e.preventDefault();
    if (!isYouth || !user?.id || talentSaving) return;
    setTalentError("");
    const profile = {
      id: ownTalentProfile?.id || `talent-${user.id}`,
      userId: user.id,
      name: newTalent.name.trim(),
      role: newTalent.role,
      skills: uniqueList(newTalent.skills),
      portfolio: newTalent.portfolio.trim(),
      availability: newTalent.availability.trim(),
      preferredFocus: newTalent.preferredFocus.trim(),
      strengthArea: newTalent.strengthArea.trim(),
      experienceLevel: newTalent.experienceLevel,
      location: newTalent.location.trim(),
    };
    if (!profile.name) {
      setTalentError("Please enter your name.");
      return;
    }
    if (!profile.skills.length) {
      setTalentError("Please add at least one skill.");
      return;
    }

    if (supabase) {
      if (!signedInUserId) {
        setTalentError("Please sign in to save your profile.");
        return;
      }
      setTalentSaving(true);
      try {
        const { error } = await supabase.from("talent_profiles").upsert(
          {
            user_id: user.id,
            role: profile.role,
            skills: profile.skills,
            portfolio_url: profile.portfolio,
            availability: profile.availability,
            preferred_focus: profile.preferredFocus || null,
            strength_area: profile.strengthArea || null,
            experience_level: profile.experienceLevel,
            location: profile.location || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
        if (profile.name !== user.name) {
          const { error: nameError } = await supabase
            .from("profiles")
            .update({ display_name: profile.name })
            .eq("id", user.id);
          if (nameError) throw nameError;
        }
      } catch (err) {
        setTalentError(err?.message || "Could not save your profile. Please try again.");
        setTalentSaving(false);
        return;
      }
      setTalentSaving(false);
    }

    setTalentProfiles((current) =>
      current.some((saved) => saved.userId === user.id)
        ? current.map((saved) => (saved.userId === user.id ? profile : saved))
        : [profile, ...current]
    );
    // A name change shows everywhere: header, pod suggestions, etc.
    if (profile.name !== user.name) setUser((current) => ({ ...current, name: profile.name }));
    setMatchedResult((current) => ({
      ...current,
      pod: current.pod.map((member) =>
        member.profile?.userId === user.id
          ? { ...member, profile, assignee: `${profile.name} · ${profile.availability}` }
          : member
      ),
    }));
    setEditingTalent(false);
  };

  const talentFormFrom = (profile) => ({
    name: profile?.name || user?.name || "",
    role: profile?.role || "Developer",
    skills: (profile?.skills || []).join(", "),
    portfolio: profile?.portfolio || "",
    availability: profile?.availability || "",
    preferredFocus: profile?.preferredFocus || "",
    strengthArea: profile?.strengthArea || "",
    experienceLevel: profile?.experienceLevel || "Student / Junior",
    location: profile?.location || "",
  });

  const handleStartEditTalent = () => {
    if (!ownTalentProfile) return;
    setTalentError("");
    setNewTalent(talentFormFrom(ownTalentProfile));
    setEditingTalent(true);
  };

  const handleCancelEditTalent = () => {
    setTalentError("");
    setNewTalent(talentFormFrom(null));
    setEditingTalent(false);
  };

  // Deleting the profile only removes the student from pod matching. Their account,
  // projects and messages stay, and they can create a new profile at any time.
  const handleDeleteTalent = async () => {
    if (!isYouth || !ownTalentProfile || talentDeleting) return;
    setTalentError("");
    if (supabase) {
      if (!signedInUserId) {
        setTalentError("Please sign in to delete your profile.");
        return;
      }
      setTalentDeleting(true);
      try {
        const { data, error } = await supabase
          .from("talent_profiles")
          .delete()
          .eq("user_id", user.id)
          .select("user_id");
        if (error) throw error;
        if (!data?.length) throw new Error("Your profile could not be deleted.");
      } catch (err) {
        setTalentError(err?.message || "Could not delete your profile. Please try again.");
        setTalentDeleting(false);
        setConfirmDeleteTalent(false);
        return;
      }
      setTalentDeleting(false);
    }
    setTalentProfiles((current) => current.filter((profile) => profile.userId !== user.id));
    // Take the student out of any suggested pod they were matched into.
    setMatchedResult((current) => ({
      ...current,
      pod: current.pod.map((member) =>
        member.profile?.userId === user.id
          ? { ...member, profile: null, assignee: "No profile yet — add talent" }
          : member
      ),
    }));
    setNewTalent(talentFormFrom(null));
    setEditingTalent(false);
    setConfirmDeleteTalent(false);
  };

  // Load pods from Supabase. RLS returns an organisation's own pods, and for a student
  // only pods they're assigned to (and only their own member row).
  const loadPods = async () => {
    if (!supabase) return;
    const { data: podRows, error } = await supabase
      .from("youth_pods")
      .select("id, organization_id, prototype_id, stage, progress_pct, stakeholder_signed_off, signed_off_at, created_at, organization_name, project_title, need, offer, offer_message")
      .order("created_at", { ascending: false });
    if (error || !podRows) return;
    const ids = podRows.map((p) => p.id);
    const { data: memberRows } = ids.length
      ? await supabase.from("youth_pod_members").select("pod_id, user_id, role, task, status").in("pod_id", ids)
      : { data: [] };
    const userIds = [...new Set((memberRows || []).map((m) => m.user_id))];
    const { data: nameRows } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] };
    const names = new Map((nameRows || []).map((r) => [r.id, r.display_name]));
    setPods(
      podRows.map((p) => ({
        id: p.id,
        orgId: p.organization_id,
        orgName: p.organization_name || "An organisation",
        prototypeId: p.prototype_id,
        projectTitle: p.project_title || "Project",
        need: p.need || "",
        offer: p.offer || "",
        offerMessage: p.offer_message || "",
        stage: p.stage,
        progress: p.progress_pct,
        signedOff: p.stakeholder_signed_off,
        signedOffAt: p.signed_off_at,
        createdAt: p.created_at,
        members: (memberRows || [])
          .filter((m) => m.pod_id === p.id)
          .map((m) => ({
            role: m.role,
            task: m.task,
            userId: m.user_id,
            name: names.get(m.user_id) || null,
            status: m.status || "accepted",
          })),
      }))
    );
  };

  const handleRequestPod = async () => {
    const project = matchedResult.prototype;
    if (isYouth || !isVerified || !project) return;
    const offer = podOffer.trim();
    const message = podMessage.trim();
    if (offer.length < 5) {
      setPodRequest({ status: "error", message: "Say what you're offering the students, e.g. a stipend or a reference letter." });
      return;
    }
    setPodRequest({ status: "loading", message: "" });
    if (supabase) {
      const { error } = await supabase.rpc("request_youth_pod", {
        p_org_type: orgType,
        p_raw_brief: problemBrief,
        p_prototype_id: project.id,
        p_offer: offer,
        p_message: message || null,
      });
      if (error) {
        setPodRequest({ status: "error", message: error.message });
        return;
      }
      await loadPods();
    } else {
      setPods((prev) => [
        {
          id: `pod-${Date.now()}`,
          orgId: user.id,
          orgName: user.name,
          prototypeId: project.id,
          projectTitle: project.title,
          need: problemBrief.trim(),
          offer,
          offerMessage: message,
          stage: "Waiting for students to accept",
          progress: 0,
          signedOff: false,
          signedOffAt: null,
          createdAt: new Date().toISOString(),
          members: matchedResult.pod.map((m) => ({
            role: m.role,
            task: m.task,
            userId: m.profile?.userId || null,
            name: m.profile?.name || null,
            status: m.profile?.userId ? "invited" : null,
          })),
        },
        ...prev,
      ]);
    }
    setPodRequest({
      status: "done",
      message: `Offer sent for ${project.title}. The matched students will accept or decline it.`,
    });
    setPodOffer("");
    setPodMessage("");
    setActiveTab("pods");
  };

  const handlePodInviteResponse = async (pod, accept) => {
    const me = myRoleIn(pod);
    if (!isYouth || !me || me.status !== "invited" || pod.signedOff || respondingPodId) return;
    setPodInviteError("");
    const status = accept ? "accepted" : "declined";
    if (supabase) {
      setRespondingPodId(pod.id);
      const { error } = await supabase.rpc("respond_to_pod_invite", { p_pod_id: pod.id, p_accept: accept });
      setRespondingPodId(null);
      if (error) {
        setPodInviteError(error.message || "Could not save your answer. Please try again.");
        return;
      }
    }
    setPods((prev) =>
      prev.map((p) => {
        if (p.id !== pod.id) return p;
        const members = p.members.map((m) => (m.userId === user.id ? { ...m, status } : m));
        return { ...p, members, stage: podStageFor({ ...p, members }) };
      })
    );
  };

  const handleStakeholderSignOff = async (podId) => {
    const pod = pods.find((p) => p.id === podId);
    if (!pod || pod.signedOff || !pod.members.some((m) => m.status === "accepted")) return;
    if (supabase) {
      const { error } = await supabase.rpc("sign_off_youth_pod", { p_pod_id: podId });
      if (error) {
        setPodRequest({ status: "error", message: error.message });
        return;
      }
    }
    const now = new Date().toISOString();
    setPods((prev) =>
      prev.map((p) =>
        p.id === podId
          ? { ...p, progress: 100, signedOff: true, signedOffAt: now, stage: "Delivered & Signed Off" }
          : p
      )
    );
  };

  const visiblePrototypes = prototypes.filter((proto) => {
    if (
      proto.ownerRole === "Youth Pod Talent" &&
      (proto.showcased === false || !hasDemoVideo(proto) || !canSeeStudentWork(proto.ownerId))
    )
      return false;
    const searchable = [
      proto.title,
      proto.domain,
      proto.summary,
      proto.description,
      ...(proto.aliases || []),
      ...proto.stack,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(archiveQuery.trim().toLowerCase());
  });

  // Who sees what:
  // - Youth only ever see the projects they posted themselves (never another developer's).
  // - Organizations/sponsors can discover every project posted by youth talent.
  // --- Verification, consent and POPIA rights ----------------------------------------
  const adminRequestList = supabase ? adminRequests : Object.values(verifications);

  const handleSubmitVerification = async (record) => {
    if (!user?.id) return;
    const base = { ...record, userId: user.id, userName: user.name, email: user.email || "" };
    if (supabase) {
      const { data, error } = await supabase
        .from("verifications")
        .upsert(
          {
            user_id: user.id,
            account_type: record.accountType,
            method: record.method,
            institution: record.institution || null,
            evidence_url: record.evidenceUrl || null,
            github_username: record.githubUsername || null,
            org_name: record.orgName || null,
            registration_number: record.registrationNumber || null,
            website: record.website || null,
          },
          { onConflict: "user_id" }
        )
        .select(VERIFICATION_COLUMNS)
        .single();
      if (error) throw error;
      setVerifications((current) => ({ ...current, [user.id]: fromVerificationRow(data, base) }));
      return;
    }
    // Demo mode: university emails and GitHub checks verify instantly; the rest wait for an admin.
    const instant =
      (record.method === "institution_email" && isInstitutionEmail(user.email)) || record.method === "github_bio";
    const now = new Date().toISOString();
    setVerifications((current) => ({
      ...current,
      [user.id]: {
        ...base,
        status: instant ? "verified" : "pending",
        submittedAt: now,
        reviewedAt: instant ? now : null,
        reviewNote: "",
      },
    }));
  };

  const handleLinkGitHub = async (accountType) => {
    // Remember what to finish after GitHub sends the user back.
    try {
      window.localStorage.setItem("ga-verify-github", accountType);
    } catch {
      // Storage unavailable: the user can press "Connect GitHub" again after returning.
    }
    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const handleReviewVerification = async (userId, decision, note) => {
    if (!isAdmin) return;
    if (supabase) {
      const { error } = await supabase.rpc("review_verification", {
        p_user_id: userId,
        p_decision: decision,
        p_note: note || null,
      });
      if (error) throw error;
      setAdminRequests((current) =>
        current.map((r) => (r.userId === userId ? { ...r, status: decision, reviewNote: note, reviewedAt: new Date().toISOString() } : r))
      );
      return;
    }
    setVerifications((current) => ({
      ...current,
      [userId]: { ...current[userId], status: decision, reviewNote: note, reviewedAt: new Date().toISOString() },
    }));
  };

  // --- Admin team ---------------------------------------------------------------------
  const loadAdminTeam = async () => {
    if (!isAdmin) return;
    if (!supabase) {
      setAdminTeam(demoTeam);
      return;
    }
    setAdminTeamLoading(true);
    const { data, error } = await supabase.rpc("admin_list_team");
    setAdminTeamLoading(false);
    if (error) throw error;
    setAdminTeam({
      admins: (data || []).filter((r) => r.kind === "admin").map((r) => ({ userId: r.user_id, name: r.display_name, email: r.email, since: r.since })),
      invites: (data || []).filter((r) => r.kind === "invite").map((r) => ({ email: r.email, since: r.since })),
    });
  };

  // --- Admin: all accounts -------------------------------------------------------------
  const demoAccountList = () => {
    const byId = new Map();
    for (const [email, account] of Object.entries(demoAccounts)) {
      byId.set(account.id, { userId: account.id, name: account.name, email });
    }
    for (const v of Object.values(verifications)) {
      if (!byId.has(v.userId)) byId.set(v.userId, { userId: v.userId, name: v.userName, email: v.email });
    }
    return [...byId.values()].map((a) => {
      const details = accountDetails[a.userId] || {};
      const isOrg = ["smme", "ngo"].includes(details.accountType || verifications[a.userId]?.accountType);
      return {
        ...a,
        role: demoTeam.admins.some((t) => t.userId === a.userId) ? "admin" : isOrg ? "organization" : "youth",
        accountType: details.accountType || verifications[a.userId]?.accountType || "",
        institution: details.institution || "",
        organizationName: details.organizationName || "",
        emailConfirmed: true, // demo mode has no email confirmation
        status: verifications[a.userId]?.status || "unverified",
        createdAt: null,
      };
    });
  };

  const loadAdminAccounts = async () => {
    if (!isAdmin) return;
    if (!supabase) {
      setAdminAccounts(demoAccountList());
      return;
    }
    setAdminAccountsLoading(true);
    const { data, error } = await supabase.rpc("admin_list_accounts");
    setAdminAccountsLoading(false);
    if (error) throw error;
    setAdminAccounts(
      (data || []).map((r) => ({
        userId: r.user_id,
        name: r.display_name,
        email: r.email,
        role: r.role,
        accountType: r.account_type || "",
        institution: r.institution || "",
        organizationName: r.organization_name || "",
        emailConfirmed: Boolean(r.email_confirmed),
        status: r.verification_status,
        createdAt: r.created_at,
      }))
    );
  };

  const handleAdminConfirmEmail = async (userId) => {
    if (!isAdmin) return;
    if (supabase) {
      const { error } = await supabase.rpc("admin_confirm_email", { p_user_id: userId });
      if (error) throw error;
    }
    await loadAdminAccounts();
  };

  const handleAdminVerify = async (userId) => {
    if (!isAdmin) return;
    const now = new Date().toISOString();
    if (supabase) {
      const { error } = await supabase.rpc("admin_verify_account", { p_user_id: userId });
      if (error) throw error;
      // Keep the Verifications tab in step (the request, if any, is now decided).
      setAdminRequests((current) =>
        current.map((r) => (r.userId === userId ? { ...r, status: "verified", reviewedAt: now, reviewNote: "" } : r))
      );
      await loadAdminAccounts();
      return;
    }
    const account = demoAccountList().find((a) => a.userId === userId);
    setVerifications((current) => ({
      ...current,
      [userId]: {
        userId,
        userName: account?.name || current[userId]?.userName || "",
        email: account?.email || current[userId]?.email || "",
        accountType: current[userId]?.accountType || account?.accountType || (account?.role === "organization" ? "smme" : "student"),
        method: "admin_review",
        institution: account?.institution || current[userId]?.institution || "",
        orgName: account?.organizationName || current[userId]?.orgName || "",
        ...current[userId],
        status: "verified",
        submittedAt: current[userId]?.submittedAt || now,
        reviewedAt: now,
        reviewNote: "",
      },
    }));
  };

  const handleAdminInvite = async (email) => {
    if (!isAdmin) return "invited";
    if (supabase) {
      const { data, error } = await supabase.rpc("admin_invite", { p_email: email });
      if (error) throw error;
      await loadAdminTeam();
      return data;
    }
    if (demoTeam.admins.some((a) => a.email === email)) return "already";
    const account = demoAccounts[email];
    const next = account
      ? { ...demoTeam, admins: [...demoTeam.admins, { userId: account.id, name: account.name, email, since: new Date().toISOString() }] }
      : demoTeam.invites.some((i) => i.email === email)
        ? demoTeam
        : { ...demoTeam, invites: [...demoTeam.invites, { email, since: new Date().toISOString() }] };
    setDemoTeam(next);
    setAdminTeam(next);
    return account ? "promoted" : "invited";
  };

  const handleAdminCancelInvite = async (email) => {
    if (!isAdmin) return;
    if (supabase) {
      const { error } = await supabase.rpc("admin_cancel_invite", { p_email: email });
      if (error) throw error;
      await loadAdminTeam();
      return;
    }
    const next = { ...demoTeam, invites: demoTeam.invites.filter((i) => i.email !== email) };
    setDemoTeam(next);
    setAdminTeam(next);
  };

  const handleAdminRemove = async (userId) => {
    if (!isAdmin) return;
    if (supabase) {
      const { error } = await supabase.rpc("admin_remove", { p_user_id: userId });
      if (error) throw error;
      await loadAdminTeam();
      return;
    }
    if (userId === user.id) throw new Error("You can't remove yourself. Ask another admin.");
    if (demoTeam.admins.length <= 1) throw new Error("Geek Archive needs at least one admin");
    const next = { ...demoTeam, admins: demoTeam.admins.filter((a) => a.userId !== userId) };
    setDemoTeam(next);
    setAdminTeam(next);
  };

  const handleConsent = async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    if (supabase) {
      const { error } = await supabase.rpc("record_popia_consent", { p_version: POPIA_NOTICE_VERSION });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setUser((current) => ({ ...current, consentAt: now }));
      return;
    }
    setConsents((current) => ({ ...current, [user.id]: now }));
  };

  const myMessages = contactRequests.filter((r) => r.studentId === user?.id || r.orgId === user?.id);
  const privacySummary = [
    { label: "Name", value: user?.name || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Role", value: user?.role || "—" },
    { label: "Verification", value: myVerification ? `${ACCOUNT_TYPES[myVerification.accountType]?.label || ""} · ${myVerification.status}` : "Not started" },
    ...(isYouth
      ? [
          { label: "Talent profile", value: ownTalentProfile ? "Saved" : "None" },
          { label: "Projects", value: String(prototypes.filter((p) => p.ownerId === user?.id).length) },
        ]
      : []),
    { label: "Messages", value: String(myMessages.length) },
  ];

  const buildMyDataExport = () => ({
    exportedAt: new Date().toISOString(),
    privacyNoticeVersion: POPIA_NOTICE_VERSION,
    account: { id: user?.id, name: user?.name, email: user?.email, role: user?.role, consentAt },
    registeredDetails: myDetails,
    verification: myVerification,
    talentProfile: ownTalentProfile,
    projects: prototypes.filter((p) => p.ownerId === user?.id),
    messages: myMessages,
  });

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    const id = user.id;
    if (supabase) {
      // Videos first, while the user can still sign requests to their own folder.
      await removeAllDemoVideos(id).catch(() => {});
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
    } else {
      if (isAdmin && demoTeam.admins.length <= 1) {
        throw new Error("You are the only admin. Add another admin under Team before deleting your account.");
      }
      if (isAdmin) setDemoTeam((current) => ({ ...current, admins: current.admins.filter((a) => a.userId !== id) }));
      prototypes.filter((p) => p.ownerId === id).forEach((p) => removeDemoVideo(p.demoVideoPath));
      setTalentProfiles((current) => current.filter((p) => p.userId !== id));
      setPrototypes((current) => current.filter((p) => p.ownerId !== id));
      setContactRequests((current) => current.filter((r) => r.studentId !== id && r.orgId !== id));
      // Remove them from pods: their own pods go, and their seat in others is emptied.
      setPods((current) =>
        current
          .filter((p) => p.orgId !== id)
          .map((p) => ({ ...p, members: p.members.map((m) => (m.userId === id ? { ...m, userId: null, name: null } : m)) }))
      );
      setVerifications((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setAccountDetails((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDemoAccounts((current) =>
        Object.fromEntries(Object.entries(current).filter(([, account]) => account.id !== id))
      );
      setConsents((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    await handleSignOut({ localOnly: true });
  };

  // Accept / Decline for an invitation, or the student's answer once given.
  const renderInviteAnswer = (pod) => {
    const me = myRoleIn(pod);
    if (!me) return null;
    if (me.status === "invited") {
      const busy = respondingPodId === pod.id;
      return (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E6DFD5] pt-3">
          <p className="mr-auto text-xs text-[#6E5A4F]">{pod.orgName} is waiting for your answer.</p>
          <button
            type="button"
            onClick={() => handlePodInviteResponse(pod, true)}
            disabled={busy}
            aria-label={`Accept the offer for ${pod.projectTitle}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4C654C] disabled:opacity-70"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {busy ? "Saving…" : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => handlePodInviteResponse(pod, false)}
            disabled={busy}
            aria-label={`Decline the offer for ${pod.projectTitle}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5] disabled:opacity-70"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      );
    }
    return (
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#B9DBA9] bg-[#EEF7E8] px-3 py-1 text-xs font-semibold text-[#2F5A2F]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        You accepted. You&apos;re working with {pod.orgName}.
      </p>
    );
  };

  // Accept / Decline on an example offer: only changes what this screen shows.
  const renderSampleAnswer = (offer) => {
    const answer = sampleAnswers[offer.id];
    if (!answer) {
      return (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E6DFD5] pt-3">
          <p className="mr-auto text-xs text-[#6E5A4F]">Practice: your answer isn&apos;t sent to anyone.</p>
          <button
            type="button"
            onClick={() => setSampleAnswers((a) => ({ ...a, [offer.id]: "accepted" }))}
            aria-label={`Accept the sample offer for ${offer.projectTitle}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4C654C]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            type="button"
            onClick={() => setSampleAnswers((a) => ({ ...a, [offer.id]: "declined" }))}
            aria-label={`Decline the sample offer for ${offer.projectTitle}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      );
    }
    const accepted = answer === "accepted";
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E6DFD5] pt-3">
        <p
          role="status"
          className={`mr-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            accepted ? "border-[#B9DBA9] bg-[#EEF7E8] text-[#2F5A2F]" : "border-[#E7C3BC] bg-[#FBEDEA] text-[#8A2C1E]"
          }`}
        >
          {accepted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {accepted
            ? `You accepted. On a real offer, ${offer.orgName.replace(" (sample)", "")} would now see "Accepted" and the work moves to My pods.`
            : `You declined. On a real offer, the organisation would see "Declined" and the offer would leave this list.`}
        </p>
        <button
          type="button"
          onClick={() => setSampleAnswers((a) => { const next = { ...a }; delete next[offer.id]; return next; })}
          aria-label={`Undo your answer to the sample offer for ${offer.projectTitle}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Undo
        </button>
      </div>
    );
  };

  // One offer card, shared by real and example offers.
  const renderOfferCard = (offer, { role, task, answer, sample = false }) => (
    <article
      key={offer.id}
      aria-label={`${sample ? "Sample offer" : "Offer"}: ${offer.projectTitle} from ${offer.orgName}`}
      className={`rounded-xl border p-5 ${sample ? "border-dashed border-[#CBBFAF] bg-white" : "border-[#E6DFD5] bg-[#FAF8F5]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#5E7A5E]">
            Offer from {offer.orgName}
            {sample && (
              <span className="rounded-full bg-[#FBF6E6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6B5420] ring-1 ring-[#E8D9A8]">
                Sample
              </span>
            )}
          </p>
          <h3 className="font-bold text-[#2C1A10]">{offer.projectTitle}</h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3B2314] ring-1 ring-[#E6DFD5]">
          Your role: {role}
        </span>
      </div>
      <div className="mt-3 rounded-xl border border-[#C8DD9F] bg-[#F4F9EC] p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#3F5D3F]">
          <Briefcase className="h-3.5 w-3.5" /> What they offer
        </p>
        <p className="mt-1 text-sm font-semibold text-[#163126]">
          {offer.offer || "No offer details given. Ask them before you accept."}
        </p>
      </div>
      {offer.offerMessage && (
        <div className="mt-3 rounded-xl border border-[#E6DFD5] bg-white p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6E5A4F]">
            <MessageSquare className="h-3.5 w-3.5" /> Message from {offer.orgName}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#3B2314]">“{offer.offerMessage}”</p>
        </div>
      )}
      {offer.need && (
        <p className="mt-3 text-xs leading-relaxed text-[#5C493E]">
          <span className="font-semibold text-[#3B2314]">Their need:</span> {offer.need}
        </p>
      )}
      <p className="mt-1 text-xs text-[#5C493E]">
        <span className="font-semibold text-[#3B2314]">Your task:</span> {task}
      </p>
      {answer}
    </article>
  );

  const handleSaveAccountDetails = async (details) => {
    if (!user?.id) return;
    if (supabase) {
      const { error } = await supabase.rpc("save_account_details", {
        p_full_name: details.fullName,
        p_phone: details.phone,
        p_account_type: details.accountType,
        p_institution: details.institution || null,
        p_organization_name: details.organizationName || null,
        p_registration_number: details.registrationNumber || null,
      });
      if (error) throw error;
    }
    const name = displayNameFor(details, myGroup);
    setAccountDetails((current) => ({ ...current, [user.id]: details }));
    if (!supabase && user.email) {
      setDemoAccounts((current) => ({ ...current, [user.email.toLowerCase()]: { id: user.id, name } }));
    }
    setUser((current) => (current ? { ...current, name } : current));
    setNewTalent((current) => ({ ...current, name: isYouth ? name : current.name }));
  };

  useEffect(() => {
    if (isAdmin && (activeTab === "team" || activeTab === "verifications")) {
      loadAdminTeam().catch(() => {});
    }
  }, [isAdmin, activeTab, demoTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin && activeTab === "accounts") loadAdminAccounts().catch(() => {});
  }, [isAdmin, activeTab, verifications]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProject = openProjectId ? prototypes.find((p) => p.id === openProjectId) || null : null;

  // Every talent profile with a display name. Profiles loaded from the database for
  // SMMEs don't carry a name, so it comes from the projects that student posted.
  const ownerNames = new Map(
    prototypes.filter((p) => p.ownerId && p.ownerName).map((p) => [p.ownerId, p.ownerName])
  );
  const talentDirectory = talentProfiles.map((profile) =>
    profile.name ? profile : { ...profile, name: ownerNames.get(profile.userId) || "Student" }
  );
  const viewedProfile = viewProfileUserId
    ? {
        userId: viewProfileUserId,
        profile: talentDirectory.find((p) => p.userId === viewProfileUserId) || null,
        projects: prototypes.filter(
          (p) => p.ownerId === viewProfileUserId && p.showcased !== false && hasDemoVideo(p)
        ),
      }
    : null;
  if (viewedProfile) {
    viewedProfile.name = viewedProfile.profile?.name || ownerNames.get(viewProfileUserId) || "Student";
  }
  const openStudentProfile = (userId) => {
    setOpenProjectId(null);
    setViewProfileUserId(userId);
  };
  const openProjectFromProfile = (projectId) => {
    setViewProfileUserId(null);
    setOpenProjectId(projectId);
  };
  const myProjects = prototypes.filter((proto) => user?.id && proto.ownerId === user.id);
  // SMMEs/NGOs only ever see the projects students chose to show.
  const youthPostedProjects = prototypes.filter(
    (proto) =>
      proto.ownerRole === "Youth Pod Talent" &&
      proto.showcased !== false &&
      hasDemoVideo(proto) &&
      canSeeStudentWork(proto.ownerId)
  );
  // Filter options come from what students actually posted. Matching ignores case,
  // so "react" and "React" count as the same skill.
  const skillOptions = countOptions(youthPostedProjects.flatMap((proto) => proto.stack));
  const categoryCounts = youthPostedProjects.reduce((counts, p) => {
    const id = p.category || "other";
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
  const categoryOptions = CATEGORIES.filter((c) => categoryCounts[c.id]);
  // A filter whose last project was deleted quietly falls back to "All".
  const activeSkill = skillOptions.some((o) => o.key === discoverSkill) ? discoverSkill : "";
  const activeCategory = categoryCounts[discoverCategory] ? discoverCategory : "";
  const hasDiscoverFilters = Boolean(activeSkill || activeCategory || discoverQuery.trim());
  const discoveredProjects = youthPostedProjects.filter(
    (proto) =>
      (!activeSkill || proto.stack.some((tech) => tech.toLowerCase() === activeSkill)) &&
      (!activeCategory || (proto.category || "other") === activeCategory) &&
      Boolean(matchProject(proto, discoverQuery))
  );
  // Streaming-style Discover: playable sources for every tile, and the viewer's preview setting.
  const sourceFor = useVideoSources(youthPostedProjects);
  const [previewsOn, setPreviewsOn] = usePreviewSetting();
  const discoverRows = rowsFor(youthPostedProjects);
  const featuredProject = discoverRows[0]?.projects[0] || null;
  const ownerLineFor = (proto) =>
    proto.ownerRole === "Youth Pod Talent" && proto.ownerName
      ? `By ${proto.ownerName}${talentRoleFor(proto.ownerId) ? ` · ${talentRoleFor(proto.ownerId)}` : ""}`
      : "";
  const tileMetaFor = (proto) =>
    [proto.ownerName, CATEGORY_BY_ID[proto.category]?.label || proto.domain].filter(Boolean).join(" · ");

  // Requests this student has received, newest first; "new" ones count as unread.
  const myContactRequests = contactRequests.filter(
    (request) => isYouth && user?.id && request.studentId === user.id
  );
  const unreadRequestCount = myContactRequests.filter((request) => request.status === "new").length;

  const clearDiscoverFilters = () => {
    setDiscoverQuery("");
    setDiscoverSkill("");
    setDiscoverCategory("");
  };
  const talentRoleFor = (ownerId) =>
    talentProfiles.find((profile) => profile.userId === ownerId)
      ?.role;

  const projectForm = (
    <form
      id="project-form"
      onSubmit={handleIngestPrototype}
      className={`scroll-mt-24 space-y-4 rounded-2xl border bg-white p-6 lg:col-span-5 ${
        editingProjectId ? "border-[#5E7A5E] ring-2 ring-[#C8DD9F]" : "border-[#E6DFD5]"
      }`}
    >
      <div className="flex items-center gap-2">
        {editingProjectId ? (
          <Pencil className="h-5 w-5 text-[#5E7A5E]" />
        ) : (
          <Layers className="h-5 w-5 text-[#5E7A5E]" />
        )}
        <h2 className="text-lg font-bold text-[#2C1A10]">
          {editingProjectId ? "Edit project" : "Post a project"}
        </h2>
      </div>
      <p className="text-xs text-[#6E5A4F]">
        {editingProjectId
          ? "Change any detail below and save. Clearing a field removes it from the project."
          : "Share something you built. SMMEs, NGOs and sponsors can discover it; other students and developers cannot see it."}
      </p>
      <div>
        <label className="block text-xs font-semibold text-[#3B2314] mb-1">Project name</label>
        <input
          type="text"
          required
          value={newRepoTitle}
          onChange={(e) => setNewRepoTitle(e.target.value)}
          placeholder="e.g., Imbewu Learn"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="project-github" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#3B2314]">
          <Github className="h-3.5 w-3.5" />
          GitHub repository
        </label>
        <input
          id="project-github"
          type="url"
          inputMode="url"
          value={newRepoUrl}
          onChange={(e) => setNewRepoUrl(e.target.value)}
          placeholder="https://github.com/your-name/your-repo"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-[#8A786D]">
          SMMEs can open it, and Geek Archive's AI reads it to explain your project to them.
        </p>
      </div>
      <div>
        <label htmlFor="project-category" className="mb-1 block text-xs font-semibold text-[#3B2314]">Category</label>
        <select
          id="project-category"
          value={newRepoCategory}
          onChange={(e) => setNewRepoCategory(e.target.value)}
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        >
          <option value="">Choose for me from the description</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-[#8A786D]">Organisations browse by category, e.g. Cybersecurity or Finance.</p>
      </div>
      <fieldset className="rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] p-3.5">
        <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold text-[#3B2314]">
          <PlayCircle className="h-3.5 w-3.5" />
          Demo video <span className="font-normal text-[#8A786D]">(required)</span>
        </legend>
        <p className="mb-2.5 text-[11px] text-[#6E5A4F]">
          Show your project working. When an organisation opens your project, this plays straight away.
        </p>
        {newRepoVideoPath ? (
          <div className="space-y-2">
            <VideoPlayer
              key={newRepoVideoPath}
              project={{ title: newRepoTitle || "Your project", demoVideoPath: newRepoVideoPath }}
              autoplay={false}
            />
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor="project-video-file"
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D8CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#163126] hover:bg-[#F2EEE8] ${videoUploading ? "pointer-events-none opacity-60" : ""}`}
              >
                <Upload className="h-3.5 w-3.5" />
                {videoUploading ? "Uploading…" : "Replace video"}
              </label>
              <button
                type="button"
                onClick={handleRemoveVideo}
                disabled={videoUploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7C3BC] bg-white px-3 py-1.5 text-xs font-semibold text-[#8A2C1E] hover:bg-[#FBEDEA] disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove video
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="project-video-file"
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#B9C9B5] bg-white px-4 py-5 text-center hover:border-[#5E7A5E] hover:bg-[#F4F9EC] ${videoUploading ? "pointer-events-none opacity-70" : ""}`}
          >
            <Upload className="h-5 w-5 text-[#5E7A5E]" />
            <span className="text-sm font-semibold text-[#163126]">
              {videoUploading ? "Uploading your video…" : "Upload demo video"}
            </span>
            <span className="text-[11px] text-[#8A786D]">MP4, WebM or MOV (iPhone) · up to 50 MB</span>
          </label>
        )}
        <input
          id="project-video-file"
          type="file"
          accept={VIDEO_ACCEPT}
          onChange={handleVideoFileChosen}
          disabled={videoUploading}
          aria-label="Upload demo video file"
          className="sr-only"
        />
        {!newRepoVideoPath && (
          <div className="mt-3">
            <label htmlFor="project-video" className="mb-1 block text-[11px] font-semibold text-[#3B2314]">
              Or paste a Demo video link
            </label>
            <input
              id="project-video"
              type="url"
              inputMode="url"
              value={newRepoVideo}
              onChange={(e) => setNewRepoVideo(e.target.value)}
              placeholder="https://youtu.be/…"
              className="w-full rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-[#8A786D]">{SUPPORTED_VIDEO_HINT}.</p>
          </div>
        )}
      </fieldset>
      <div>
        <label className="block text-xs font-semibold text-[#3B2314] mb-1">
          Project description
        </label>
        <textarea
          rows={4}
          value={newRepoDescription}
          onChange={(e) => setNewRepoDescription(e.target.value)}
          placeholder="What does it do, and who is it for?"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] p-3.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#3B2314] mb-1">Tech Stack</label>
        <input
          type="text"
          value={newRepoStack}
          onChange={(e) => setNewRepoStack(e.target.value)}
          placeholder="Separate tools with commas"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#3B2314] mb-1">Target Sector</label>
        <input
          type="text"
          value={auditNote}
          onChange={(e) => setAuditNote(e.target.value)}
          placeholder="Add when known"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        />
      </div>
      {projectError && (
        <p role="alert" className="rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
          {projectError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={projectSaving || videoUploading}
          className="flex-1 rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C] disabled:cursor-wait disabled:opacity-70"
        >
          {projectSaving ? "Saving…" : editingProjectId ? "Save changes" : "Post my project"}
        </button>
        {editingProjectId && (
          <button
            type="button"
            onClick={cancelProjectForm}
            disabled={projectSaving || videoUploading}
            className="rounded-xl border border-[#D8CFC4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  if (showAuthLanding) {
    return (
      <div id="top" className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-gradient-to-b from-[#10291D] via-[#163126] to-[#10291D] text-white">
        <InteractiveAuthBackdrop />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C8DD9F] text-[#163126] shadow-[0_8px_30px_rgba(200,221,159,0.16)]">
              <span className="text-sm font-black tracking-tight">GA</span>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">Geek Archive</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#D2DFC9]">By Embedded Intelligence</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExplorePlatform}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/15"
          >
            <span>Explore Live Platform</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </header>

        <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C8DD9F]/25 bg-[#C8DD9F]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E3ECCF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8DD9F]" />
              <span>Ideas become jobs. Builds become proof.</span>
            </span>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl lg:text-[68px]">
              Build something
              <br />
              <span className="text-[#C8DD9F]">worth shipping.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-[#DDE5D8]">
              Turn unfinished prototypes into real SMME and NGO solutions with a
              <strong className="font-semibold text-white"> three-role youth pod</strong> and proof you can take anywhere.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
              <div className="border-l border-[#C8DD9F]/35 py-1 pl-4">
                <Code2 className="mb-2 h-5 w-5 text-[#C8DD9F]" />
                <p className="text-sm font-semibold text-white">Engineer</p>
                <p className="mt-1 text-xs text-[#BBCABC]">Build &amp; deploy</p>
              </div>
              <div className="border-l border-[#C8DD9F]/35 py-1 pl-4">
                <Palette className="mb-2 h-5 w-5 text-[#C8DD9F]" />
                <p className="text-sm font-semibold text-white">Designer</p>
                <p className="mt-1 text-xs text-[#BBCABC]">Shape the experience</p>
              </div>
              <div className="border-l border-[#C8DD9F]/35 py-1 pl-4">
                <Briefcase className="mb-2 h-5 w-5 text-[#C8DD9F]" />
                <p className="text-sm font-semibold text-white">Strategist</p>
                <p className="mt-1 text-xs text-[#BBCABC]">Plan &amp; prove value</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-[24px] border border-white/40 bg-[#FBFCF8] p-6 text-[#163126] shadow-[0_30px_80px_rgba(9,25,17,0.28)] sm:p-7">
              <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#FAF8F5] p-1 border border-[#E6DFD5]">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    authMode === "signin"
                      ? "bg-[#163126] text-[#C8DD9F] shadow-sm"
                      : "text-[#68766F] hover:text-[#163126]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    authMode === "signup"
                      ? "bg-[#163126] text-[#C8DD9F] shadow-sm"
                      : "text-[#68766F] hover:text-[#163126]"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <h2 className="text-xl font-bold text-[#2C1A10]">
                {authMode === "signin" ? "Welcome back to Geek Archive" : "Create your Geek Archive account"}
              </h2>
              <p className="mt-1 text-xs text-[#6E5A4F]">
                Choose how you want to join pods, archive prototypes, or post an SMME/NGO brief.
              </p>

              {!isSupabaseConfigured && (
                <p className="mt-3 rounded-lg border border-[#E8D9B5] bg-[#FBF5E6] px-3 py-2 text-[11px] leading-relaxed text-[#6B5320]">
                  <strong>Demo mode:</strong> accounts and passwords are not checked and nothing is saved.
                  Add Supabase keys to <code>.env.local</code> to turn on real sign-in.
                </p>
              )}
              {authError && authMode !== "signup" && (
                <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
                  {authError}
                </p>
              )}
              {authNotice && (
                <p role="status" className="mt-3 rounded-lg border border-[#C8DEC8] bg-[#EEF4EE] px-3 py-2 text-xs text-[#263B26]">
                  {authNotice}
                </p>
              )}

              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#3B2314] mb-1.5">
                  I am joining as
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Youth Pod Talent", "SMME / NGO"].map((roleOption) => (
                    <button
                      key={roleOption}
                      type="button"
                      onClick={() => {
                        setAuthRole(roleOption);
                        const group = roleOption === "SMME / NGO" ? "organization" : "youth";
                        setSignupDetails((current) => ({ ...current, accountType: accountTypesFor(group)[0] }));
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        authRole === roleOption
                          ? "border-[#5E7A5E] bg-[#EEF4EE] text-[#2F472F]"
                          : "border-[#E6DFD5] bg-[#FAF8F5] text-[#5C493E]"
                      }`}
                    >
                      {roleOption}
                    </button>
                  ))}
                </div>
              </div>

              {(authProviders.google || authProviders.github) && (
              <>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {authProviders.google && (
                <button
                  type="button"
                  onClick={() => handleAuthSubmit(null, "Google")}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#2C1A10] transition hover:bg-[#FAF8F5]"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3B2314] text-[10px] font-bold text-white">
                    G
                  </span>
                  <span>Continue with Google</span>
                </button>
                )}

                {authProviders.github && (
                <button
                  type="button"
                  onClick={() => handleAuthSubmit(null, "GitHub")}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#3B2314] bg-[#3B2314] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2C1A10]"
                >
                  <GitBranch className="h-4 w-4 text-[#A8C6A8]" />
                  <span>Continue with GitHub</span>
                </button>
                )}
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E6DFD5]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#8A786D]">
                  or email
                </span>
                <div className="h-px flex-1 bg-[#E6DFD5]" />
              </div>
              </>
              )}

              <form onSubmit={(e) => handleAuthSubmit(e, "Email")} className="space-y-3" noValidate={authMode === "signup"}>
                {authMode === "signup" && (
                  <AccountDetailsFields
                    group={authRole === "SMME / NGO" ? "organization" : "youth"}
                    value={signupDetails}
                    onChange={setSignupDetails}
                    idPrefix="signup"
                  />
                )}
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-[#3B2314] mb-1">
                    Email address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.co.za"
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3B2314] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={supabase ? 8 : 6}
                    autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none"
                  />
                  {authMode === "signup" && <p className="mt-1 text-[11px] text-[#8A786D]">At least 8 characters.</p>}
                </div>
                {authMode === "signup" && (
                  <div>
                    <label htmlFor="auth-password2" className="mb-1 block text-xs font-semibold text-[#3B2314]">
                      Confirm password
                    </label>
                    <input
                      id="auth-password2"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={authPassword2}
                      onChange={(e) => setAuthPassword2(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none"
                    />
                  </div>
                )}
                {supabase && authMode === "signin" && unconfirmedEmail && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={authLoading}
                    className="block text-xs font-semibold text-[#3F5D3F] hover:underline"
                  >
                    Send the confirmation email again
                  </button>
                )}
                {supabase && authMode === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={authLoading}
                    className="text-xs font-semibold text-[#3F5D3F] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
                {authMode === "signup" ? (
                  <label className="flex items-start gap-2 text-xs text-[#3B2314]">
                    <input
                      type="checkbox"
                      checked={signupConsent}
                      onChange={(e) => setSignupConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#5E7A5E]"
                    />
                    <span>
                      I agree to the{" "}
                      <button type="button" onClick={() => setShowNotice(true)} className="font-semibold text-[#3F5D3F] underline">
                        privacy notice
                      </button>{" "}
                      (POPIA).
                    </span>
                  </label>
                ) : (
                  <p className="text-[11px] text-[#6E5A4F]">
                    By continuing you agree to our{" "}
                    <button type="button" onClick={() => setShowNotice(true)} className="font-semibold text-[#3F5D3F] underline">
                      privacy notice
                    </button>
                    .
                  </p>
                )}
                {authError && authMode === "signup" && (
                  // Next to the button: the sign-up form is long, so an error at the top could go unseen.
                  <p role="alert" className="rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
                    {authError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#587561] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(88,117,97,0.18)] transition hover:bg-[#46634F] disabled:cursor-wait disabled:opacity-70"
                >
                  <span>
                    {authLoading
                      ? "Please wait…"
                      : authMode === "signin"
                      ? "Sign In to Workspace"
                      : "Create Account"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </main>

        <LandingSections />

        <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-[#DFD7CE]">
          <span>Geek Archive • Embedded Intelligence</span>
          <button type="button" onClick={() => setShowNotice(true)} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
            <Lock className="h-3 w-3" />
            Privacy notice (POPIA)
          </button>
          <span>Move your cursor to interact with the pod network</span>
        </footer>
        <Modal open={showNotice} onClose={() => setShowNotice(false)} title="Privacy notice" subtitle="How Geek Archive handles your information" size="lg">
          <PrivacyNotice />
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F1] text-[#163126]">
      <header className="sticky top-0 z-20 border-b border-[#DDE4D8] bg-[#F4F7F1]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#163126] text-[#C8DD9F]">
              <span className="text-xs font-black">GA</span>
            </div>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-lg font-bold tracking-tight text-[#163126]">Geek Archive</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#708078] xl:block">
                Embedded Intelligence
              </span>
            </div>
          </div>

          {/* Desktop navigation: one row, never wraps */}
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#163126] text-[#C8DD9F]"
                    : "text-[#68766F] hover:bg-[#E8EEE5] hover:text-[#163126]"
                }`}
              >
                {tab.label}
                <TabBadge count={tab.id === "messages" ? unreadRequestCount : 0} />
              </button>
            ))}
          </nav>

          {/* Desktop account area */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C8DD9F] text-[11px] font-bold text-[#163126]"
                  >
                    {initialsOf(user.name)}
                  </span>
                  <div className="max-w-[150px] leading-tight">
                    <p className="flex items-center gap-1 truncate text-xs font-semibold text-[#2C1A10]">
                      <span className="truncate">{user.name}</span>
                      {isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#2F7A3A]" aria-label="Verified" />}
                    </p>
                    <p className="truncate text-[11px] font-medium text-[#5E7A5E]">{user.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  aria-label="Privacy & my data"
                  title="Privacy & my data"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8CFC4] bg-white text-[#3B2314] hover:bg-[#FAF8F5]"
                >
                  <Lock className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign Out"
                  title="Sign out"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8CFC4] bg-white text-[#3B2314] hover:bg-[#FAF8F5]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthLanding(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B2314] px-3.5 py-2 text-xs font-semibold text-white"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Up</span>
              </button>
            )}
          </div>

          {/* Mobile / tablet menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8CFC4] bg-white text-[#163126] hover:bg-[#FAF8F5] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile / tablet menu panel */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="border-t border-[#DDE4D8] bg-[#F4F7F1] lg:hidden">
            <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-[#163126] text-[#C8DD9F]"
                      : "text-[#3E4F46] hover:bg-[#E8EEE5]"
                  }`}
                >
                  {tab.label}
                  <TabBadge count={tab.id === "messages" ? unreadRequestCount : 0} />
                </button>
              ))}
            </nav>
            <div className="mx-auto max-w-6xl border-t border-[#DDE4D8] px-4 py-3 sm:px-6">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8DD9F] text-xs font-bold text-[#163126]"
                    >
                      {initialsOf(user.name)}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold text-[#2C1A10]">
                        <span className="truncate">{user.name}</span>
                        {isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#2F7A3A]" aria-label="Verified" />}
                      </p>
                      <p className="truncate text-xs font-medium text-[#5E7A5E]">{user.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowPrivacy(true);
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3 py-2 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Privacy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowAuthLanding(true);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3B2314] px-3.5 py-2.5 text-sm font-semibold text-white"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In / Up</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {user && verificationKnown && !isVerified && (
          <div
            role="status"
            className={`mb-5 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
              myVerification?.status === "pending"
                ? "border-[#E8D9B5] bg-[#FBF5E6]"
                : myVerification?.status === "rejected"
                ? "border-[#E7C3BC] bg-[#FBEDEA]"
                : "border-[#C8DD9F] bg-[#F4F9EC]"
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3F5D3F]" />
              <div>
                <p className="text-sm font-bold text-[#163126]">
                  {myVerification?.status === "pending"
                    ? "Your verification is being reviewed"
                    : myVerification?.status === "rejected"
                    ? "Your verification wasn't approved"
                    : "Verify your account"}
                </p>
                <p className="text-xs text-[#3E4F46]">
                  {myVerification?.status === "rejected" && myVerification?.reviewNote
                    ? `Reason: ${myVerification.reviewNote}. Update your details and send the request again.`
                    : myVerification?.status === "pending"
                    ? "You can set things up meanwhile; full access opens once you're approved."
                    : isYouth
                    ? "Verified students and developers can post projects that organisations can discover."
                    : "Verified organisations can discover student projects, view profiles and contact students."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVerify(true)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2 text-sm font-semibold text-[#C8DD9F]"
            >
              <BadgeCheck className="h-4 w-4" />
              {myVerification?.status === "pending" ? "View request" : myVerification?.status === "rejected" ? "Update details" : "Verify now"}
            </button>
          </div>
        )}

        {(projectsLoading || projectsLoadError) && (
          <p
            role={projectsLoadError ? "alert" : "status"}
            className={`mb-4 rounded-xl border px-4 py-2.5 text-xs ${
              projectsLoadError
                ? "border-[#E7C3BC] bg-[#FBEDEA] text-[#8A2C1E]"
                : "border-[#DDE4D8] bg-white text-[#5C493E]"
            }`}
          >
            {projectsLoadError || "Loading projects…"}
          </p>
        )}
        <section className="relative mb-8 overflow-hidden rounded-[28px] bg-[#163126] p-6 text-white shadow-[0_18px_50px_rgba(22,49,38,0.10)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#C8DD9F]/15" />
          <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-[#C8DD9F]/[0.07]" />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8DD9F]">
                Work experience, redefined
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-[40px]">
                {isAdmin ? (
                  <>
                    Keep Geek Archive
                    <span className="text-[#C8DD9F]"> trustworthy.</span>
                  </>
                ) : isYouth ? (
                  <>
                    Build your skills.
                    <span className="text-[#C8DD9F]"> Show your impact.</span>
                  </>
                ) : (
                  <>
                    Find a practical
                    <span className="text-[#C8DD9F]"> starting point.</span>
                  </>
                )}
              </h1>
              <dl className="flex flex-wrap gap-2 pt-1" aria-label="Your Geek Archive at a glance">
                {(isAdmin
                  ? [
                      ["Waiting for review", adminRequestList.filter((r) => r.status === "pending").length],
                      ["Admins", adminTeam.admins.length],
                      ["Open invites", adminTeam.invites.length],
                    ]
                  : isYouth
                  ? [
                      ["Projects shown", myProjects.filter((p) => p.showcased !== false).length],
                      ["Active pods", myActivePods.length],
                    ]
                  : [
                      ["Verified projects", youthPostedProjects.length],
                      ["Categories", categoryOptions.length],
                      ["Your pods", orgPods.length],
                    ]
                ).map(([label, value]) => (
                  <div key={label} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-[#E7EEE2]">
                    <dt className="inline">{label}: </dt>
                    <dd className="inline font-bold text-[#C8DD9F]">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="max-w-xl text-sm leading-relaxed text-[#D5DED2]">
                {isAdmin
                  ? "Review who joins: check university, GitHub, CIPC and NPO details before you approve. Accounts lists everyone, including people who haven't asked to be verified. Invite other admins under Team."
                  : isYouth
                  ? "Create your talent profile, show your best projects, and join a project pod."
                  : "Describe your organization’s challenge, explore existing projects, and meet a pod built to help."}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(isAdmin ? "verifications" : isYouth ? "opportunities" : "archive")}
                className="relative inline-flex items-center gap-2 rounded-full bg-[#C8DD9F] px-5 py-3 text-xs font-bold text-[#163126] shadow-[0_12px_30px_rgba(200,221,159,0.12)] hover:bg-[#D5E7B5]"
              >
                {isYouth ? (
                  <Users className="h-4 w-4 text-[#5E7A5E]" />
                ) : (
                  <Layers className="h-4 w-4 text-[#5E7A5E]" />
                )}
                <span>{isAdmin ? "Review requests" : isYouth ? "My offers" : "Browse projects"}</span>
              </button>
            </div>
          </div>
        </section>

        {activeTab === "verifications" && isAdmin && (
          <AdminVerifications requests={adminRequestList} onReview={handleReviewVerification} />
        )}

        {activeTab === "accounts" && isAdmin && (
          <AdminAccounts
            accounts={adminAccounts}
            loading={adminAccountsLoading}
            onConfirmEmail={handleAdminConfirmEmail}
            onVerify={handleAdminVerify}
          />
        )}

        {activeTab === "team" && isAdmin && (
          <AdminTeam
            team={adminTeam}
            currentUserId={user?.id}
            loading={adminTeamLoading}
            onInvite={handleAdminInvite}
            onCancelInvite={handleAdminCancelInvite}
            onRemove={handleAdminRemove}
          />
        )}

        {activeTab === "opportunities" && isYouth && (
          <section className="rounded-2xl border border-[#E6DFD5] bg-white p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">Youth dashboard</p>
              <h2 className="mt-1 text-xl font-bold text-[#2C1A10]">Received offers</h2>
              <p className="mt-1 text-sm text-[#6E5A4F]">
                SMMEs and NGOs that want to work with you. Read what they offer, then accept or decline.
              </p>
            </div>
            {podInviteError && (
              <p role="alert" className="mb-3 rounded-xl border border-[#E7C3BC] bg-[#FBEDEA] px-4 py-2.5 text-sm text-[#8A2C1E]">
                {podInviteError}
              </p>
            )}
            {myOpenPods.length ? (
              <div className="space-y-3">
                {myOpenPods.map((pod) =>
                  renderOfferCard(pod, { role: myRoleIn(pod)?.role, task: myRoleIn(pod)?.task, answer: renderInviteAnswer(pod) })
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] p-7 text-center">
                <p className="font-semibold text-[#2C1A10]">No offers yet</p>
                <p className="mt-1 text-sm text-[#6E5A4F]">
                  Keep your profile and projects up to date. When an SMME or NGO sends you an offer, it appears here.
                </p>
              </div>
            )}

            <div className="mt-8 border-t border-[#E6DFD5] pt-6" aria-labelledby="sample-offers-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 id="sample-offers-heading" className="font-bold text-[#2C1A10]">Sample offers</h3>
                  <p className="mt-1 text-sm text-[#6E5A4F]">
                    Examples of what an offer looks like. Try Accept or Decline: nothing is sent or saved.
                  </p>
                </div>
                {Object.keys(sampleAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSampleAnswers({})}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset samples
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {SAMPLE_OFFERS.map((offer) =>
                  renderOfferCard(offer, { role: offer.role, task: offer.task, answer: renderSampleAnswer(offer), sample: true })
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "match" && !isYouth && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleTranslateAndMatch}
              className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6 lg:col-span-6"
            >
              <div className="flex items-center gap-2 text-[#3B2314]">
                <Sparkles className="h-5 w-5 text-[#5E7A5E]" />
                <h2 className="text-lg font-bold">Describe what you need</h2>
              </div>
              <p className="text-xs text-[#6E5A4F]">
                Share the challenge in your own words. Geek Archive checks the project archive and suggests a starting point and the talent needed.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#3B2314] mb-1">
                  Organization Type
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                >
                  <option value="SMME">SMME / Local Business</option>
                  <option value="NGO">NGO / Community Organization</option>
                  <option value="Co-op">Youth Co-operative</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3B2314] mb-1">
                  What are you trying to solve?
                </label>
                <textarea
                  rows={4}
                  value={problemBrief}
                  onChange={(e) => setProblemBrief(e.target.value)}
                  className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] p-3.5 text-sm"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B2314] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2C1A10]"
              >
                <span>Find a project &amp; assemble a pod</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#2C1A10]">Suggested project &amp; pod</h2>
                <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                  Starting point
                </span>
              </div>

              <div className="rounded-xl bg-[#FAF8F5] p-4 border border-[#E6DFD5]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">
                  Your brief
                </p>
                <p className="mt-1 text-sm text-[#2C1A10]">{matchedResult.translatedSpec}</p>
              </div>

              {matchedResult.prototype ? (
                <div className="rounded-xl border border-[#E6DFD5] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#2C1A10]">{matchedResult.prototype.title}</p>
                    <span className="text-xs font-semibold text-[#5E7A5E]">
                      {matchedResult.prototype.completion == null
                        ? "Progress not specified"
                        : `${matchedResult.prototype.completion}% complete`}
                    </span>
                  </div>
                  {matchedResult.prototype.summary && (
                    <p className="mt-2 text-sm leading-relaxed text-[#5C493E]">
                      {matchedResult.prototype.summary}
                    </p>
                  )}
                  <div className="mt-3">
                    <ProjectLinks project={matchedResult.prototype} compact />
                  </div>
                  {matchedResult.prototype.description && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[#3F5D3F]">
                        Read full description
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-[#5C493E]">
                        {matchedResult.prototype.description}
                      </p>
                    </details>
                  )}
                  {matchedResult.prototype.completion == null &&
                    !matchedResult.prototype.description && (
                    <p className="mt-1 text-xs text-[#6E5A4F]">
                      Project progress and more details have not been added yet.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] p-4">
                  <p className="text-sm font-bold text-[#2C1A10]">No close project match yet</p>
                  <p className="mt-1 text-xs text-[#6E5A4F]">
                    No project description, sector, or technology matched this brief. Browse the archive to explore all solutions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("archive")}
                    className="mt-3 text-xs font-semibold text-[#3F5D3F] hover:underline"
                  >
                    Browse projects
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#3B2314]">
                  3-Role Youth Pod
                </p>
                {matchedResult.pod.map((member) => (
                  <div
                    key={member.role}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#2C1A10]">{member.role}</p>
                      <p className="text-xs text-[#5C493E]">{member.task}</p>
                      {member.profile && (
                        <div className="mt-2 space-y-1 text-[11px] text-[#6E5A4F]">
                          <p>Skills: {member.profile.skills.join(", ")}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            <button
                              type="button"
                              onClick={() => openStudentProfile(member.profile.userId)}
                              className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline"
                            >
                              <UserRound className="h-3 w-3" />
                              View profile
                            </button>
                            <a
                              href={member.profile.portfolio}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline"
                            >
                              <Link2 className="h-3 w-3" />
                              Portfolio
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md border border-[#E6DFD5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3B2314]">
                      {member.assignee.startsWith("No profile")
                        ? "No candidate yet"
                        : member.assignee}
                    </span>
                  </div>
                ))}
              </div>
              {matchedResult.prototype && (
                <div className="rounded-xl border border-[#C8DD9F] bg-[#F4F9EC] p-4">
                  <p className="text-sm font-semibold text-[#163126]">Ready to start?</p>
                  <p className="mt-0.5 text-xs text-[#3E4F46]">
                    Send an offer to the matched verified students for {matchedResult.prototype.title}. They see your
                    need, your offer and your message, and accept or decline it.
                  </p>
                  {isVerified ? (
                    <>
                    <label htmlFor="pod-offer" className="mt-3 block text-xs font-semibold text-[#163126]">
                      What you&apos;re offering
                    </label>
                    <input
                      id="pod-offer"
                      type="text"
                      maxLength={300}
                      value={podOffer}
                      onChange={(e) => setPodOffer(e.target.value)}
                      placeholder="e.g. R4,000 stipend for 6 weeks + a reference letter"
                      className="mt-1 w-full rounded-xl border border-[#C8D4C7] bg-white px-3.5 py-2 text-sm"
                    />
                    <label htmlFor="pod-message" className="mt-3 block text-xs font-semibold text-[#163126]">
                      Message to the students <span className="font-normal text-[#5C6B5F]">(optional)</span>
                    </label>
                    <textarea
                      id="pod-message"
                      rows={2}
                      maxLength={600}
                      value={podMessage}
                      onChange={(e) => setPodMessage(e.target.value)}
                      placeholder="A short hello: who you are and why you'd like to work with them."
                      className="mt-1 w-full rounded-xl border border-[#C8D4C7] bg-white px-3.5 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRequestPod}
                      disabled={podRequest.status === "loading"}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2 text-sm font-semibold text-[#C8DD9F] disabled:opacity-70"
                    >
                      <Users className="h-4 w-4" />
                      {podRequest.status === "loading" ? "Sending…" : "Send offer"}
                    </button>
                    </>
                  ) : !verificationKnown ? (
                    <p role="status" className="mt-2 text-xs text-[#3E4F46]">Checking your verification…</p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-[#6B5320]">Verify your organisation to request pods.</p>
                  )}
                  {podRequest.status === "error" && (
                    <p role="alert" className="mt-2 text-xs text-[#8A2C1E]">{podRequest.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "discover" && !isYouth && verificationKnown && !isVerified && (
          <VerifyGate
            title="Verify your organisation to discover student projects"
            text="To protect students, only verified SMMEs, NGOs and sponsors can see their projects and profiles, contact them, or run AI analyses."
            status={myVerification?.status}
            onVerify={() => setShowVerify(true)}
          />
        )}

        {activeTab === "discover" && !isYouth && isVerified && (
          <section aria-label="Discover projects" className="overflow-hidden rounded-2xl bg-[#0C1410] text-white shadow-[0_30px_80px_rgba(9,25,17,0.35)] sm:rounded-3xl">
            <div className="space-y-4 border-b border-white/10 px-5 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Discover</h2>
                  <p className="mt-0.5 text-xs text-white/60">
                    Projects by students &amp; developers. Rest on a project to preview it; click to watch.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                    {youthPostedProjects.length} posted
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/80">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={previewsOn}
                      onChange={(e) => setPreviewsOn(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="relative h-5 w-9 rounded-full bg-white/20 transition peer-checked:bg-[#8DB46A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C8DD9F] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:duration-200 peer-checked:after:translate-x-4"
                    />
                    Autoplay previews
                  </label>
                </div>
              </div>

              {youthPostedProjects.length > 0 && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <span className="mb-1 block text-xs font-semibold text-white/70">Search</span>
                      <SearchSuggest
                        value={discoverQuery}
                        onChange={setDiscoverQuery}
                        projects={youthPostedProjects}
                        onPick={(project) => setOpenProjectId(project.id)}
                        placeholder="Start typing: a project, category, skill or person"
                      />
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-white/70">Skill</span>
                      <select
                        value={activeSkill}
                        onChange={(e) => setDiscoverSkill(e.target.value)}
                        disabled={!skillOptions.length}
                        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white disabled:opacity-60"
                      >
                        <option value="" className="text-black">All skills</option>
                        {skillOptions.map((option) => (
                          <option key={option.key} value={option.key} className="text-black">
                            {option.label} ({option.count})
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={clearDiscoverFilters}
                      disabled={!hasDiscoverFilters}
                      className="rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear filters
                    </button>
                  </div>
                  {categoryOptions.length > 0 && (
                    <div role="group" aria-label="Categories" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
                      <button
                        type="button"
                        aria-pressed={!activeCategory}
                        onClick={() => setDiscoverCategory("")}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          !activeCategory ? "bg-white text-[#0C1410]" : "bg-white/10 text-white/80 hover:bg-white/20"
                        }`}
                      >
                        All ({youthPostedProjects.length})
                      </button>
                      {categoryOptions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={activeCategory === c.id}
                          onClick={() => setDiscoverCategory(activeCategory === c.id ? "" : c.id)}
                          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                            activeCategory === c.id ? "bg-white text-[#0C1410]" : "bg-white/10 text-white/80 hover:bg-white/20"
                          }`}
                        >
                          <span aria-hidden="true">{c.emoji}</span> {c.label} ({categoryCounts[c.id]})
                        </button>
                      ))}
                    </div>
                  )}
                  {hasDiscoverFilters && (
                    <p className="text-xs text-white/60" aria-live="polite">
                      Showing {discoveredProjects.length} of {youthPostedProjects.length} projects
                    </p>
                  )}
                </>
              )}
            </div>

            {youthPostedProjects.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-bold">No student projects posted yet</p>
                <p className="mt-1 text-sm text-white/60">When students and developers post their work, it will appear here.</p>
              </div>
            ) : hasDiscoverFilters ? (
              discoveredProjects.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-lg font-bold">No projects match your filters</p>
                  <p className="mt-1 text-sm text-white/60">Try a different category, skill or search.</p>
                  <button
                    type="button"
                    onClick={clearDiscoverFilters}
                    className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0C1410] hover:bg-white/85"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div role="list" aria-label="Matching projects" className="grid grid-cols-1 gap-x-3 gap-y-5 px-5 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-4">
                  {discoveredProjects.map((proto) => (
                    <ProjectTile
                      key={proto.id}
                      wide
                      project={proto}
                      source={sourceFor(proto)}
                      previews={previewsOn}
                      meta={tileMetaFor(proto)}
                      onOpen={() => setOpenProjectId(proto.id)}
                    />
                  ))}
                </div>
              )
            ) : (
              <>
                {featuredProject && (
                  <Billboard
                    key={featuredProject.id}
                    project={featuredProject}
                    source={sourceFor(featuredProject)}
                    previews={previewsOn}
                    paused={Boolean(openProject || viewProfileUserId)}
                    ownerLine={ownerLineFor(featuredProject)}
                    onOpen={() => setOpenProjectId(featuredProject.id)}
                  />
                )}
                <div className="relative z-10 -mt-6 space-y-2 pb-8">
                  {discoverRows.map((row) => (
                    <ProjectRow
                      key={row.title}
                      title={row.title}
                      projects={row.projects}
                      sourceFor={sourceFor}
                      previews={previewsOn && !openProject}
                      metaFor={tileMetaFor}
                      onOpen={(id) => setOpenProjectId(id)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "discover" && !isYouth && isVerified && youthPostedProjects.length > 0 && (
          <div className="mt-6">
            <AiRecommendPanel
              projects={youthPostedProjects}
              orgType={orgType}
              defaultNeed={problemBrief}
              onOpenProject={(id) => setOpenProjectId(id)}
            />
          </div>
        )}

        {activeTab === "messages" && isYouth && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DFD5] bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-[#2C1A10]">Messages</h2>
                <p className="mt-1 text-xs text-[#6E5A4F]">
                  SMMEs, NGOs and sponsors who want to talk about your projects. Your own contact details
                  stay private until you reply.
                </p>
              </div>
              <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                {unreadRequestCount ? `${unreadRequestCount} new` : `${myContactRequests.length} total`}
              </span>
            </div>

            {messagesError && (
              <p role="alert" className="rounded-xl border border-[#E7C3BC] bg-[#FBEDEA] px-4 py-2.5 text-xs text-[#8A2C1E]">
                {messagesError}
              </p>
            )}

            {myContactRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                <Inbox className="mx-auto h-6 w-6 text-[#8FA58F]" />
                <p className="mt-2 font-semibold text-[#2C1A10]">No messages yet</p>
                <p className="mt-1 text-sm text-[#6E5A4F]">
                  When an organization wants to talk about one of your projects, it will show up here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("myprojects")}
                  className="mt-3 text-xs font-semibold text-[#3F5D3F] hover:underline"
                >
                  Go to My projects
                </button>
              </div>
            ) : (
              myContactRequests.map((request) => (
                <article
                  key={request.id}
                  aria-label={`Message from ${request.orgName} about ${request.projectTitle}`}
                  className={`rounded-2xl border bg-white p-5 ${
                    request.status === "new" ? "border-[#E2C88F] ring-1 ring-[#F2E3BF]" : "border-[#E6DFD5]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[#2C1A10]">{request.orgName}</p>
                      <p className="text-xs text-[#6E5A4F]">
                        About <span className="font-semibold text-[#3B2314]">{request.projectTitle}</span>
                        {request.createdAt && <> · {new Date(request.createdAt).toLocaleDateString()}</>}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        request.status === "new"
                          ? "bg-[#FBF5E6] text-[#6B5320]"
                          : request.status === "interested"
                          ? "bg-[#EEF4EE] text-[#2F472F]"
                          : "bg-[#F5F1EC] text-[#6E5A4F]"
                      }`}
                    >
                      {request.status === "new"
                        ? "New"
                        : request.status === "interested"
                        ? "You're interested"
                        : "Declined"}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#3B2314]">
                    {request.message}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#5C493E]">
                    <a
                      href={`mailto:${request.replyEmail}?subject=${encodeURIComponent(`Re: ${request.projectTitle}`)}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {request.replyEmail}
                    </a>
                    {request.replyPhone && (
                      <a
                        href={`tel:${request.replyPhone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {request.replyPhone}
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EEE8E1] pt-4">
                    {request.status === "new" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRespondToRequest(request, "interested")}
                          disabled={respondingRequestId === request.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E7A5E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4C654C] disabled:opacity-70"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          I&apos;m interested
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondToRequest(request, "declined")}
                          disabled={respondingRequestId === request.id}
                          className="rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5] disabled:opacity-70"
                        >
                          Not now
                        </button>
                      </>
                    ) : request.status === "interested" ? (
                      <>
                        <a
                          href={`mailto:${request.replyEmail}?subject=${encodeURIComponent(`Re: ${request.projectTitle}`)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B2314] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2C1A10]"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Reply by email
                        </a>
                        <p className="text-xs text-[#6E5A4F]">
                          {request.orgName} has been told you&apos;re interested.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[#6E5A4F]">You declined this request.</p>
                        <button
                          type="button"
                          onClick={() => handleRespondToRequest(request, "interested")}
                          disabled={respondingRequestId === request.id}
                          className="text-xs font-semibold text-[#3F5D3F] hover:underline"
                        >
                          Changed your mind? Mark as interested
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {activeTab === "myprojects" && isYouth && isVerified && (
          <div className="mb-6">
            <GitHubImport
              defaultUsername={
                myVerification?.githubUsername ||
                (ownTalentProfile?.portfolio || "").match(/github\.com\/([A-Za-z0-9-]+)/i)?.[1] ||
                ""
              }
              existingRepoUrls={new Set(myProjects.map((p) => (p.repo || "").toLowerCase()).filter(Boolean))}
              onImport={handleImportRepos}
            />
          </div>
        )}

        {activeTab === "myprojects" && isYouth && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {isVerified ? (
              projectForm
            ) : !verificationKnown ? (
              <p role="status" className="rounded-2xl border border-[#E6DFD5] bg-white p-5 text-sm text-[#6E5A4F] lg:col-span-5">
                Checking your verification…
              </p>
            ) : (
              <VerifyGate
                className="lg:col-span-5"
                title="Verify your account to post projects"
                text="Organisations only see work from verified students and developers. It takes a minute."
                status={myVerification?.status}
                onVerify={() => setShowVerify(true)}
              />
            )}

            <section className="space-y-4 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DFD5] bg-white p-5">
                <div>
                  <h2 className="text-lg font-bold text-[#2C1A10]">My projects</h2>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#6E5A4F]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#5E7A5E]" />
                    Visible to you and to SMMEs, NGOs and sponsors only.
                  </p>
                </div>
                <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                  {myProjects.length} posted
                </span>
              </div>

              {myProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                  <p className="font-semibold text-[#2C1A10]">You haven&apos;t posted a project yet</p>
                  <p className="mt-1 text-sm text-[#6E5A4F]">
                    Post something you built so organizations and sponsors can discover it.
                  </p>
                </div>
              ) : (
                myProjects.map((proto) => (
                  <article
                    key={proto.id}
                    className={`rounded-2xl border bg-white p-5 ${
                      editingProjectId === proto.id
                        ? "border-[#5E7A5E] ring-2 ring-[#C8DD9F]"
                        : "border-[#E6DFD5]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {proto.domain && (
                          <span className="text-xs font-semibold text-[#5E7A5E]">{proto.domain}</span>
                        )}
                        <h3 className="text-base font-bold text-[#2C1A10]">{proto.title}</h3>
                        {editingProjectId === proto.id && (
                          <p className="text-[11px] font-semibold text-[#5E7A5E]">Editing…</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditProject(proto)}
                          aria-label={`Edit ${proto.title}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D8CFC4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proto.id)}
                          aria-label={`Delete ${proto.title}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7C3BC] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#8A2C1E] hover:bg-[#FBEDEA]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                    {confirmDeleteId === proto.id && (
                      <div
                        role="alertdialog"
                        aria-label={`Confirm deleting ${proto.title}`}
                        className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E7C3BC] bg-[#FBEDEA] px-3.5 py-2.5"
                      >
                        <p className="text-xs font-medium text-[#8A2C1E]">
                          Delete this project? Organizations will no longer see it. This can&apos;t be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proto)}
                            disabled={deletingProjectId === proto.id}
                            className="rounded-lg bg-[#A33A2A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8A2C1E] disabled:opacity-70"
                          >
                            {deletingProjectId === proto.id ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-[#D8CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B2314]"
                          >
                            Keep it
                          </button>
                        </div>
                      </div>
                    )}
                    {proto.summary && (
                      <p className="mt-1 text-sm leading-relaxed text-[#5C493E]">{proto.summary}</p>
                    )}
                    {proto.stack.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {proto.stack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-md bg-[#EEF4EE] px-2.5 py-0.5 text-xs font-medium text-[#3F5D3F]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#F4F9EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#2F472F]">
                        {CATEGORY_BY_ID[proto.category]?.emoji || "📁"} {categoryLabel(proto.category) || "No category"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={proto.showcased !== false}
                        aria-label={`Show ${proto.title} to organisations`}
                        onClick={() => handleToggleShowcase(proto)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#3B2314]"
                      >
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            proto.showcased !== false ? "bg-[#5E7A5E]" : "bg-[#D8CFC4]"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                              proto.showcased !== false ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                        {proto.showcased === false
                          ? "Hidden from organisations"
                          : hasDemoVideo(proto)
                            ? "Shown to organisations"
                            : "Will show once it has a demo"}
                      </button>
                    </div>
                    <div className="mt-3">
                      <ProjectLinks project={proto} compact />
                    </div>
                    {!hasDemoVideo(proto) && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8D9A8] bg-[#FBF6E6] px-3 py-2.5">
                        <p className="text-xs text-[#6B5420]">Hidden from organisations until you add a demo video.</p>
                        <button
                          type="button"
                          onClick={() => handleStartEditProject(proto)}
                          aria-label={`Add demo video to ${proto.title}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#163126] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1F4434]"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Add demo video
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          </div>
        )}

        {activeTab === "archive" && !isYouth && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#2C1A10]">Browse existing projects</h2>
                    <p className="mt-1 text-xs text-[#6E5A4F]">
                      Search names, descriptions, stacks, and sectors.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                    {prototypes.length} projects
                  </span>
                  <label className="relative w-full">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C8B80]" />
                    <input
                      type="search"
                      value={archiveQuery}
                      onChange={(e) => setArchiveQuery(e.target.value)}
                      placeholder="Search projects, stacks, or sectors"
                      className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm sm:max-w-sm"
                    />
                  </label>
                </div>
              </div>
              {visiblePrototypes.map((proto) => (
                <div key={proto.id} className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {(proto.domain || proto.category) && (
                        <span className="text-xs font-semibold text-[#5E7A5E]">
                          {proto.domain || `${CATEGORY_BY_ID[proto.category]?.emoji || ""} ${categoryLabel(proto.category)}`.trim()}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-[#2C1A10]">
                        <button
                          type="button"
                          onClick={() => setOpenProjectId(proto.id)}
                          className="text-left hover:text-[#3F5D3F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8DD9F]"
                        >
                          {proto.title}
                        </button>
                      </h3>
                      {proto.ownerRole === "Youth Pod Talent" && (
                        <p className="text-xs text-[#6E5A4F]">
                          Posted by <span className="font-semibold">{proto.ownerName}</span> (student / developer)
                        </p>
                      )}
                      {proto.summary && (
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5C493E]">
                          {proto.summary}
                        </p>
                      )}

                    </div>
                    <span className="rounded-full bg-[#FAF8F5] border border-[#E6DFD5] px-3 py-1 text-xs font-bold text-[#3B2314]">
                      {proto.completion == null
                        ? "Progress not specified"
                        : `${proto.completion}% ready`}
                    </span>
                  </div>
                  {proto.description && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[#3F5D3F]">
                        Read full description
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-[#5C493E]">
                        {proto.description}
                      </p>
                    </details>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proto.stack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md bg-[#EEF4EE] px-2.5 py-0.5 text-xs font-medium text-[#3F5D3F]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <ProjectLinks project={proto} compact onOpen={() => setOpenProjectId(proto.id)} />
                  </div>
                  {proto.missing.length > 0 && (
                    <p className="mt-3 text-xs text-[#5C493E]">
                      <strong>Remaining work:</strong> {proto.missing.join(" • ")}
                    </p>
                  )}
                </div>
              ))}
              {visiblePrototypes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                  <p className="font-semibold text-[#2C1A10]">No projects found</p>
                  <p className="mt-1 text-sm text-[#6E5A4F]">Try a different project name, technology or sector.</p>
                </div>
              )}
            </div>
        )}

        {activeTab === "talent" && isYouth && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {showTalentForm && (
            <form
              onSubmit={handleAddTalent}
              aria-label={editingTalent ? "Edit my profile" : "Create my profile"}
              className={`space-y-4 rounded-2xl border bg-white p-6 lg:col-span-5 ${
                editingTalent ? "border-[#5E7A5E] ring-2 ring-[#C8DD9F]" : "border-[#E6DFD5]"
              }`}
            >
              <div className="flex items-center gap-2">
                {editingTalent ? (
                  <Pencil className="h-5 w-5 text-[#5E7A5E]" />
                ) : (
                  <UserRoundPlus className="h-5 w-5 text-[#5E7A5E]" />
                )}
                <h2 className="text-lg font-bold text-[#2C1A10]">
                  {editingTalent ? "Edit my profile" : "My talent profile"}
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-[#6E5A4F]">
                {editingTalent
                  ? "Update anything that has changed, then save. Clearing an optional field removes it."
                  : "Share the essentials so Geek Archive can connect you to the right project pod. SMMEs, NGOs and sponsors can see your profile when they browse student projects. Your email and phone number are never shown."}
              </p>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3B2314]">Name</label>
                <input
                  required
                  value={newTalent.name}
                  onChange={(e) => setNewTalent((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#3B2314]">Pod role</label>
                  <select
                    value={newTalent.role}
                    onChange={(e) => setNewTalent((current) => ({ ...current, role: e.target.value }))}
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                  >
                    {["Developer", "UI/UX Designer", "Business Student"].map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#3B2314]">Availability</label>
                  <input
                    required
                    value={newTalent.availability}
                    onChange={(e) =>
                      setNewTalent((current) => ({ ...current, availability: e.target.value }))
                    }
                    placeholder="e.g., 6–10 hrs/week"
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3B2314]">Skills</label>
                <input
                  required
                  value={newTalent.skills}
                  onChange={(e) => setNewTalent((current) => ({ ...current, skills: e.target.value }))}
                  placeholder="Separate skills with commas"
                  className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#3B2314]">Portfolio link</label>
                <input
                  required
                  type="url"
                  value={newTalent.portfolio}
                  onChange={(e) =>
                    setNewTalent((current) => ({ ...current, portfolio: e.target.value }))
                  }
                  placeholder="https://github.com/you"
                  className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                />
              </div>

              <details
                // Re-mount when switching to edit so filled-in optional details start open.
                key={editingTalent ? "edit" : "create"}
                open={
                  editingTalent &&
                  Boolean(newTalent.preferredFocus || newTalent.strengthArea || newTalent.location)
                }
                className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] px-4 py-3"
              >
                <summary className="cursor-pointer text-xs font-semibold text-[#3B2314]">
                  {editingTalent ? "Optional matching details" : "Add optional matching details"}
                </summary>
                <div className="mt-3 space-y-3">
                  <input
                    value={newTalent.preferredFocus}
                    onChange={(e) =>
                      setNewTalent((current) => ({ ...current, preferredFocus: e.target.value }))
                    }
                    placeholder="Preferred stack or domains"
                    className="w-full rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-sm"
                  />
                  <input
                    value={newTalent.strengthArea}
                    onChange={(e) =>
                      setNewTalent((current) => ({ ...current, strengthArea: e.target.value }))
                    }
                    placeholder="Strength area (e.g., API, offline sync)"
                    className="w-full rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-sm"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={newTalent.experienceLevel}
                      onChange={(e) =>
                        setNewTalent((current) => ({ ...current, experienceLevel: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-sm"
                    >
                      {["Student / Junior", "Hackathon Builder", "Mid-Level / Mentor"].map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <input
                      value={newTalent.location}
                      onChange={(e) =>
                        setNewTalent((current) => ({ ...current, location: e.target.value }))
                      }
                      placeholder="Location / timezone"
                      className="w-full rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </details>

              {talentError && (
                <p role="alert" className="rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
                  {talentError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={talentSaving}
                  className="flex-1 rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C] disabled:cursor-wait disabled:opacity-70"
                >
                  {talentSaving ? "Saving…" : editingTalent ? "Save changes" : "Save my profile"}
                </button>
                {editingTalent && (
                  <button
                    type="button"
                    onClick={handleCancelEditTalent}
                    disabled={talentSaving}
                    className="rounded-xl border border-[#D8CFC4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            )}

            <section className={`space-y-4 ${showTalentForm ? "lg:col-span-7" : "lg:col-span-8 lg:col-start-3"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DFD5] bg-white p-5">
                <div>
                  <h2 className="text-lg font-bold text-[#2C1A10]">My profile</h2>
                  <p className="mt-1 text-xs text-[#6E5A4F]">
                    Visible to SMMEs, NGOs and sponsors. Your contact details stay private.
                  </p>
                </div>
                <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                  {ownTalentProfile ? "Profile saved" : "No profile yet"}
                </span>
              </div>

              {!ownTalentProfile ? (
                <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                  <p className="font-semibold text-[#2C1A10]">Your profile starts here</p>
                  <p className="mt-1 text-sm text-[#6E5A4F]">
                    Add your skills, portfolio, and availability to get matched with a project pod.
                  </p>
                </div>
              ) : (
                [ownTalentProfile].map((profile) => (
                  <article
                    key={profile.id}
                    aria-label="My saved profile"
                    className={`rounded-2xl border bg-white p-5 ${
                      editingTalent ? "border-[#5E7A5E] ring-2 ring-[#C8DD9F]" : "border-[#E6DFD5]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#2C1A10]">{profile.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[#5E7A5E]">{profile.role}</p>
                        {editingTalent && (
                          <p className="text-[11px] font-semibold text-[#5E7A5E]">Editing…</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-[#FAF8F5] px-3 py-1 text-xs font-semibold text-[#3B2314]">
                          {profile.availability}
                        </span>
                        {!editingTalent && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteTalent(false);
                                handleStartEditTalent();
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#D8CFC4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTalentError("");
                                setConfirmDeleteTalent(true);
                              }}
                              aria-label="Delete profile"
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E7C3BC] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#8A2C1E] hover:bg-[#FBEDEA]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-[#EEF4EE] px-2.5 py-1 text-xs font-medium text-[#3F5D3F]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6E5A4F]">
                      <a
                        href={profile.portfolio}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Portfolio
                      </a>
                      <span>{profile.experienceLevel}</span>
                      {profile.preferredFocus && <span>{profile.preferredFocus}</span>}
                      {profile.strengthArea && <span>{profile.strengthArea}</span>}
                      {profile.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {profile.location}
                        </span>
                      )}
                    </div>
                    {!showTalentForm && talentError && (
                      <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
                        {talentError}
                      </p>
                    )}
                    {confirmDeleteTalent && !editingTalent && (
                      <div
                        role="alertdialog"
                        aria-label="Confirm deleting your profile"
                        className="mt-4 rounded-xl border border-[#E7C3BC] bg-[#FBEDEA] px-3.5 py-3"
                      >
                        <p className="text-xs font-medium text-[#8A2C1E]">
                          Delete your talent profile? You&apos;ll stop being matched to new project pods.
                          Your account, projects and messages stay, and you can create a new profile any time.
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={handleDeleteTalent}
                            disabled={talentDeleting}
                            className="rounded-lg bg-[#A33A2A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8A2C1E] disabled:opacity-70"
                          >
                            {talentDeleting ? "Deleting…" : "Yes, delete my profile"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTalent(false)}
                            disabled={talentDeleting}
                            className="rounded-lg border border-[#D8CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B2314]"
                          >
                            Keep it
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          </div>
        )}

        {activeTab === "pods" && isYouth && (
          <section className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">Youth dashboard</p>
              <h2 className="mt-1 text-xl font-bold text-[#2C1A10]">My pod workspace</h2>
            </div>
            {myPods.length ? (
              myPods.map((pod) => (
                <article key={pod.id} aria-label={`Pod: ${pod.projectTitle}`} className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-[#2C1A10]">{pod.projectTitle}</h3>
                    <span className="text-xs font-semibold text-[#5E7A5E]">{podStageFor(pod)}</span>
                  </div>
                  <p className="text-xs text-[#6E5A4F]">For {pod.orgName}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EFEAE4]">
                    <div className="h-full rounded-full bg-[#5E7A5E]" style={{ width: `${pod.progress}%` }} />
                  </div>
                  <div className="mt-3 rounded-lg border border-[#E6DFD5] bg-white p-3">
                    <p className="text-xs font-bold text-[#2C1A10]">{myRoleIn(pod)?.role} · You</p>
                    <p className="mt-1 text-xs text-[#5C493E]">{myRoleIn(pod)?.task}</p>
                  </div>
                  {!pod.signedOff && renderInviteAnswer(pod)}
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] p-7 text-center">
                <p className="font-semibold text-[#2C1A10]">No pod invitation yet</p>
                <p className="mt-1 text-sm text-[#6E5A4F]">Your workspace will show projects and tasks after you are matched to a pod.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "pods" && !isYouth && (
          <section className="space-y-4">
            {podRequest.status === "done" && (
              <p role="status" className="rounded-xl border border-[#B9DBA9] bg-[#EEF7E8] px-4 py-2.5 text-sm text-[#2F5A2F]">{podRequest.message}</p>
            )}
            {podRequest.status === "error" && (
              <p role="alert" className="rounded-xl border border-[#E7C3BC] bg-[#FBEDEA] px-4 py-2.5 text-sm text-[#8A2C1E]">{podRequest.message}</p>
            )}
            {orgPods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                <Users className="mx-auto h-6 w-6 text-[#8FA58F]" />
                <p className="mt-2 font-semibold text-[#2C1A10]">No pods yet</p>
                <p className="mt-1 text-sm text-[#6E5A4F]">Describe a need, pick a project and request a pod of verified students.</p>
                <button type="button" onClick={() => setActiveTab("match")} className="mt-3 text-xs font-semibold text-[#3F5D3F] hover:underline">
                  Describe a need
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {orgPods.map((pod) => (
                  <article key={pod.id} aria-label={`Pod: ${pod.projectTitle}`} className="flex flex-col justify-between rounded-2xl border border-[#E6DFD5] bg-white p-6">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E7A5E]">
                          <Users className="h-4 w-4" />
                          <span>{podStageFor(pod)}</span>
                        </span>
                        <span className="text-xs font-bold text-[#3B2314]">{pod.progress}%</span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-[#2C1A10]">{pod.projectTitle}</h3>
                      {pod.need && <p className="text-xs text-[#6E5A4F]">“{pod.need}”</p>}
                      {pod.offer && (
                        <p className="mt-2 text-xs text-[#3B2314]">
                          <span className="font-semibold">Your offer:</span> {pod.offer}
                        </p>
                      )}
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EFEAE4]">
                        <div className="h-full rounded-full bg-[#5E7A5E] transition-all" style={{ width: `${pod.progress}%` }} />
                      </div>
                      <div className="mt-4 space-y-2">
                        {pod.members.map((m) => (
                          <div key={m.role} className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] px-3.5 py-2.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span>
                                <span className="font-bold text-[#2C1A10]">{m.role}:</span>{" "}
                                <span className="font-medium text-[#3B2314]">{m.name || "Looking for a verified student"}</span>
                              </span>
                              {m.userId && MEMBER_STATUS[m.status || "accepted"] && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${MEMBER_STATUS[m.status || "accepted"].className}`}
                                >
                                  {MEMBER_STATUS[m.status || "accepted"].label}
                                </span>
                              )}
                            </div>
                            <p className="text-[#6E5A4F]">{m.task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-[#E6DFD5] pt-4">
                      <span className="inline-flex items-center gap-1 text-xs text-[#5C493E]">
                        <ShieldCheck className="h-4 w-4 text-[#5E7A5E]" />
                        <span>
                          {pod.signedOff || pod.members.some((m) => m.status === "accepted")
                            ? "Sign off once the pod has delivered the work"
                            : "Sign-off opens once a student accepts"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStakeholderSignOff(pod.id)}
                        disabled={pod.signedOff || !pod.members.some((m) => m.status === "accepted")}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                          pod.signedOff
                            ? "cursor-default bg-[#EEF4EE] text-[#3F5D3F]"
                            : "bg-[#3B2314] text-white hover:bg-[#2C1A10] disabled:cursor-not-allowed disabled:bg-[#D8CFC4] disabled:text-[#6E5A4F]"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{pod.signedOff ? "Signed off" : "Approve sign-off"}</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {openProject && (
        <ProjectDetail
          key={openProject.id}
          project={openProject}
          onClose={() => {
            setOpenProjectId(null);
            if (!contactSending) closeContactForm();
          }}
          ownerLine={ownerLineFor(openProject)}
          actions={
            <>
              {!isYouth && openProject.ownerRole === "Youth Pod Talent" && (
                contactStatusFor(openProject) || (
                  contactFormProjectId !== openProject.id && (
                    <button
                      type="button"
                      onClick={() => openContactForm(openProject)}
                      aria-label={`Contact ${openProject.ownerName || "the student"} about ${openProject.title}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#0C1410] hover:bg-white/85"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Contact {openProject.ownerName?.split(" ")[0] || "student"}
                    </button>
                  )
                )
              )}
              {!isYouth && openProject.ownerRole === "Youth Pod Talent" && (
                <button
                  type="button"
                  onClick={() => openStudentProfile(openProject.ownerId)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25"
                >
                  <UserRound className="h-4 w-4" />
                  View {openProject.ownerName?.split(" ")[0] || "student"}&apos;s profile
                </button>
              )}
              {parseGitHubRepo(openProject.repo) && (
                <a
                  href={parseGitHubRepo(openProject.repo).url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25"
                >
                  <Github className="h-4 w-4" />
                  Open on GitHub
                </a>
              )}
            </>
          }
        >
          {!isYouth && openProject.ownerRole === "Youth Pod Talent" && contactFormProjectId === openProject.id && !sentRequestFor(openProject.id) && (
            <div className="rounded-2xl bg-white p-5 text-[#2C1A10]">
              <h3 className="mb-3 text-sm font-bold">Message {openProject.ownerName?.split(" ")[0] || "the student"}</h3>
              {renderContactForm(openProject)}
            </div>
          )}
          {!isYouth && isVerified && (
            <div className="overflow-hidden rounded-2xl bg-white text-[#2C1A10]">
              <AiAnalysisPanel project={openProject} />
            </div>
          )}
          {!isYouth && verificationKnown && !isVerified && (
            <p className="rounded-xl border border-[#E8D9B5] bg-[#FBF5E6] px-4 py-3 text-xs text-[#6B5320]">
              Verify your organisation to run an AI analysis of this project.
            </p>
          )}
        </ProjectDetail>
      )}

      {user && (
        <Modal
          open={showVerify}
          onClose={() => setShowVerify(false)}
          title="Verify your account"
          subtitle={isYouth ? "Students, developers and IT professionals" : "SMMEs, NGOs and sponsors"}
          size="lg"
        >
          <VerificationCenter
            key={`${user.id}-${myVerification?.status || "none"}`}
            user={user}
            group={isYouth ? "youth" : "organization"}
            verification={myVerification}
            details={myDetails}
            githubSignIn={authProviders.github}
            supabaseMode={Boolean(supabase)}
            onSubmit={handleSubmitVerification}
            onLinkGitHub={handleLinkGitHub}
          />
        </Modal>
      )}

      {user && (
        <Modal open={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy & my data" subtitle="Your rights under POPIA" size="lg">
          <PrivacyCenter
            user={{ ...user, isYouth }}
            consentAt={consentAt}
            summary={privacySummary}
            buildExport={buildMyDataExport}
            onDeleteAccount={handleDeleteAccount}
            deleteBlockedReason={
              isAdmin && adminTeam.admins.length <= 1
                ? "You're the only admin, so you can't delete your account yet. Invite another admin under Team first, so someone can still review verification requests."
                : ""
            }
          />
        </Modal>
      )}

      {user && (
        <Modal open={recoveringPassword} onClose={() => setRecoveringPassword(false)} title="Choose a new password" size="md">
          <form onSubmit={handleSetNewPassword} className="space-y-3">
            <label htmlFor="new-password" className="block text-xs font-semibold text-[#3B2314]">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
            />
            {recoveryMessage.type === "error" && (
              <p role="alert" className="text-xs text-[#8A2C1E]">{recoveryMessage.text}</p>
            )}
            <button type="submit" className="rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F]">
              Save new password
            </button>
          </form>
        </Modal>
      )}
      {recoveryMessage.type === "ok" && (
        <p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F] shadow-lg">
          {recoveryMessage.text}
        </p>
      )}

      <ConsentGate
        open={needsConsent}
        userName={user?.name || ""}
        onAgree={handleConsent}
        onSignOut={handleSignOut}
      />
      {needsDetails && (
        <AccountDetailsGate
          key={user.id}
          open
          group={myGroup}
          initialName={isYouth ? user.name : ""}
          onSave={handleSaveAccountDetails}
          onSignOut={handleSignOut}
        />
      )}

      {viewedProfile && (
        <Modal
          open
          onClose={() => setViewProfileUserId(null)}
          title={`${viewedProfile.name}'s profile`}
          subtitle="Student / developer on Geek Archive"
          size="lg"
        >
          <StudentProfile
            name={viewedProfile.name}
            profile={viewedProfile.profile}
            projects={viewedProfile.projects}
            onOpenProject={openProjectFromProfile}
            contactStatusFor={(projectId) => sentRequestFor(projectId)?.status}
          />
        </Modal>
      )}
    </div>
  );
}
