// Uploaded demo videos. With Supabase they live in the private "demo-videos" bucket
// (see supabase/schema.sql) and are played through short-lived signed URLs; in local
// demo mode the file stays in the browser (a blob: URL) and is lost on reload.
import { supabase } from "./supabase";
import { toVideoEmbed } from "./media";

export const DEMO_VIDEO_BUCKET = "demo-videos";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // Supabase free-tier per-file limit
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const VIDEO_ACCEPT = ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime";
const SIGNED_URL_SECONDS = 60 * 60;

/** Returns an error message, or "" if the file can be uploaded. */
export function checkVideoFile(file) {
  if (!file) return "Choose a video file.";
  const type = file.type || (/\.mov$/i.test(file.name) ? "video/quicktime" : "");
  if (!VIDEO_TYPES.includes(type)) return "Use an MP4, WebM or MOV video.";
  if (file.size > MAX_VIDEO_BYTES) {
    return `That video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is 50 MB — try a shorter clip or lower resolution.`;
  }
  if (file.size === 0) return "That file is empty.";
  return "";
}

/**
 * Uploads a demo video for the signed-in student.
 * @returns {Promise<string>} the stored path (Supabase) or a blob: URL (demo mode)
 */
export async function uploadDemoVideo(file, userId) {
  const problem = checkVideoFile(file);
  if (problem) throw new Error(problem);
  if (!supabase) return URL.createObjectURL(file);
  const ext = (file.name.match(/\.(mp4|webm|mov)$/i)?.[1] || "mp4").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(DEMO_VIDEO_BUCKET).upload(path, file, {
    contentType: file.type || "video/quicktime",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload failed. Please try again.");
  return path;
}

/** Deletes an uploaded video (best effort; ignores links and missing files). */
export async function removeDemoVideo(pathOrBlob) {
  if (!pathOrBlob) return;
  if (pathOrBlob.startsWith("blob:")) {
    URL.revokeObjectURL(pathOrBlob);
    return;
  }
  if (supabase) await supabase.storage.from(DEMO_VIDEO_BUCKET).remove([pathOrBlob]).catch(() => {});
}

/** Deletes every video in the user's folder (used when they delete their account). */
export async function removeAllDemoVideos(userId) {
  if (!supabase || !userId) return;
  const { data } = await supabase.storage.from(DEMO_VIDEO_BUCKET).list(userId, { limit: 1000 });
  const paths = (data || []).map((item) => `${userId}/${item.name}`);
  if (paths.length) await supabase.storage.from(DEMO_VIDEO_BUCKET).remove(paths);
}

/** True when a project has a playable demo (uploaded or a supported link). */
export const hasDemoVideo = (project) => Boolean(project?.demoVideoPath || toVideoEmbed(project?.demoVideo));

/**
 * Resolves what to play for a project: an uploaded file (signed URL) or an embed link.
 * @returns {Promise<{kind: "file"|"iframe", src: string, provider: string} | null>}
 */
export async function resolveDemoVideo(project, { autoplay = false } = {}) {
  if (project?.demoVideoPath) {
    if (project.demoVideoPath.startsWith("blob:") || !supabase) {
      return { kind: "file", src: project.demoVideoPath, provider: "Uploaded video" };
    }
    const { data, error } = await supabase.storage
      .from(DEMO_VIDEO_BUCKET)
      .createSignedUrl(project.demoVideoPath, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return { kind: "file", src: data.signedUrl, provider: "Uploaded video" };
  }
  return toVideoEmbed(project?.demoVideo, { autoplay });
}
