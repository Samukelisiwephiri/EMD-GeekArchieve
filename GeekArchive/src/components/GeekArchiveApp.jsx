"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchProjects, createProject } from "../lib/projects";
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
  Eye,
  EyeOff,
} from "lucide-react";
import ProjectOffers, { OfferForm } from "./ProjectOffers";
import InteractiveAuthBackdrop from "./InteractiveAuthBackdrop";

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

export default function GeekArchiveApp() {
  const [showAuthLanding, setShowAuthLanding] = useState(true);
  const [authMode, setAuthMode] = useState("signin");
  const [authRole, setAuthRole] = useState("Youth Pod Talent");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(false);
const [authError, setAuthError] = useState("");
const [authMessage, setAuthMessage] = useState("");
const [sessionLoading, setSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("talent");
  const [prototypes, setPrototypes] = useState([]);
const [projectsLoading, setProjectsLoading] = useState(false);
const [projectsError, setProjectsError] = useState("");
const [projectSubmitting, setProjectSubmitting] = useState(false);
const [projectSubmitError, setProjectSubmitError] = useState("");
const [projectSubmitSuccess, setProjectSubmitSuccess] = useState("");
const [projectRightsConfirmed, setProjectRightsConfirmed] = useState(false);
  const [pods, setPods] = useState(SAMPLE_PODS);
  const [archiveQuery, setArchiveQuery] = useState("");
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
        { id: "archive", label: "My projects" },
        { id: "offers", label: "Received offers" },
        { id: "pods", label: "My pods" },
        { id: "career", label: "Career proof" },
      ]
    : [
        { id: "match", label: "Describe a need" },
        { id: "archive", label: "Browse projects" },
        { id: "offers", label: "My offers" },
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
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoStack, setNewRepoStack] = useState("");
  const [auditNote, setAuditNote] = useState("");

  const [selectedRole, setSelectedRole] = useState("Developer");
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState(null);

  const youthMatchedMember = user
    ? matchedResult.pod.find((member) => member.assignee.startsWith(`${user.name} ·`))
    : null;
  const youthMatchedOpportunity =
    isYouth && youthMatchedMember ? matchedResult.prototype : null;
  const ownTalentProfiles = talentProfiles.filter(
    (profile) => profile.name.toLowerCase() === user?.name.toLowerCase()
  );

  
  const loadUserProfile = async (authUser) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, display_name, role")
      .eq("id", authUser.id)
      .single();

    if (error || !profile) {
      throw new Error(
        "Unable to load your account profile."
      );
    }

    if (!["youth", "organization"].includes(profile.role)) {
      throw new Error("Unsupported account role.");
    }

    const role =
      profile.role === "youth"
        ? "Youth Pod Talent"
        : "SMME / NGO";

    setUser({
      id: authUser.id,
      name: profile.display_name,
      email: authUser.email,
      role,
      provider: authUser.app_metadata?.provider || "Email",
    });

    setAuthRole(role);

    setNewTalent((current) => ({
      ...current,
      name: profile.display_name,
    }));

    setActiveTab(
      profile.role === "youth" ? "talent" : "match"
    );

    setShowAuthLanding(false);
  };

