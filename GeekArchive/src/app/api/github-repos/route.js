// GET /api/github-repos?username=thandi-dev
// Lists a person's public GitHub repositories so they can pick their best ones to
// show organisations. Only public data from api.github.com is read.
import { isGitHubUsername } from "../../../lib/verification";
import { suggestCategory } from "../../../lib/categories";
import { rateKey, requireUser } from "../../../lib/serverAuth";

export const runtime = "nodejs";

const hits = new Map();
function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 20;
}

export async function GET(request) {
  // Verified students/developers pick their repos; nobody else needs this.
  const auth = await requireUser(request, { requireVerified: true, roles: ["youth", "admin"] });
  if (!auth.ok) return auth.response;
  const username = new URL(request.url).searchParams.get("username")?.trim() || "";
  if (!isGitHubUsername(username)) {
    return Response.json({ error: "Enter a valid GitHub username." }, { status: 400 });
  }
  if (rateLimited(rateKey(request, auth))) {
    return Response.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "geek-archive-repo-picker",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let res;
  try {
    res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&per_page=100`,
      { headers, signal: AbortSignal.timeout(8000), cache: "no-store" }
    );
  } catch {
    return Response.json({ error: "Couldn't reach GitHub right now. Try again shortly." }, { status: 502 });
  }
  if (res.status === 404) return Response.json({ error: `GitHub user "${username}" doesn't exist.` }, { status: 404 });
  if (res.status === 403) return Response.json({ error: "GitHub's rate limit was reached. Try again later." }, { status: 429 });
  if (!res.ok) return Response.json({ error: "Couldn't read repositories from GitHub." }, { status: 502 });

  const list = await res.json();
  const repos = list
    .filter((repo) => !repo.private)
    .map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description || "",
      language: repo.language || "",
      topics: repo.topics || [],
      stars: repo.stargazers_count,
      fork: repo.fork,
      archived: repo.archived,
      pushedAt: repo.pushed_at,
      homepage: repo.homepage || "",
      suggestedCategory: suggestCategory(repo.topics || [], repo.description || "", repo.name, repo.language || ""),
    }));
  return Response.json({ username, repos });
}
