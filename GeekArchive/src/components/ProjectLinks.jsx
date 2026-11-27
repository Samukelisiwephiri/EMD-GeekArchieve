"use client";

import React, { useEffect, useState } from "react";
import { Github, PlayCircle, ExternalLink } from "lucide-react";
import Modal from "./Modal";
import { parseGitHubRepo, toVideoEmbed, videoThumbnail } from "../lib/media";
import { hasDemoVideo, resolveDemoVideo } from "../lib/demoVideos";

/**
 * The demo video player: an uploaded file (played through a short-lived link) or a
 * YouTube/Vimeo/Loom/mp4 link. Autoplays when opened by a click (browsers allow it then).
 */
export function VideoPlayer({ project, autoplay = true }) {
  const [video, setVideo] = useState(() => (project.demoVideoPath ? undefined : toVideoEmbed(project.demoVideo, { autoplay })));
  useEffect(() => {
    let alive = true;
    if (!project.demoVideoPath) {
      setVideo(toVideoEmbed(project.demoVideo, { autoplay }));
      return undefined;
    }
    setVideo(undefined);
    resolveDemoVideo(project, { autoplay })
      .then((resolved) => alive && setVideo(resolved))
      .catch(() => alive && setVideo(null));
    return () => {
      alive = false;
    };
  }, [project.demoVideoPath, project.demoVideo, autoplay]); // eslint-disable-line react-hooks/exhaustive-deps

  if (video === undefined) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black text-xs text-white/70" role="status">
        Loading video…
      </div>
    );
  }
  if (!video) {
    return project.demoVideoPath ? (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black px-6 text-center text-xs text-white/80" role="alert">
        This video can&apos;t be played right now. Please try again later.
      </div>
    ) : null;
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      {video.kind === "iframe" ? (
        <iframe
          src={video.src}
          title={`${project.title} demo video`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={video.src}
          controls
          autoPlay={autoplay}
          playsInline
          preload="metadata"
          className="h-full w-full"
          title={`${project.title} demo video`}
        />
      )}
    </div>
  );
}

/**
 * Big clickable preview for a project card. Clicking it calls onOpen (which opens
 * the project with the video playing).
 */
export function VideoPreview({ project, onOpen }) {
  if (!hasDemoVideo(project)) return null;
  const provider = project.demoVideoPath ? "Uploaded video" : toVideoEmbed(project.demoVideo).provider;
  const thumb = project.demoVideoPath ? null : videoThumbnail(project.demoVideo);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play demo of ${project.title}`}
      className="group relative mb-4 block aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#163126] via-[#1F4434] to-[#3B5E48] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C8DD9F]"
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#C8DD9F] text-[#163126] shadow-lg transition group-hover:scale-110">
        <PlayCircle className="h-8 w-8" />
      </span>
      <span className="absolute bottom-2.5 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
        ▶ Demo · {provider}
      </span>
    </button>
  );
}

/**
 * "Watch demo" + "GitHub repo" buttons for a project.
 * If onOpen is given, "Watch demo" opens the full project view (which autoplays);
 * otherwise it opens a small player of its own.
 */
export default function ProjectLinks({ project, compact = false, onOpen }) {
  const [playing, setPlaying] = useState(false);
  const video = hasDemoVideo(project) && {
    provider: project.demoVideoPath ? "Uploaded video" : toVideoEmbed(project.demoVideo).provider,
  };
  const repo = parseGitHubRepo(project.repo);
  const otherLink = !repo && /^https?:\/\//i.test(project.repo || "") ? project.repo : null;
  if (!video && !repo && !otherLink) return null;

  const base = compact
    ? "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
    : "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {video && (
          <button
            type="button"
            onClick={() => (onOpen ? onOpen() : setPlaying(true))}
            aria-label={`Watch demo of ${project.title}`}
            className={`${base} bg-[#C8DD9F] text-[#163126] hover:bg-[#B9D28A]`}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Watch demo
          </button>
        )}
        {repo && (
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open ${project.title} on GitHub (${repo.owner}/${repo.repo})`}
            className={`${base} border border-[#D8CFC4] bg-white text-[#163126] hover:bg-[#FAF8F5]`}
          >
            <Github className="h-3.5 w-3.5" />
            GitHub repo
          </a>
        )}
        {otherLink && (
          <a
            href={otherLink}
            target="_blank"
            rel="noreferrer noopener"
            className={`${base} border border-[#D8CFC4] bg-white text-[#163126] hover:bg-[#FAF8F5]`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View project
          </a>
        )}
      </div>

      {!onOpen && (
        <Modal
          open={playing}
          onClose={() => setPlaying(false)}
          title={`${project.title} — demo`}
          subtitle={[project.ownerName && `By ${project.ownerName}`, video?.provider].filter(Boolean).join(" · ")}
          size="xl"
        >
          <VideoPlayer project={project} />
        </Modal>
      )}
    </>
  );
}
