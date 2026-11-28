"use client";

// The SMME/NGO "Discover" experience, styled like a streaming service: a featured
// billboard whose demo plays quietly in the background, rows of project tiles that
// grow and start a muted preview when you rest on them, and a cinematic detail view.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info, Play, Volume2, VolumeX, X, Film } from "lucide-react";
import { toVideoEmbed, videoThumbnail } from "../lib/media";
import { signDemoVideos } from "../lib/demoVideos";
import { CATEGORY_BY_ID, categoryLabel } from "../lib/categories";
import { useDialog } from "./Modal";
import { VideoPlayer } from "./ProjectLinks";

const HOVER_DELAY_MS = 380; // rest on a tile this long before its preview starts
const PREVIEWS_KEY = "geekarchive:previews";

// ---------------------------------------------------------------------------------------
// Video sources

/**
 * What each project can play, for tiles and the billboard. Uploaded videos are signed in
 * one batch request; links (YouTube, Vimeo, Loom, mp4) need no request.
 * Returns sourceFor(project) -> { kind, src, thumb?, provider } | { loading } | null.
 */
export function useVideoSources(projects) {
  const [signed, setSigned] = useState({});
  const key = [...new Set(projects.map((p) => p.demoVideoPath).filter(Boolean))].sort().join("\n");

  useEffect(() => {
    const missing = key ? key.split("\n").filter((path) => !(path in signed)) : [];
    if (!missing.length) return undefined;
    let alive = true;
    const settle = (map) =>
      alive && setSigned((current) => ({ ...current, ...Object.fromEntries(missing.map((p) => [p, map[p] || null])) }));
    signDemoVideos(missing).then(settle, () => settle({}));
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return useCallback(
    (project) => {
      if (!project) return null;
      if (project.demoVideoPath) {
        const src = signed[project.demoVideoPath];
        if (src === undefined) return { loading: true };
        return src ? { kind: "file", src, provider: "Uploaded video" } : null;
      }
      const embed = toVideoEmbed(project.demoVideo);
      return embed ? { ...embed, thumb: videoThumbnail(project.demoVideo) } : null;
    },
    [signed]
  );
}

/** A quiet, looping, control-free version of an embedded player, for previews. */
function previewIframeSrc(source, muted = true) {
  const url = new URL(source.src);
  url.searchParams.set("autoplay", "1");
  if (source.provider === "YouTube") {
    const id = url.pathname.split("/").pop();
    url.searchParams.set("mute", muted ? "1" : "0");
    url.searchParams.set("controls", "0");
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", id);
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("disablekb", "1");
    url.searchParams.set("iv_load_policy", "3");
  } else if (source.provider === "Vimeo") {
    url.searchParams.set("muted", muted ? "1" : "0");
    url.searchParams.set("loop", "1");
    url.searchParams.set("controls", "0");
    url.searchParams.set("title", "0");
    url.searchParams.set("byline", "0");
    url.searchParams.set("portrait", "0");
  } else if (source.provider === "Loom") {
    url.searchParams.set("muted", muted ? "1" : "0");
    url.searchParams.set("hide_owner", "true");
    url.searchParams.set("hide_share", "true");
    url.searchParams.set("hide_title", "true");
    url.searchParams.set("hideEmbedTopBar", "true");
  }
  return url.toString();
}

/** Whether previews may autoplay: off for reduced motion and data saver, and the viewer can switch them. */
export function usePreviewSetting() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    let initial = true;
    try {
      const saved = window.localStorage.getItem(PREVIEWS_KEY);
      if (saved === "off") initial = false;
      else if (saved !== "on") {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const saveData = navigator.connection?.saveData;
        initial = !reduce && !saveData;
      }
    } catch {
      // storage unavailable (private mode): keep the default
    }
    setOn(initial);
  }, []);
  const set = (value) => {
    setOn(value);
    try {
      window.localStorage.setItem(PREVIEWS_KEY, value ? "on" : "off");
    } catch {
      // ignore
    }
  };
  return [on, set];
}