useEffect(() => {
  let cancelled = false;

  setPrototypes([]);
  setProjectsError("");

  if (!user?.id) {
    setProjectsLoading(false);
    return;
  }

  setProjectsLoading(true);

  const loadProjects = async () => {
    try {
      const projects = await fetchProjects();

      if (!cancelled) {
        setPrototypes(projects);

        console.info(
          `[GeekArchive] Loaded ${projects.length} projects from Supabase.`
        );
      }
    } catch (error) {
      if (!cancelled) {
        setProjectsError("Unable to load the project archive.");
        console.error("[GeekArchive] Project retrieval failed:", error.message);
      }
    } finally {
      if (!cancelled) {
        setProjectsLoading(false);
      }
    }
  };

  loadProjects();

  return () => {
    cancelled = true;
  };
}, [user?.id]);


  useEffect(() => {
  setShowPassword(false);
}, [authMode]);

  useEffect(() => {
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      setSessionLoading(false);
      return;
    }

    let mounted = true;
    let timer;
    let currentUserId = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        clearTimeout(timer);

        if (!session?.user) {
          currentUserId = null;
          setUser(null);
          setShowAuthLanding(true);
          setSessionLoading(false);
          return;
        }

        if (currentUserId === session.user.id) {
          return;
        }

        setSessionLoading(true);

        timer = setTimeout(async () => {
          if (!mounted) return;

          try {
            await loadUserProfile(session.user);
            currentUserId = session.user.id;
          } catch (error) {
            if (!mounted) return;

            setUser(null);
            setShowAuthLanding(true);
            setAuthError(
              error.message || "Unable to restore your session."
            );
          } finally {
            if (mounted) {
              setSessionLoading(false);
            }
          }
        }, 0);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);


  const handleAuthSubmit = async (
    e,
    providerLabel = "Email"
  ) => {
    if (e) e.preventDefault();

    setAuthError("");
    setAuthMessage("");

    if (!supabase) {
      setAuthError("Database connection is unavailable.");
      return;
    }

    if (providerLabel !== "Email") {
      setAuthError(
        `${providerLabel} login is not configured yet. Please use email.`
      );
      return;
    }

    const email = authEmail.trim();

    if (!email || !authPassword) {
      setAuthError("Please enter your email and password.");
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        if (authPassword.length < 8) {
          throw new Error(
            "Password must contain at least 8 characters."
          );
        }

        const displayName = email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const { data, error } = await supabase.auth.signUp({
          email,
          password: authPassword,
          options: {
            data: {
              display_name: displayName,
              role:
                authRole === "Youth Pod Talent"
                  ? "youth"
                  : "organization",
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setAuthMessage(
            "Please check your email to confirm your account, then sign in."
          );
          setAuthMode("signin");
        }
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password: authPassword,
          });

        if (error) throw error;
      }

      setAuthPassword("");
      setShowPassword(false);
    } catch (error) {
      setAuthError(
        error.message || "Authentication failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setAuthMessage("");

    const email = authEmail.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError(
        "Please enter a valid email address first."
      );
      return;
    }

    if (!supabase || authLoading) return;

    setAuthLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (error) throw error;

      setAuthMessage(
        "If an account exists for this email, a password reset link will be sent. Please check your inbox and spam folder."
      );

    } catch (error) {
      if (error.status === 429) {
        setAuthError(
          "Too many requests. Please wait before trying again."
        );
      } else {
        setAuthError(
          "Unable to send a reset link right now. Please try again later."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };


  const handleSignOut = async () => {
    setAuthError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
      return;
    }

    setUser(null);
    setAuthPassword("");
    setShowPassword(false);
    setAuthMode("signin");
    setShowAuthLanding(true);
  };

  const handleExplorePlatform = () => {
    setAuthError(
      "Please create an account or sign in to explore GeekArchive."
    );
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
      const candidates = talentProfiles.filter((profile) => profile.role === role);
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

  if (projectSubmitting) return;

  setProjectSubmitError("");
  setProjectSubmitSuccess("");

  if (!user?.id) {
    setProjectSubmitError("Please sign in first.");
    return;
  }

  if (!projectRightsConfirmed) {
    setProjectSubmitError(
      "Please confirm that you have permission to share this project."
    );
    return;
  }

  setProjectSubmitting(true);

  try {
    const created = await createProject({
      title: newRepoTitle,
      description: newRepoDescription,
      repo: newRepoUrl,
      stack: newRepoStack,
      domain: auditNote,
    });

    const { data: { user: currentUser } } =
      await supabase.auth.getUser();

    if (currentUser?.id !== user.id) return;

    setPrototypes((previous) => [
      created,
      ...previous.filter((project) => project.id !== created.id),
    ]);

    setNewRepoTitle("");
    setNewRepoUrl("");
    setNewRepoDescription("");
    setNewRepoStack("");
    setAuditNote("");
    setProjectRightsConfirmed(false);

    setArchiveQuery("");
    setProjectSubmitSuccess(
      "Your project has been successfully added to the archive."
    );

    console.info("[GeekArchive] Project saved:", created.id);
  } catch (error) {
    setProjectSubmitError(
      error.message || "Unable to submit your project."
    );
  } finally {
    setProjectSubmitting(false);
  }
};


  const handleAddTalent = (e) => {
    e.preventDefault();
    const profile = {
      ...newTalent,
      name: newTalent.name.trim(),
      id: `talent-${Date.now()}`,
      skills: newTalent.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    };
    setTalentProfiles((current) => {
      const existing = current.findIndex(
        (savedProfile) => savedProfile.name.toLowerCase() === profile.name.toLowerCase()
      );
      if (existing < 0) return [profile, ...current];
      return current.map((savedProfile, index) =>
        index === existing ? { ...profile, id: savedProfile.id } : savedProfile
      );
    });
    setNewTalent({
      name: user?.name || "",
      role: "Developer",
      skills: "",
      portfolio: "",
      availability: "",
      preferredFocus: "",
      strengthArea: "",
      experienceLevel: "Student / Junior",
      location: "",
    });
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
    if (isYouth && proto.createdBy !== user?.id) return false;
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


  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="text-xl font-semibold">
            GeekArchive
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Connecting to your workspace...
          </p>
        </div>
      </div>
    );
  }

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

  {authError && (
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
    >
      {authError}
    </div>
  )}

  {authMessage && (
    <div
      role="status"
      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
    >
      {authMessage}
    </div>
  )}

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
                
<div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    required
    value={authPassword}
    onChange={(e) => setAuthPassword(e.target.value)}
    placeholder="••••••••"
    autoComplete={
      authMode === "signup"
        ? "new-password"
        : "current-password"
    }
    className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 pr-12 text-sm text-[#2C1A10] focus:border-[#5E7A5E] focus:outline-none"
  />

  <button
    type="button"
    onClick={() => setShowPassword((current) => !current)}
    aria-label={showPassword ? "Hide password" : "Show password"}
    aria-pressed={showPassword}
    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#68766F] hover:text-[#163126]"
  >
    {showPassword ? (
      <EyeOff className="h-4 w-4" />
    ) : (
      <Eye className="h-4 w-4" />
    )}
  </button>
</div>

{authMode === "signin" && (
  <div className="mt-2 flex justify-end">
    <button
      type="button"
      onClick={handleForgotPassword}
      disabled={authLoading}
      className="text-xs font-semibold text-[#587561] hover:underline disabled:opacity-50"
    >
      Forgot password?
    </button>
  </div>
)}

                <button
                  type="submit"
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#587561] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(88,117,97,0.18)] transition hover:bg-[#46634F]"
                >
                  <span>{authMode === "signin" ? "Sign In to Workspace" : "Create Account"}</span>
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#163126] text-[#C8DD9F]">
              <span className="text-xs font-black">GA</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#163126]">Geek Archive</span>
              <span className="ml-2 hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#708078] sm:inline">
                Embedded Intelligence
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#163126] text-[#C8DD9F]"
                    : "text-[#68766F] hover:bg-[#E8EEE5] hover:text-[#163126]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] px-3 py-1.5 text-xs">
                  <span className="font-semibold text-[#2C1A10]">{user.name}</span>
                  <span className="ml-1.5 text-[#5E7A5E] font-medium">• {user.role}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#D8CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B2314] hover:bg-[#FAF8F5]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
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
                  {matchedResult.prototype.repo && (
                    <p className="mt-1 text-xs text-[#6E5A4F]">
                      Project link: {matchedResult.prototype.repo}
                    </p>
                  )}
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
                          <a
                            href={member.profile.portfolio}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline"
                          >
                            <Link2 className="h-3 w-3" />
                            View matched portfolio
                          </a>
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

        {activeTab === "archive" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleIngestPrototype}
              className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6 lg:col-span-5"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#5E7A5E]" />
                <h2 className="text-lg font-bold text-[#2C1A10]">Add a project</h2>
              </div>
              <p className="text-xs text-[#6E5A4F]">
                Give your project a second life. Share its description,
repository link, technology stack and target sector.
Only submit projects you have permission to share.
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
                <label className="block text-xs font-semibold text-[#3B2314] mb-1">Project or repository link</label>
                <input
                  type="text"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
                />
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
              <label className="flex items-start gap-2 text-xs text-[#5C493E]">
                <input
                  type="checkbox"
                  required
                  checked={projectRightsConfirmed}
                  onChange={(e) =>
                    setProjectRightsConfirmed(e.target.checked)
                  }
                  className="mt-0.5 accent-[#5E7A5E]"
                />
                <span>
                  I own this project or have permission from its
                  contributors to share it on GeekArchive.
                </span>
              </label>

              {projectSubmitError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {projectSubmitError}
                </div>
              )}

              {projectSubmitSuccess && (
                <div
                  role="status"
                  className="rounded-xl bg-green-50 p-3 text-sm text-green-700"
                >
                  {projectSubmitSuccess}
                </div>
              )}
              <button
  type="submit"
  disabled={projectSubmitting || !projectRightsConfirmed}
  className="w-full rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C] disabled:cursor-not-allowed disabled:opacity-50"
>
                {projectSubmitting ? "Saving project..." : "Add project to archive"}
              </button>
            </form>

            <div className="space-y-4 lg:col-span-7">
              <div className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#2C1A10]">{isYouth ? "My submitted projects" : "Browse existing projects"}</h2>
                    <p className="mt-1 text-xs text-[#6E5A4F]">
                      Search names, descriptions, stacks, and sectors.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                    {prototypes.filter((proto) => !isYouth || proto.createdBy === user?.id).length} projects
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
              {projectsLoading && (
                <p className="p-4 text-sm text-[#5E7A5E]">Loading projects...</p>
              )}
              {projectsError && (
                <p role="alert" className="p-4 text-sm text-red-700">{projectsError}</p>
              )}
              {visiblePrototypes.map((proto) => (
                <div key={proto.id} className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {proto.domain && (
                        <span className="text-xs font-semibold text-[#5E7A5E]">{proto.domain}</span>
                      )}
                      <h3 className="text-base font-bold text-[#2C1A10]">{proto.title}</h3>
                      {proto.summary && (
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5C493E]">
                          {proto.summary}
                        </p>
                      )}
                      {proto.repo && <p className="text-xs text-[#6E5A4F]">{proto.repo}</p>}
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
                  {!isYouth && user && proto.active && !proto.illustrative && proto.createdBy && proto.createdBy !== user.id && (
                    <OfferForm key={`${user.id}:${proto.id}`} project={proto} onDone={() => setActiveTab("offers")} />
                  )}
                  {proto.missing.length > 0 && (
                    <p className="mt-3 text-xs text-[#5C493E]">
                      <strong>Remaining work:</strong> {proto.missing.join(" • ")}
                    </p>
                  )}
                </div>
              ))}
              {!projectsLoading && !projectsError && visiblePrototypes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                  <p className="font-semibold text-[#2C1A10]">No projects found</p>
                  <p className="mt-1 text-sm text-[#6E5A4F]">Try a different project name or add it to the archive.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "offers" && user && <ProjectOffers key={user.id} user={user} projects={prototypes} />}

        {activeTab === "talent" && isYouth && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleAddTalent}
              className="space-y-4 rounded-2xl border border-[#E6DFD5] bg-white p-6 lg:col-span-5"
            >
              <div className="flex items-center gap-2">
                <UserRoundPlus className="h-5 w-5 text-[#5E7A5E]" />
                <h2 className="text-lg font-bold text-[#2C1A10]">My talent profile</h2>
              </div>
              <p className="text-xs leading-relaxed text-[#6E5A4F]">
                Share the essentials so Geek Archive can connect you to the right project pod. Your profile is only shown to an organization when matched.
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

              <details className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold text-[#3B2314]">
                  Add optional matching details
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

              <button
                type="submit"
                className="w-full rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C]"
              >
                Save my profile
              </button>
            </form>

            <section className="space-y-4 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DFD5] bg-white p-5">
                <div>
                  <h2 className="text-lg font-bold text-[#2C1A10]">My profile</h2>
                  <p className="mt-1 text-xs text-[#6E5A4F]">
                    Only your own profile appears in this dashboard.
                  </p>
                </div>
                <span className="rounded-full bg-[#EEF4EE] px-3 py-1 text-xs font-semibold text-[#3F5D3F]">
                  {ownTalentProfiles.length ? "Profile saved" : "No profile yet"}
                </span>
              </div>

              {ownTalentProfiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#C8D4C7] bg-white/70 p-8 text-center">
                  <p className="font-semibold text-[#2C1A10]">Your profile starts here</p>
                  <p className="mt-1 text-sm text-[#6E5A4F]">
                    Add your skills, portfolio, and availability to get matched with a project pod.
                  </p>
                </div>
              ) : (
                ownTalentProfiles.map((profile) => (
                  <article key={profile.id} className="rounded-2xl border border-[#E6DFD5] bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-[#2C1A10]">{profile.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[#5E7A5E]">{profile.role}</p>
                      </div>
                      <span className="rounded-full bg-[#FAF8F5] px-3 py-1 text-xs font-semibold text-[#3B2314]">
                        {profile.availability}
                      </span>
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
                        {member.role}{member.assignee.startsWith(`${user.name} ·`) ? " · You" : ""}
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
    </div>
  );
}
