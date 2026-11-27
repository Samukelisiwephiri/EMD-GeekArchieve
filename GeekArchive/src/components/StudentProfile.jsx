"use client";

import React from "react";
import {
  Briefcase,
  Clock,
  ExternalLink,
  Github,
  GraduationCap,
  MapPin,
  MessageSquare,
  PlayCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { parseGitHubRepo } from "../lib/media";
import { hasDemoVideo } from "../lib/demoVideos";

const initialsOf = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "?";

const CONTACT_STATUS = {
  new: { text: "Message sent", className: "bg-[#FBF5E6] text-[#6B5320]" },
  interested: { text: "Interested", className: "bg-[#EEF4EE] text-[#2F472F]" },
  declined: { text: "Declined", className: "bg-[#F5F1EC] text-[#6E5A4F]" },
};

/**
 * A student's public profile as SMMEs/NGOs see it: pod role, skills, experience,
 * portfolio and every project they posted. Contact details are never shown here.
 */
export default function StudentProfile({ name, profile, projects, onOpenProject, contactStatusFor }) {
  const portfolio = profile?.portfolio && /^https?:\/\//i.test(profile.portfolio) ? profile.portfolio : null;
  const portfolioIsGitHub = portfolio && /github\.com/i.test(portfolio);
  const facts = profile
    ? [
        profile.availability && { icon: Clock, label: "Availability", value: profile.availability },
        profile.experienceLevel && { icon: GraduationCap, label: "Experience", value: profile.experienceLevel },
        profile.location && { icon: MapPin, label: "Location", value: profile.location },
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-[#163126] to-[#28503C] p-5 text-white sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#C8DD9F] text-xl font-black text-[#163126]"
        >
          {initialsOf(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{name}</p>
          <p className="mt-0.5 text-sm text-[#C8DD9F]">
            {profile ? profile.role : "Student / developer"}
          </p>
          <p className="mt-1 text-xs text-[#D5DED2]">
            {projects.length} project{projects.length === 1 ? "" : "s"} on Geek Archive
          </p>
        </div>
        {portfolio && (
          <a
            href={portfolio}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/25 hover:bg-white/20"
          >
            {portfolioIsGitHub ? <Github className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            {portfolioIsGitHub ? "GitHub profile" : "Portfolio"}
          </a>
        )}
      </div>

      {!profile ? (
        <p className="rounded-xl border border-dashed border-[#C8D4C7] bg-[#FAF8F5] px-4 py-3 text-sm text-[#6E5A4F]">
          {name.split(" ")[0]} hasn&apos;t completed a talent profile yet. You can still look at their projects below.
        </p>
      ) : (
        <>
          {facts.length > 0 && (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] px-3.5 py-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#5E7A5E]">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#2C1A10]">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">
              <Sparkles className="h-3.5 w-3.5" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span key={skill} className="rounded-lg bg-[#EEF4EE] px-3 py-1 text-sm font-medium text-[#2F472F]">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {(profile.preferredFocus || profile.strengthArea) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile.preferredFocus && (
                <div className="rounded-xl border border-[#E6DFD5] px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#5E7A5E]">
                    <Target className="h-3.5 w-3.5" />
                    Wants to work on
                  </p>
                  <p className="mt-1 text-sm text-[#2C1A10]">{profile.preferredFocus}</p>
                </div>
              )}
              {profile.strengthArea && (
                <div className="rounded-xl border border-[#E6DFD5] px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#5E7A5E]">
                    <Briefcase className="h-3.5 w-3.5" />
                    Strongest at
                  </p>
                  <p className="mt-1 text-sm text-[#2C1A10]">{profile.strengthArea}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5E7A5E]">
          Projects by {name.split(" ")[0]}
        </h3>
        {projects.length === 0 ? (
          <p className="text-sm text-[#6E5A4F]">No projects posted yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {projects.map((project) => {
              const status = contactStatusFor?.(project.id);
              const hasVideo = hasDemoVideo(project);
              const repo = parseGitHubRepo(project.repo);
              return (
                <li key={project.id} className="rounded-xl border border-[#E6DFD5] p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id)}
                        className="text-left text-sm font-bold text-[#2C1A10] hover:text-[#3F5D3F] hover:underline"
                      >
                        {project.title}
                      </button>
                      {project.summary && <p className="mt-0.5 text-xs text-[#5C493E]">{project.summary}</p>}
                    </div>
                    {status && CONTACT_STATUS[status] && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CONTACT_STATUS[status].className}`}>
                        {CONTACT_STATUS[status].text}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {project.stack.slice(0, 5).map((tech) => (
                      <span key={tech} className="rounded-md bg-[#EEF4EE] px-2 py-0.5 text-[11px] font-medium text-[#3F5D3F]">
                        {tech}
                      </span>
                    ))}
                    {hasVideo && (
                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3F5D3F] hover:underline"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Play demo
                      </button>
                    )}
                    {repo && (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3F5D3F] hover:underline"
                      >
                        <Github className="h-3.5 w-3.5" />
                        GitHub
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-1.5 text-[11px] text-[#8A786D]">
        <MessageSquare className="mt-px h-3.5 w-3.5 shrink-0" />
        Students&apos; contact details are private. Use &quot;Contact&quot; on a project to send them a message.
      </p>
    </div>
  );
}