// ---------------------------------------------------------------------------------------
// Media

/** A poster for projects without a still image: the brand gradient and the title. */
function TitlePoster({ project, large = false }) {
  const category = CATEGORY_BY_ID[project.category];
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,#2F5A43_0%,#163126_45%,#0C1410_100%)]">
      <div className="absolute inset-0 opacity-[0.18] [background-image:repeating-linear-gradient(135deg,#C8DD9F_0_1px,transparent_1px_14px)]" />
      <div className={`absolute inset-x-0 bottom-0 ${large ? "p-8" : "p-3"}`}>
        {category && !large && (
          <span aria-hidden="true" className="text-lg">
            {category.emoji}
          </span>
        )}
        {!large && <p className="line-clamp-2 text-sm font-black leading-tight text-[#E9F2D9]">{project.title}</p>}
      </div>
    </div>
  );
}

/**
 * The picture for a tile or the billboard: a still (or the video's first frame) that
 * turns into a muted, looping preview while `active`, fading in once it really plays.
 */
function PreviewMedia({ project, source, active, muted = true, large = false }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const file = source?.kind === "file" && source.src;
  const iframe = source?.kind === "iframe";

  // Uploaded files: one <video> shows the first frame, then plays in place.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !file) return;
    if (active) {
      v.muted = muted;
      const attempt = v.play();
      if (attempt?.catch) attempt.catch(() => {});
    } else {
      v.pause();
    }
  }, [active, file, muted]);

  useEffect(() => {
    if (!active) setReady(false);
  }, [active]);

  const still = source?.thumb;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0C1410]" style={{ containerType: "size" }}>
      {file ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          src={`${source.src}#t=0.5`}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={still}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            active && ready ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : (
        <TitlePoster project={project} large={large} />
      )}
      {iframe && active && (
        <iframe
          src={previewIframeSrc(source, muted)}
          title={`${project.title} preview`}
          aria-hidden="true"
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => window.setTimeout(() => setReady(true), 650)}
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0 transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          // Cover the frame like object-fit: cover (16:9 player, any box).
          style={{ width: "max(100%, calc(100cqh * 16 / 9))", height: "max(100%, calc(100cqw * 9 / 16))" }}
        />
      )}
      {source?.loading && <div className="absolute inset-0 animate-pulse bg-white/5" />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Billboard

export function Billboard({ project, source, previews, paused, ownerLine, onOpen }) {
  const boxRef = useRef(null);
  const [inView, setInView] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio > 0.35), {
      threshold: [0, 0.35, 0.6],
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const playing = previews && inView && !paused && Boolean(source && !source.loading);
  const category = CATEGORY_BY_ID[project.category];
  return (
    <section
      ref={boxRef}
      aria-label={`Featured project: ${project.title}`}
      className="relative isolate min-h-[440px] w-full overflow-hidden sm:aspect-[21/9] sm:min-h-[380px]"
    >
      <PreviewMedia project={project} source={source} active={playing} muted={muted} large />
      {/* Fades that keep the text readable and blend into the rows below. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0C1410] via-[#0C1410]/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0C1410] via-[#0C1410]/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 sm:max-w-2xl sm:px-8 sm:pb-12">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8DD9F]">
          <Film className="h-3.5 w-3.5" />
          Featured project
          {category && (
            <span className="tracking-normal text-white/70 normal-case">
              · {category.emoji} {category.label}
            </span>
          )}
        </p>
        <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-tight text-white drop-shadow sm:text-6xl">
          {project.title}
        </h2>
        {ownerLine && <p className="mt-3 text-sm font-medium text-white/80">{ownerLine}</p>}
        {project.summary && (
          <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">{project.summary}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Play demo of ${project.title}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#0C1410] shadow-lg hover:bg-white/85"
          >
            <Play className="h-4 w-4 fill-current" />
            Play demo
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`More info about ${project.title}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-5 py-2.5 text-sm font-bold text-white backdrop-blur hover:bg-white/30"
          >
            <Info className="h-4 w-4" />
            More info
          </button>
        </div>
      </div>

      {source?.kind === "file" && previews && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Turn the featured video's sound on" : "Mute the featured video"}
          aria-pressed={!muted}
          className="absolute bottom-8 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-black/30 text-white backdrop-blur hover:bg-black/50 sm:bottom-12 sm:right-8"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Tiles and rows

export function ProjectTile({ project, source, previews, meta, onOpen, wide = false }) {
  const [active, setActive] = useState(false);
  const timer = useRef(null);
  const start = () => {
    window.clearTimeout(timer.current);
    if (previews) timer.current = window.setTimeout(() => setActive(true), HOVER_DELAY_MS);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    setActive(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!previews) setActive(false);
  }, [previews]);

  return (
    <article
      aria-label={`Project: ${project.title}`}
      role="listitem"
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
      className={`group/tile relative shrink-0 snap-start ${wide ? "w-full" : "w-[74vw] sm:w-[290px]"}`}
    >
      <div
        className={`relative origin-center transform-gpu rounded-xl bg-[#16211B] shadow-none ring-1 ring-white/5 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform ${
          active ? "z-10 scale-[1.06] shadow-[0_22px_50px_rgba(0,0,0,0.6)] ring-white/15" : "group-hover/tile:scale-[1.02]"
        } motion-reduce:transform-none`}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Play demo of ${project.title}`}
          className="relative block aspect-video w-full overflow-hidden rounded-t-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C8DD9F]"
        >
          <PreviewMedia project={project} source={source} active={active} />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
          <span
            className={`pointer-events-none absolute bottom-2.5 left-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0C1410] shadow-lg transition duration-300 ${
              active ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover/tile:scale-100 group-hover/tile:opacity-100"
            }`}
          >
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
          {source?.provider && (
            <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
              {source.provider === "Uploaded video" ? "Demo" : source.provider}
            </span>
          )}
        </button>
        <div className="rounded-b-xl px-3 pb-3 pt-2.5">
          <h3 className="truncate text-sm font-bold text-white">
            <button
              type="button"
              onClick={onOpen}
              className="max-w-full truncate text-left hover:text-[#C8DD9F] focus:outline-none focus-visible:underline"
            >
              {project.title}
            </button>
          </h3>
          {meta && <p className="mt-0.5 truncate text-xs text-white/60">{meta}</p>}
          <div className="mt-2 flex h-5 flex-wrap gap-1 overflow-hidden">
            {(project.stack || []).slice(0, 3).map((tech) => (
              <span key={tech} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectRow({ title, projects, sourceFor, previews, metaFor, onOpen }) {
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, projects.length]);
  const page = (dir) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section aria-label={title} className="group/row relative">
      <h3 className="px-5 text-base font-bold text-white sm:px-8">
        {title} <span className="ml-1 text-xs font-medium text-white/45">{projects.length}</span>
      </h3>
      <div className="relative">
        <div
          ref={scroller}
          role="list"
          onScroll={update}
          className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 py-5 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {projects.map((p) => (
            <ProjectTile
              key={p.id}
              project={p}
              source={sourceFor(p)}
              previews={previews}
              meta={metaFor(p)}
              onOpen={() => onOpen(p.id)}
            />
          ))}
        </div>
        {edges.left && (
          <button
            type="button"
            onClick={() => page(-1)}
            aria-label={`Scroll ${title} back`}
            className="absolute inset-y-5 left-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-r from-[#0C1410] to-transparent text-white opacity-0 transition-opacity duration-300 hover:text-[#C8DD9F] focus:opacity-100 group-hover/row:opacity-100 sm:flex"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        {edges.right && (
          <button
            type="button"
            onClick={() => page(1)}
            aria-label={`Scroll ${title} forward`}
            className="absolute inset-y-5 right-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-l from-[#0C1410] to-transparent text-white opacity-0 transition-opacity duration-300 hover:text-[#C8DD9F] focus:opacity-100 group-hover/row:opacity-100 sm:flex"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
    </section>
  );
}

/** Rows like a streaming home page: newest first, then one row per category. */
export function rowsFor(projects) {
  const newest = [...projects].sort((a, b) => String(b.postedAt || "").localeCompare(String(a.postedAt || "")));
  const rows = [{ title: "New on Geek Archive", projects: newest.slice(0, 15) }];
  const byCategory = new Map();
  for (const p of newest) {
    const id = p.category || "other";
    if (!byCategory.has(id)) byCategory.set(id, []);
    byCategory.get(id).push(p);
  }
  // One category would only repeat the "New" row.
  if (byCategory.size < 2) return rows;
  for (const [id, list] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const c = CATEGORY_BY_ID[id];
    rows.push({ title: c ? `${c.emoji} ${c.label}` : categoryLabel(id) || "More projects", projects: list });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------
// Detail view

/**
 * The cinematic project view: the demo plays at the top, then the title, who made it,
 * the description and what it's built with. `actions` go under the title; `children`
 * (contact form, AI analysis) at the end.
 */
export function ProjectDetail({ project, onClose, ownerLine, actions, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const [shown, setShown] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useDialog(true, requestClose, panelRef, closeRef);

  const category = CATEGORY_BY_ID[project.category];
  const facts = [
    category && `${category.emoji} ${category.label}`,
    !category && project.domain,
    project.postedAt && new Date(project.postedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
    project.completion != null && `${project.completion}% ready`,
  ].filter(Boolean);
  const hasVideo = Boolean(project.demoVideoPath || toVideoEmbed(project.demoVideo));

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className="flex min-h-full items-start justify-center sm:px-4 sm:py-10"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={project.title}
          className={`relative w-full max-w-4xl overflow-hidden bg-[#121A15] text-white shadow-[0_40px_120px_rgba(0,0,0,0.7)] transition duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:rounded-2xl ${
            shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[0.96] opacity-0"
          }`}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#121A15]/85 text-white ring-1 ring-white/20 backdrop-blur hover:bg-black"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative bg-black">
            {hasVideo ? (
              <VideoPlayer key={project.id} project={project} autoplay rounded={false} />
            ) : (
              <div className="relative aspect-video w-full">
                <TitlePoster project={project} large />
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">
                  No demo video yet. You can ask for one when you get in touch.
                </p>
              </div>
            )}
          </div>
          <div className="pointer-events-none h-10 bg-gradient-to-b from-black to-[#121A15]" />

          <div className="px-5 pb-8 sm:px-8">
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{project.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              {ownerLine && <span className="font-semibold text-[#C8DD9F]">{ownerLine}</span>}
              {facts.map((f) => (
                <span key={f} className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-white/30">
                    •
                  </span>
                  {f}
                </span>
              ))}
            </div>
            {actions && <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div>}

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div>
                {project.summary && <p className="text-base font-semibold leading-relaxed text-white">{project.summary}</p>}
                {project.description && project.description !== project.summary && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">{project.description}</p>
                )}
                {!project.summary && !project.description && (
                  <p className="text-sm text-white/60">No description yet.</p>
                )}
              </div>
              <dl className="space-y-3 text-sm">
                {project.stack?.length > 0 && (
                  <div>
                    <dt className="text-xs text-white/45">Built with</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {project.stack.map((tech) => (
                        <span key={tech} className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90">
                          {tech}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {(category || project.domain) && (
                  <div>
                    <dt className="text-xs text-white/45">Category</dt>
                    <dd className="mt-0.5 text-white/90">{category ? category.label : project.domain}</dd>
                  </div>
                )}
                {project.missing?.length > 0 && (
                  <div>
                    <dt className="text-xs text-white/45">Still to do</dt>
                    <dd className="mt-0.5 text-white/90">{project.missing.join(" · ")}</dd>
                  </div>
                )}
              </dl>
            </div>

            {children && <div className="mt-7 space-y-4">{children}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
