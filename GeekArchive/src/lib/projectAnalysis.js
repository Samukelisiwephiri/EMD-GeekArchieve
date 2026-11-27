// Server-only helpers for the AI project analysis: reading a public GitHub repository
// and producing a basic estimate when the AI isn't configured.
import { z } from "zod";
import { parseGitHubRepo } from "./media";

/** The shape every analysis has, whether it came from Claude or the basic estimate. */
export const AnalysisSchema = z.object({
  plainSummary: z
    .string()
    .describe("2-4 sentences, plain English, for a small-business owner with no technical background."),
  stage: z
    .enum(["Idea / early prototype", "Working prototype", "Working MVP", "Nearly production-ready"])
    .describe("How far along the project is, judged from the evidence."),
  percentComplete: z.number().describe("Rough % complete for a real business deployment, 0-100."),
  skillsUsed: z
    .array(z.object({ skill: z.string(), evidence: z.string().describe("What in the repo shows this skill.") }))
    .describe("Skills the builder demonstrated, most important first. 3-8 items."),
  toolsUsed: z
    .array(z.object({ name: z.string(), purpose: z.string().describe("What it does for this project, in plain words.") }))
    .describe("Languages, frameworks, services and hardware used. 3-10 items."),
  timeToComplete: z.object({
    minWeeks: z.number(),
    maxWeeks: z.number(),
    team: z.string().describe("Team the estimate assumes, e.g. 'a 3-person student pod, ~10 hrs/week each'."),
    confidence: z.enum(["low", "medium", "high"]),
    reasoning: z.string().describe("Why this range, in 1-3 sentences."),
  }),
  remainingWork: z.array(z.string()).describe("Concrete work still needed before a business can rely on it. 3-7 items."),
  sustainabilityTools: z
    .array(
      z.object({
        name: z.string(),
        why: z.string().describe("How it keeps the project running well long-term."),
        cost: z.string().describe("Rough cost note, e.g. 'Free tier', 'About R200/month'."),
      })
    )
    .describe("Future tools/services that would keep the project reliable, secure and maintainable. 3-6 items."),
  risks: z.array(z.string()).describe("Risks a business should know about (e.g. POPIA, single developer, no tests). 2-5 items."),
  questionsToAsk: z.array(z.string()).describe("Questions the business should ask the student before committing. 3-5 items."),
});

const GITHUB_API = "https://api.github.com";
const README_LIMIT = 20000;
const MANIFEST_LIMIT = 6000;
const MANIFESTS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "platformio.ini",
  "pom.xml",
  "build.gradle",
  "go.mod",
  "composer.json",
  "Gemfile",
  "Cargo.toml",
  "pubspec.yaml",
  "Dockerfile",
];

function githubHeaders(raw = false) {
  const headers = {
    Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    "User-Agent": "geek-archive-project-analysis",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function gh(path, { raw = false } = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(raw),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return raw ? res.text() : res.json();
}

/**
 * Reads public facts about a GitHub repo. Only api.github.com is ever contacted,
 * with owner/repo taken from a validated github.com URL (no arbitrary URLs).
 */
export async function readGitHubRepo(repoUrl) {
  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) return { available: false, reason: "No GitHub repository linked." };
  const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;

  let info;
  try {
    info = await gh(base);
  } catch (err) {
    return {
      available: false,
      url: parsed.url,
      reason:
        err.status === 404
          ? "Repository not found or private."
          : err.status === 403
          ? "GitHub rate limit reached; try again later."
          : "Couldn't reach GitHub.",
    };
  }

  const [languages, readme, rootContents] = await Promise.all([
    gh(`${base}/languages`).catch(() => ({})),
    gh(`${base}/readme`, { raw: true }).catch(() => ""),
    gh(`${base}/contents`).catch(() => []),
  ]);
  const rootItems = Array.isArray(rootContents) ? rootContents : [];
  const rootNames = rootItems.map((item) => item.name);

  // Many student repos keep the app in a subfolder (e.g. "GeekArchive/"). If the root
  // has no manifest, look one level down in up to 3 folders.
  let manifestPaths = MANIFESTS.filter((name) => rootNames.includes(name));
  let appFolder = null;
  if (!manifestPaths.length) {
    const folders = rootItems
      .filter((item) => item.type === "dir" && !item.name.startsWith("."))
      .slice(0, 3)
      .map((item) => item.name);
    for (const folder of folders) {
      const list = await gh(`${base}/contents/${encodeURIComponent(folder)}`).catch(() => []);
      const names = Array.isArray(list) ? list.map((item) => item.name) : [];
      const found = MANIFESTS.filter((name) => names.includes(name));
      if (found.length) {
        appFolder = folder;
        manifestPaths = found.map((name) => `${folder}/${name}`);
        rootNames.push(...names.map((name) => `${folder}/${name}`));
        break;
      }
    }
  }
  const manifests = Object.fromEntries(
    await Promise.all(
      manifestPaths.map(async (path) => {
        const encoded = path.split("/").map(encodeURIComponent).join("/");
        const text = await gh(`${base}/contents/${encoded}`, { raw: true }).catch(() => "");
        return [path, truncate(text, MANIFEST_LIMIT)];
      })
    )
  );

  let workflows = [];
  if (rootNames.includes(".github")) {
    const list = await gh(`${base}/contents/.github/workflows`).catch(() => []);
    workflows = Array.isArray(list) ? list.map((item) => item.name) : [];
  }

  const totalBytes = Object.values(languages).reduce((sum, n) => sum + n, 0) || 1;
  return {
    available: true,
    url: parsed.url,
    fullName: info.full_name,
    description: info.description || "",
    topics: info.topics || [],
    stars: info.stargazers_count,
    forks: info.forks_count,
    openIssues: info.open_issues_count,
    license: info.license?.spdx_id || null,
    createdAt: info.created_at,
    lastPushAt: info.pushed_at,
    sizeKb: info.size,
    defaultBranch: info.default_branch,
    languages: Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({ name, percent: Math.round((bytes / totalBytes) * 1000) / 10 })),
    appFolder,
    rootFiles: rootNames.slice(0, 80),
    hasTests: rootNames.some((n) => /(^|\/)(tests?|__tests__|spec|cypress|e2e)$/i.test(n)),
    workflows,
    readme: truncate(readme, README_LIMIT),
    readmeTruncated: readme.length > README_LIMIT,
    manifests,
  };
}

