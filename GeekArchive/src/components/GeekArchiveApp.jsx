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
  Award,
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
  UserRound,
} from "lucide-react";
import InteractiveAuthBackdrop from "./InteractiveAuthBackdrop";
import ProjectLinks, { VideoPlayer, VideoPreview } from "./ProjectLinks";
import Modal from "./Modal";
import StudentProfile from "./StudentProfile";
import AiAnalysisPanel from "./AiAnalysisPanel";
import { parseGitHubRepo, toVideoEmbed, SUPPORTED_VIDEO_HINT } from "../lib/media";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

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
  "missing_modules, domain, demo_video_url, suggested_price, is_illustrative, included_tailoring, " +
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

const SAMPLE_PODS = [
  {
    id: "pod-101",
    client: "Bra Joe's Tuckshop (Pretoria)",
    prototype: "KasiLedger — Spaza Stock & Credit Tracker",
    stage: "Stage 4: Live Staging & Sign-Off",
    progress: 85,
    members: [
      { role: "Developer", name: "Thabo M.", focus: "Offline queue + API routes" },
      { role: "UI/UX Designer", name: "Amahle K.", focus: "One-thumb mobile checkout" },
      { role: "Business Student", name: "Lesedi N.", focus: "Weekly credit pitch & guide" },
    ],
  },
  {
    id: "pod-102",
    client: "Sizanani Youth Skills NPC",
    prototype: "UbuntuAid — Community Grant & Voucher Hub",
    stage: "Stage 3: Pod Sprint Active",
    progress: 55,
    members: [
      { role: "Developer", name: "Sipho D.", focus: "Supabase RLS + voucher status" },
      { role: "UI/UX Designer", name: "Naledi R.", focus: "Low-data step wizard" },
      { role: "Business Student", name: "Kamohelo T.", focus: "Donor reporting template" },
    ],
  },
];

