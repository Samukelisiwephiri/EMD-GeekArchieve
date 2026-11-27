// Helpers for project links: GitHub repositories and demo videos.

const GITHUB_REPO_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:\/[^?#]*)?(?:[?#].*)?$/i;

/**
 * "https://github.com/owner/repo" (also .../tree/main, .../blob/x, .git) ->
 * { owner, repo, url } pointing at the repository, or null if it isn't one.
 */
export function parseGitHubRepo(value) {
  const match = String(value || "").trim().match(GITHUB_REPO_RE);
  if (!match) return null;
  const [, owner, repo] = match;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

/**
 * Turns a demo video link into something the app can play.
 * Supported: YouTube (watch, youtu.be, shorts, embed), Vimeo, Loom, and direct
 * .mp4/.webm/.ogg files. YouTube uses the privacy-enhanced (no-cookie) player.
 * Returns { kind: "iframe" | "file", src, provider } or null if unsupported.
 */
export function toVideoEmbed(value, { autoplay = false } = {}) {
  const embed = baseEmbed(value);
  if (!embed || !autoplay) return embed;
  if (embed.kind === "file") return { ...embed, autoplay: true };
  const url = new URL(embed.src);
  url.searchParams.set("autoplay", "1");
  return { ...embed, src: url.toString(), autoplay: true };
}

/** Still image for a video, when the provider offers one without an API call (YouTube). */
export function videoThumbnail(value) {
  const embed = baseEmbed(value);
  if (embed?.provider !== "YouTube") return null;
  const id = embed.src.split("/embed/")[1]?.split("?")[0];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function baseEmbed(value) {
  const raw = String(value || "").trim();
  if (!/^https:\/\//i.test(raw)) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return youtube(id);
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") return youtube(url.searchParams.get("v"));
    const [, kind, id] = url.pathname.split("/");
    if (["shorts", "embed", "live"].includes(kind)) return youtube(id);
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").find((part) => /^\d+$/.test(part));
    return id ? { kind: "iframe", provider: "Vimeo", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (host === "loom.com") {
    const [, kind, id] = url.pathname.split("/");
    return ["share", "embed"].includes(kind) && /^[a-f0-9]{16,64}$/i.test(id || "")
      ? { kind: "iframe", provider: "Loom", src: `https://www.loom.com/embed/${id}` }
      : null;
  }
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    return { kind: "file", provider: "Video file", src: url.toString() };
  }
  return null;
}

function youtube(id) {
  return /^[A-Za-z0-9_-]{6,20}$/.test(id || "")
    ? { kind: "iframe", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
    : null;
}

export const SUPPORTED_VIDEO_HINT = "YouTube, Vimeo, Loom, or a direct .mp4 / .webm link";
