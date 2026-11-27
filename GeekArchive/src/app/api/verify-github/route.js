// POST /api/verify-github  { username, code }
// Proves a developer controls a GitHub account: they paste a one-time code into their
// public GitHub bio, and this route checks it via GitHub's public API.
// Used in demo mode; with Supabase, developers link their GitHub account instead
// (the database confirms the linked identity).
import { isGitHubUsername } from "../../../lib/verification";
import { rateKey, requireUser } from "../../../lib/serverAuth";

export const runtime = "nodejs";

const MIN_ACCOUNT_AGE_DAYS = 30;
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 10;
}

export async function POST(request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ verified: false, error: "Invalid request." }, { status: 400 });
  }
  const username = String(body?.username || "").trim();
  const code = String(body?.code || "").trim();
  if (!isGitHubUsername(username) || !/^GA-[A-Z0-9]{6}$/.test(code)) {
    return Response.json({ verified: false, error: "Enter a valid GitHub username." }, { status: 400 });
  }
  if (rateLimited(rateKey(request, auth))) {
    return Response.json({ verified: false, error: "Too many checks. Please wait a few minutes." }, { status: 429 });
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "geek-archive-verification",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let user;
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 404) {
      return Response.json({ verified: false, error: `GitHub user "${username}" doesn't exist.` });
    }
    if (!res.ok) {
      return Response.json({ verified: false, error: "Couldn't reach GitHub right now. Try again shortly." }, { status: 502 });
    }
    user = await res.json();
  } catch {
    return Response.json({ verified: false, error: "Couldn't reach GitHub right now. Try again shortly." }, { status: 502 });
  }

  if (!String(user.bio || "").includes(code)) {
    return Response.json({
      verified: false,
      error: `We couldn't find ${code} in the bio of github.com/${user.login}. Save your bio on GitHub, then check again.`,
    });
  }
  const ageDays = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
  if (ageDays < MIN_ACCOUNT_AGE_DAYS) {
    return Response.json({
      verified: false,
      error: `This GitHub account is less than ${MIN_ACCOUNT_AGE_DAYS} days old. Ask an admin to review your account instead.`,
    });
  }

  return Response.json({
    verified: true,
    github: {
      login: user.login,
      url: user.html_url,
      publicRepos: user.public_repos,
      createdAt: user.created_at,
    },
  });
}