const INTERVIEW_PROMPTS = {
  Developer:
    "How did you structure your API and database access so a low-bandwidth mobile user can still record stock updates reliably without losing data?",
  "UI/UX Designer":
    "What changes did you make to simplify navigation and typography for a shop owner or NGO coordinator using an entry-level smartphone?",
  "Business Student":
    "How did you shape the pricing, handover steps, and value proposition so a small business can adopt the tool within its first week?",
};

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
  const [pods, setPods] = useState(SAMPLE_PODS);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverSkill, setDiscoverSkill] = useState(""); // lower-case skill, "" = all
  const [discoverSector, setDiscoverSector] = useState(""); // lower-case sector, "" = all
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
  const dashboardRole = user?.role || authRole;
  const isYouth = dashboardRole === "Youth Pod Talent";
  const navTabs = isYouth
    ? [
        { id: "opportunities", label: "Matched opportunities" },
        { id: "talent", label: "My profile" },
        { id: "myprojects", label: "My projects" },
        { id: "messages", label: "Messages" },
        { id: "pods", label: "My pods" },
        { id: "career", label: "Career proof" },
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
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoStack, setNewRepoStack] = useState("");
  const [auditNote, setAuditNote] = useState("");

  const [selectedRole, setSelectedRole] = useState("Developer");
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState(null);

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

  const youthMatchedMember = user?.id
    ? matchedResult.pod.find((member) => member.profile?.userId === user.id)
    : null;
  const youthMatchedOpportunity =
    isYouth && youthMatchedMember ? matchedResult.prototype : null;

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
        .select("display_name, role")
        .eq("id", authUser.id)
        .maybeSingle();
      if (cancelled) return;
      const storedRole = profile?.role || authUser.user_metadata?.role;
      const role = ["organization", "admin"].includes(storedRole) ? "SMME / NGO" : "Youth Pod Talent";
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
      });
      setNewTalent((current) => ({ ...current, name }));
      setActiveTab(role === "Youth Pod Talent" ? "talent" : "match");
      setShowAuthLanding(false);
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const handleAuthSubmit = async (e, providerLabel = "Email") => {
    if (e) e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    const isOAuth = providerLabel === "Google" || providerLabel === "GitHub";

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
              data: {
                display_name: nameFromEmail(authEmail),
                role: authRole === "SMME / NGO" ? "organization" : "youth",
              },
            },
          });
          if (error) throw error;
          if (!data.session) {
            setAuthNotice("Check your email to confirm your account, then sign in.");
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
      } catch (err) {
        setAuthError(err?.message || "Something went wrong. Please try again.");
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

    // If this demo user already saved a profile, keep the name they chose there.
    const demoId = demoUserId(derivedName);
    const displayName =
      talentProfiles.find((profile) => profile.userId === demoId)?.name || derivedName;
    setUser({
      id: demoId,
      email: isOAuth ? "" : authEmail.trim(),
      name: displayName,
      role: authRole,
      provider: providerLabel,
    });
    setNewTalent((current) => ({ ...current, name: displayName }));
    setActiveTab(authRole === "Youth Pod Talent" ? "talent" : "match");
    setShowAuthLanding(false);
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      // The next person must only see what the database allows them to.
      setPrototypes([]);
      setContactRequests([]);
      setTalentProfiles([]);
    }
    setUser(null);
    setEditingTalent(false);
    setTalentError("");
    setConfirmDeleteTalent(false);
    setOpenProjectId(null);
    clearProjectForm();
    setConfirmDeleteId(null);
    closeContactForm();
    setMessagesError("");
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
    const searchTerms = text.split(/[^a-z0-9]+/).filter((term) => term.length > 2);
    const rankedProjects = prototypes
      .map((project) => {
        const searchable = [
          project.title,
          project.domain,
          project.summary,
          project.description,
          ...(project.aliases || []),
          ...project.stack,
        ]
          .join(" ")
          .toLowerCase();
        return {
          project,
          score: searchTerms.reduce(
            (total, term) => total + (searchable.includes(term) ? 1 : 0),
            0
          ),
        };
      })
      .sort((a, b) => b.score - a.score);
    const chosenProto = rankedProjects[0]?.score > 0 ? rankedProjects[0].project : null;
    const findTalentProfile = (role) => {
      const candidates = talentDirectory.filter((profile) => profile.role === role);
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
    if (created.demoVideo && !toVideoEmbed(created.demoVideo)) {
      setProjectError(`That demo video link can't be played. Use ${SUPPORTED_VIDEO_HINT}.`);
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
        stack: created.stack.length ? created.stack : existing.stack,
        domain: created.domain || existing.domain,
      };
    }

    const resetForm = () => {
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

  const clearProjectForm = () => {
    setNewRepoTitle("");
    setNewRepoUrl("");
    setNewRepoVideo("");
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
    if (project.ownerId !== user?.id) return;
    setEditingProjectId(project.id);
    setConfirmDeleteId(null);
    setProjectError("");
    setNewRepoTitle(project.title);
    setNewRepoUrl(project.repo || "");
    setNewRepoVideo(project.demoVideo || "");
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
    setPrototypes((prev) => prev.filter((p) => p.id !== project.id));
    syncMatchedPrototype(project.id, null);
    if (editingProjectId === project.id) clearProjectForm();
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

  const handleStakeholderSignOff = (podId) => {
    setPods((prev) =>
      prev.map((p) =>
        p.id === podId
          ? { ...p, progress: 100, stage: "Verified Shipped & Credential Issued" }
          : p
      )
    );
  };

  const handleEvaluateInterview = (e) => {
    e.preventDefault();
    const wordCount = candidateAnswer.trim().split(/\s+/).filter(Boolean).length;
    const score = wordCount >= 25 ? "8.8 / 10" : wordCount >= 10 ? "7.4 / 10" : "5.8 / 10";
    setInterviewFeedback({
      score,
      strength:
        "You tied your explanation directly to real user constraints and practical delivery trade-offs.",
      nextStep:
        "Quantify one measurable outcome—such as load speed, reduced steps, or time saved per week—to make your answer recruiter-ready.",
    });
  };

  const visiblePrototypes = prototypes.filter((proto) => {
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
        projects: prototypes.filter((p) => p.ownerId === viewProfileUserId),
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
  const youthPostedProjects = prototypes.filter((proto) => proto.ownerRole === "Youth Pod Talent");
  // Filter options come from what students actually posted. Matching ignores case,
  // so "react" and "React" count as the same skill.
  const skillOptions = countOptions(youthPostedProjects.flatMap((proto) => proto.stack));
  const sectorOptions = countOptions(youthPostedProjects.map((proto) => proto.domain));
  // A filter whose last project was deleted quietly falls back to "All".
  const activeSkill = skillOptions.some((o) => o.key === discoverSkill) ? discoverSkill : "";
  const activeSector = sectorOptions.some((o) => o.key === discoverSector) ? discoverSector : "";
  const hasDiscoverFilters = Boolean(activeSkill || activeSector || discoverQuery.trim());
  const discoveredProjects = youthPostedProjects.filter(
    (proto) =>
      (!activeSkill || proto.stack.some((tech) => tech.toLowerCase() === activeSkill)) &&
      (!activeSector || (proto.domain || "").toLowerCase() === activeSector) &&
      [proto.title, proto.domain, proto.summary, proto.description, proto.ownerName, ...proto.stack]
        .join(" ")
        .toLowerCase()
        .includes(discoverQuery.trim().toLowerCase())
  );
  // Requests this student has received, newest first; "new" ones count as unread.
  const myContactRequests = contactRequests.filter(
    (request) => isYouth && user?.id && request.studentId === user.id
  );
  const unreadRequestCount = myContactRequests.filter((request) => request.status === "new").length;

  const clearDiscoverFilters = () => {
    setDiscoverQuery("");
    setDiscoverSkill("");
    setDiscoverSector("");
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
        <label htmlFor="project-video" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#3B2314]">
          <PlayCircle className="h-3.5 w-3.5" />
          Demo video <span className="font-normal text-[#8A786D]">(optional)</span>
        </label>
        <input
          id="project-video"
          type="url"
          inputMode="url"
          value={newRepoVideo}
          onChange={(e) => setNewRepoVideo(e.target.value)}
          placeholder="https://youtu.be/…"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-[#8A786D]">{SUPPORTED_VIDEO_HINT}. Plays inside Geek Archive.</p>
      </div>
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
          disabled={projectSaving}
          className="flex-1 rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C] disabled:cursor-wait disabled:opacity-70"
        >
          {projectSaving ? "Saving…" : editingProjectId ? "Save changes" : "Post my project"}
        </button>
        {editingProjectId && (
          <button
            type="button"
            onClick={clearProjectForm}
            disabled={projectSaving}
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
      <div className="relative min-h-screen w-full overflow-hidden text-white flex flex-col justify-between">
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
              {authError && (
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
                      onClick={() => setAuthRole(roleOption)}
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

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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

                <button
                  type="button"
                  onClick={() => handleAuthSubmit(null, "GitHub")}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#3B2314] bg-[#3B2314] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2C1A10]"
                >
                  <GitBranch className="h-4 w-4 text-[#A8C6A8]" />
                  <span>Continue with GitHub</span>
                </button>
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E6DFD5]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#8A786D]">
                  or email
                </span>
                <div className="h-px flex-1 bg-[#E6DFD5]" />
              </div>

              <form onSubmit={(e) => handleAuthSubmit(e, "Email")} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3B2314] mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
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
                    minLength={6}
                    autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none"
                  />
                </div>
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

        <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-[#DFD7CE]">
          <span>Geek Archive • Embedded Intelligence</span>
          <span>Move your cursor to interact with the pod network</span>
        </footer>
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
                    <p className="truncate text-xs font-semibold text-[#2C1A10]">{user.name}</p>
                    <p className="truncate text-[11px] font-medium text-[#5E7A5E]">{user.role}</p>
                  </div>
                </div>
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
                      <p className="truncate text-sm font-semibold text-[#2C1A10]">{user.name}</p>
                      <p className="truncate text-xs font-medium text-[#5E7A5E]">{user.role}</p>
                    </div>
                  </div>
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
                {isYouth ? (
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
              <p className="max-w-xl text-sm leading-relaxed text-[#D5DED2]">
                {isYouth
                  ? "Create your talent profile, join a project pod, and turn shipped work into career proof."
                  : "Describe your organization’s challenge, explore existing projects, and meet a pod built to help."}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(isYouth ? "opportunities" : "archive")}
                className="relative inline-flex items-center gap-2 rounded-full bg-[#C8DD9F] px-5 py-3 text-xs font-bold text-[#163126] shadow-[0_12px_30px_rgba(200,221,159,0.12)] hover:bg-[#D5E7B5]"
              >
                {isYouth ? (
                  <Users className="h-4 w-4 text-[#5E7A5E]" />
                ) : (
                  <Layers className="h-4 w-4 text-[#5E7A5E]" />
                )}
                <span>{isYouth ? "My opportunities" : "Browse projects"}</span>
              </button>
            </div>
          </div>
        </section>

        {activeTab === "opportunities" && isYouth && (
          <section className="rounded-2xl border border-[#E6DFD5] bg-white p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">
                Youth dashboard
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#2C1A10]">Matched opportunities</h2>
              <p className="mt-1 text-sm text-[#6E5A4F]">
                Only projects matched to your profile appear here.
              </p>
            </div>
            {youthMatchedOpportunity ? (
              <article className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-5">
                <h3 className="font-bold text-[#2C1A10]">{youthMatchedOpportunity.title}</h3>
                {youthMatchedOpportunity.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-[#5C493E]">
                    {youthMatchedOpportunity.summary}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#6E5A4F]">
                  Your pod role: {youthMatchedMember.role}
                </p>
                <p className="mt-3 text-sm text-[#3B2314]">{youthMatchedMember.task}</p>
                {youthMatchedOpportunity.stack.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {youthMatchedOpportunity.stack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md bg-[#EEF4EE] px-2.5 py-1 text-xs font-medium text-[#3F5D3F]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ) : (
              <div className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] p-7 text-center">
                <p className="font-semibold text-[#2C1A10]">No matched opportunities yet</p>
                <p className="mt-1 text-sm text-[#6E5A4F]">
                  Keep your profile current. Projects matched to you will appear here.
                </p>
              </div>
            )}
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
            </div>
          </div>
        )}

        {activeTab === "discover" && !isYouth && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#2C1A10]">Discover projects by students &amp; developers</h2>
                  <p className="mt-1 text-xs text-[#6E5A4F]">
                    Projects posted by youth talent. Only SMMEs, NGOs and sponsors can see this list.
                  </p>
                </div>
                <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                  {youthPostedProjects.length} posted
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#3B2314]">Search</span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C8B80]" />
                    <input
                      type="search"
                      value={discoverQuery}
                      onChange={(e) => setDiscoverQuery(e.target.value)}
                      placeholder="Project, skill, sector or person"
                      className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm"
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#3B2314]">Skill</span>
                  <select
                    value={activeSkill}
                    onChange={(e) => setDiscoverSkill(e.target.value)}
                    disabled={!skillOptions.length}
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3 py-2.5 text-sm disabled:opacity-60"
                  >
                    <option value="">All skills</option>
                    {skillOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#3B2314]">Sector</span>
                  <select
                    value={activeSector}
                    onChange={(e) => setDiscoverSector(e.target.value)}
                    disabled={!sectorOptions.length}
                    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3 py-2.5 text-sm disabled:opacity-60"
                  >
                    <option value="">All sectors</option>
                    {sectorOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={clearDiscoverFilters}
                  disabled={!hasDiscoverFilters}
                  className="rounded-xl border border-[#D8CFC4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3B2314] hover:bg-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear filters
                </button>
              </div>
              {youthPostedProjects.length > 0 && (
                <p className="mt-3 text-xs text-[#6E5A4F]" aria-live="polite">
                  Showing {discoveredProjects.length} of {youthPostedProjects.length} projects
                </p>
              )}
            </div>

            {discoveredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                <p className="font-semibold text-[#2C1A10]">
                  {youthPostedProjects.length ? "No projects match your filters" : "No student projects posted yet"}
                </p>
                <p className="mt-1 text-sm text-[#6E5A4F]">
                  {youthPostedProjects.length
                    ? "Try a different skill, sector or search."
                    : "When students and developers post their work, it will appear here."}
                </p>
                {youthPostedProjects.length > 0 && (
                  <button
                    type="button"
                    onClick={clearDiscoverFilters}
                    className="mt-3 text-xs font-semibold text-[#3F5D3F] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {discoveredProjects.map((proto) => (
                  <article key={proto.id} className="flex flex-col rounded-2xl border border-[#E6DFD5] bg-white p-5">
                    <VideoPreview project={proto} onOpen={() => setOpenProjectId(proto.id)} />
                    {proto.domain && (
                      <span className="text-xs font-semibold text-[#5E7A5E]">{proto.domain}</span>
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
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#6E5A4F]">
                      <Users className="h-3.5 w-3.5" />
                      Posted by <span className="font-semibold text-[#3B2314]">{proto.ownerName}</span>
                      {talentRoleFor(proto.ownerId) && <span>· {talentRoleFor(proto.ownerId)}</span>}
                      {proto.postedAt && (
                        <span>· {new Date(proto.postedAt).toLocaleDateString()}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => openStudentProfile(proto.ownerId)}
                        aria-label={`View ${proto.ownerName || "student"}'s profile`}
                        className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#EEF4EE] px-2 py-0.5 font-semibold text-[#2F472F] hover:bg-[#DDEBD8]"
                      >
                        <UserRound className="h-3 w-3" />
                        View profile
                      </button>
                    </p>
                    {proto.summary && (
                      <p className="mt-2 text-sm leading-relaxed text-[#5C493E]">{proto.summary}</p>
                    )}
                    {proto.description && proto.description !== proto.summary && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-[#3F5D3F]">
                          Read full description
                        </summary>
                        <p className="mt-2 text-sm leading-relaxed text-[#5C493E]">{proto.description}</p>
                      </details>
                    )}
                    {proto.stack.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {proto.stack.map((tech) => {
                          const selected = activeSkill === tech.toLowerCase();
                          return (
                            <button
                              key={tech}
                              type="button"
                              onClick={() => setDiscoverSkill(selected ? "" : tech.toLowerCase())}
                              aria-pressed={selected}
                              title={selected ? "Show all skills" : `Show only ${tech} projects`}
                              className={`rounded-md px-2.5 py-0.5 text-xs font-medium transition ${
                                selected
                                  ? "bg-[#163126] text-[#C8DD9F]"
                                  : "bg-[#EEF4EE] text-[#3F5D3F] hover:bg-[#DDEBD8]"
                              }`}
                            >
                              {tech}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-4">
                      <ProjectLinks project={proto} onOpen={() => setOpenProjectId(proto.id)} />
                    </div>

                    <div className="mt-4 border-t border-[#EEE8E1] pt-4">
                      {(() => {
                        const sent = sentRequestFor(proto.id);
                        if (sent) {
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
                        }
                        if (contactFormProjectId !== proto.id) {
                          return (
                            <button
                              type="button"
                              onClick={() => openContactForm(proto)}
                              aria-label={`Contact ${proto.ownerName || "the student"} about ${proto.title}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B2314] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2C1A10]"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Contact student
                            </button>
                          );
                        }
                        return (
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
                      })()}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
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

        {activeTab === "myprojects" && isYouth && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {projectForm}

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
                    <div className="mt-3">
                      <ProjectLinks project={proto} compact />
                    </div>
                    {!proto.repo && !proto.demoVideo && (
                      <p className="mt-3 text-[11px] text-[#8A786D]">
                        Tip: add a GitHub repo and demo video so organizations can see your work in action.
                      </p>
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
                      {proto.domain && (
                        <span className="text-xs font-semibold text-[#5E7A5E]">{proto.domain}</span>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">
                Youth dashboard
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#2C1A10]">My pod workspace</h2>
            </div>
            {youthMatchedOpportunity ? (
              <div className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-5">
                <h3 className="font-bold text-[#2C1A10]">{youthMatchedOpportunity.title}</h3>
                <div className="mt-4 space-y-2">
                  {matchedResult.pod.map((member) => (
                    <div
                      key={member.role}
                      className="rounded-lg border border-[#E6DFD5] bg-white p-3"
                    >
                      <p className="text-xs font-bold text-[#2C1A10]">
                        {member.role}{member.profile?.userId === user?.id ? " · You" : ""}
                      </p>
                      <p className="mt-1 text-xs text-[#5C493E]">{member.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] p-7 text-center">
                <p className="font-semibold text-[#2C1A10]">No pod invitation yet</p>
                <p className="mt-1 text-sm text-[#6E5A4F]">
                  Your workspace will show projects and tasks after you are matched to a pod.
                </p>
              </div>
            )}
          </section>
        )}

        {activeTab === "pods" && !isYouth && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {pods.map((pod) => (
              <div key={pod.id} className="flex flex-col justify-between rounded-2xl border border-[#E6DFD5] bg-white p-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E7A5E]">
                      <Users className="h-4 w-4" />
                      <span>{pod.stage}</span>
                    </span>
                    <span className="text-xs font-bold text-[#3B2314]">{pod.progress}%</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-[#2C1A10]">{pod.client}</h3>
                  <p className="text-xs text-[#6E5A4F]">Prototype: {pod.prototype}</p>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EFEAE4]">
                    <div
                      className="h-full rounded-full bg-[#5E7A5E] transition-all"
                      style={{ width: `${pod.progress}%` }}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {pod.members.map((m) => (
                      <div
                        key={m.role}
                        className="flex items-center justify-between rounded-xl bg-[#FAF8F5] px-3.5 py-2.5 text-xs border border-[#E6DFD5]"
                      >
                        <div>
                          <span className="font-bold text-[#2C1A10]">{m.role}:</span>{" "}
                          <span className="font-medium text-[#3B2314]">{m.name}</span>
                          <p className="text-[#6E5A4F]">{m.focus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E6DFD5] flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-[#5C493E]">
                    <ShieldCheck className="h-4 w-4 text-[#5E7A5E]" />
                    <span>Stakeholder Verification Gate</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStakeholderSignOff(pod.id)}
                    disabled={pod.progress === 100}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      pod.progress === 100
                        ? "bg-[#EEF4EE] text-[#3F5D3F] cursor-default"
                        : "bg-[#3B2314] text-white hover:bg-[#2C1A10]"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{pod.progress === 100 ? "Signed Off & Verified" : "Approve Sign-Off"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "career" && isYouth && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6 lg:col-span-5">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#5E7A5E]" />
                <h2 className="text-lg font-bold text-[#2C1A10]">Verified Career Proof</h2>
              </div>
              <p className="text-xs text-[#6E5A4F]">
                Completed pod milestones turn into verifiable deliverables across code, design, and commercial execution.
              </p>
              <div className="space-y-3 rounded-xl bg-[#FAF8F5] p-4 border border-[#E6DFD5] text-xs">
                <p className="font-bold text-[#2C1A10]">Shipped Pod Credentials</p>
                <p className="text-[#5C493E]">• Developer: Pull requests, API stability &amp; live deployment</p>
                <p className="text-[#5C493E]">• UI/UX Designer: Mobile-first wireframes &amp; usability flow</p>
                <p className="text-[#5C493E]">• Business Student: SMME/NGO pricing &amp; handover playbook</p>
              </div>
            </div>

            <form
              onSubmit={handleEvaluateInterview}
              className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6 lg:col-span-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[#2C1A10]">Role-Based Mock Interview Simulator</h2>
                <div className="flex gap-1.5">
                  {["Developer", "UI/UX Designer", "Business Student"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setInterviewFeedback(null);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        selectedRole === role
                          ? "bg-[#3B2314] text-white"
                          : "bg-[#FAF8F5] text-[#5C493E] border border-[#E6DFD5]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-[#FAF8F5] p-4 border border-[#E6DFD5] text-sm font-medium text-[#2C1A10]">
                {INTERVIEW_PROMPTS[selectedRole]}
              </div>

              <textarea
                rows={4}
                required
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                placeholder="Write how you would answer this in an interview based on your pod work..."
                className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] p-3.5 text-sm"
              />

              <button
                type="submit"
                className="rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C]"
              >
                Get Interview Readiness Score
              </button>

              {interviewFeedback && (
                <div className="rounded-xl border border-[#C8DEC8] bg-[#EEF4EE] p-4 text-xs text-[#263B26] space-y-1">
                  <p className="text-sm font-bold">Readiness Score: {interviewFeedback.score}</p>
                  <p>{interviewFeedback.strength}</p>
                  <p>
                    <strong>Tip:</strong> {interviewFeedback.nextStep}
                  </p>
                </div>
              )}
            </form>
          </div>
        )}
      </main>

      {openProject && (
        <Modal
          open
          onClose={() => setOpenProjectId(null)}
          title={openProject.title}
          subtitle={[
            openProject.ownerName && `Posted by ${openProject.ownerName}`,
            openProject.domain,
            openProject.postedAt && new Date(openProject.postedAt).toLocaleDateString(),
          ]
            .filter(Boolean)
            .join(" · ")}
          size="xl"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
              {!isYouth && openProject.ownerRole === "Youth Pod Talent" && (
                <button
                  type="button"
                  onClick={() => openStudentProfile(openProject.ownerId)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#163126] hover:bg-[#FAF8F5]"
                >
                  <UserRound className="h-3.5 w-3.5" />
                  View {openProject.ownerName?.split(" ")[0] || "student"}&apos;s profile
                </button>
              )}
              {parseGitHubRepo(openProject.repo) ? (
                <a
                  href={parseGitHubRepo(openProject.repo).url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#163126] hover:bg-[#FAF8F5]"
                >
                  <Github className="h-3.5 w-3.5" />
                  Open on GitHub
                </a>
              ) : (
                <span className="text-xs text-[#8A786D]">No GitHub repository added yet.</span>
              )}
              </div>
              {!isYouth && openProject.ownerRole === "Youth Pod Talent" && !sentRequestFor(openProject.id) && (
                <button
                  type="button"
                  onClick={() => {
                    const project = openProject;
                    setOpenProjectId(null);
                    setActiveTab("discover");
                    openContactForm(project);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B2314] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2C1A10]"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Contact {openProject.ownerName?.split(" ")[0] || "student"}
                </button>
              )}
            </div>
          }
        >
          {openProject.demoVideo ? (
            <VideoPlayer project={openProject} autoplay />
          ) : (
            <p className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] px-4 py-3 text-xs text-[#6E5A4F]">
              No demo video yet — you can ask the student for one when you get in touch.
            </p>
          )}
          {openProject.summary && (
            <p className="mt-5 text-base font-medium leading-relaxed text-[#2C1A10]">{openProject.summary}</p>
          )}
          {openProject.description && openProject.description !== openProject.summary && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#5C493E]">
              {openProject.description}
            </p>
          )}
          {openProject.stack.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">Built with</p>
              <div className="flex flex-wrap gap-1.5">
                {openProject.stack.map((tech) => (
                  <span key={tech} className="rounded-md bg-[#EEF4EE] px-2.5 py-1 text-xs font-medium text-[#3F5D3F]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!isYouth && (
            <div className="mt-6">
              <AiAnalysisPanel project={openProject} />
            </div>
          )}
        </Modal>
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