function truncate(text, limit) {
  const value = String(text || "");
  return value.length > limit ? value.slice(0, limit) : value;
}

/** Repo facts safe to show in the UI (no README/manifest bodies). */
export function publicRepoFacts(repo) {
  if (!repo?.available) return repo ? { available: false, reason: repo.reason, url: repo.url } : null;
  const { readme, manifests, rootFiles, ...facts } = repo;
  return { ...facts, manifestFiles: Object.keys(manifests || {}) };
}

// --- Basic estimate (used when AI isn't configured or fails) -----------------------

const FRIENDLY_SKILLS = [
  [/react|next|vue|angular|svelte|html|css|tailwind|javascript|typescript/i, "Building web interfaces"],
  [/node|express|django|flask|fastapi|spring|laravel|rails|go\b|php|java\b/i, "Server-side programming"],
  [/supabase|postgres|mysql|sql|mongo|firebase|sqlite/i, "Working with databases"],
  [/flutter|react native|kotlin|swift|android|ios|dart/i, "Mobile app development"],
  [/python|pandas|numpy|tensorflow|pytorch|ml|ai\b|openai|claude|llm/i, "Data and AI"],
  [/esp32|arduino|iot|c\+\+|\bc\b|raspberry|rs485|sensor|platformio/i, "Hardware and IoT"],
  [/docker|kubernetes|aws|azure|gcp|vercel|netlify|ci|github actions/i, "Deployment and DevOps"],
  [/figma|ui|ux|design/i, "Interface design"],
];

export function basicAnalysis(project, repo) {
  const evidence = [
    ...(project.stack || []),
    ...(repo?.available ? repo.languages.map((l) => l.name) : []),
    ...(repo?.available ? Object.keys(repo.manifests || {}) : []),
    project.description || "",
  ].join(" ");

  const skillsUsed = FRIENDLY_SKILLS.filter(([re]) => re.test(evidence)).map(([, skill]) => ({
    skill,
    evidence: "Matched from the project's listed technologies and repository languages.",
  }));
  const tools = [
    ...(repo?.available ? repo.languages.slice(0, 4).map((l) => ({ name: l.name, purpose: `${l.percent}% of the code` })) : []),
    ...(project.stack || []).map((name) => ({ name, purpose: "Listed by the student" })),
  ];
  const seen = new Set();
  const toolsUsed = tools.filter((t) => !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase())).slice(0, 10);

  const maturity =
    (repo?.available ? 1 : 0) + (repo?.hasTests ? 1 : 0) + (repo?.workflows?.length ? 1 : 0) + (repo?.readme?.length > 1500 ? 1 : 0);
  const [minWeeks, maxWeeks] = [[8, 16], [6, 12], [4, 10], [3, 8], [2, 6]][maturity];

  return {
    plainSummary: `${project.title} is a project posted by a student or developer. ${
      project.summary || project.description || ""
    } This is a basic, automatic estimate — connect the AI analysis for a detailed review.`.trim(),
    stage: maturity >= 3 ? "Working prototype" : "Idea / early prototype",
    percentComplete: [20, 35, 50, 60, 70][maturity],
    skillsUsed: skillsUsed.length ? skillsUsed : [{ skill: "Software development", evidence: "General project work." }],
    toolsUsed: toolsUsed.length ? toolsUsed : [{ name: "Not specified", purpose: "No technologies were listed." }],
    timeToComplete: {
      minWeeks,
      maxWeeks,
      team: "a 3-person student pod, ~10 hrs/week each",
      confidence: "low",
      reasoning: "Based only on whether the project has a repository, tests, automated checks and documentation.",
    },
    remainingWork: [
      !repo?.available && "Share the source code on GitHub so it can be reviewed",
      !repo?.hasTests && "Add automated tests",
      !repo?.workflows?.length && "Set up automatic checks on every change (CI)",
      "Tailor the features to your business and test with real users",
      "Set up hosting, backups and a handover guide",
    ].filter(Boolean),
    sustainabilityTools: [
      { name: "GitHub Actions", why: "Runs tests automatically on every change so updates don't break things.", cost: "Free for public repos" },
      { name: "Managed hosting (e.g. Vercel, Render)", why: "Keeps the app online with automatic updates and HTTPS.", cost: "Free tier, then from about R350/month" },
      { name: "Error monitoring (e.g. Sentry)", why: "Alerts the team when something breaks for a customer.", cost: "Free tier" },
      { name: "Automated database backups", why: "Protects your business data and helps meet POPIA duties.", cost: "Often included with the database" },
    ],
    risks: [
      "Estimate is automatic and not reviewed — confirm details with the student.",
      "If the app stores customer details, it must follow POPIA (consent, security, access).",
    ],
    questionsToAsk: [
      "Which parts are finished and which are still being built?",
      "Can you show the project running with real data?",
      "Who will maintain it after handover, and how?",
    ],
  };
}
