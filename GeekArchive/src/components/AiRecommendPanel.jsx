"use client";

import React, { useState } from "react";
import { Clock, Loader2, Sparkles, Wand2 } from "lucide-react";
import { categoryLabel } from "../lib/categories";

/**
 * "Tell us what you need" → the AI reads the GitHub files of the most relevant
 * student projects and recommends the best ones, with reasons.
 */
export default function AiRecommendPanel({ projects, orgType, defaultNeed = "", onOpenProject }) {
  const [need, setNeed] = useState(defaultNeed);
  const [state, setState] = useState({ status: "idle" });
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));

  const run = async (e) => {
    e.preventDefault();
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/recommend-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Project details only — never students' names or contact details.
        body: JSON.stringify({
          need,
          orgType,
          projects: projects.map((p) => ({
            id: p.id,
            title: p.title,
            summary: p.summary,
            description: p.description,
            category: p.category,
            stack: p.stack,
            repo: p.repo,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't get recommendations.");
      setState({ status: "done", data });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  };

  return (
    <section aria-label="AI project recommendations" className="overflow-hidden rounded-2xl border border-[#C8DD9F] bg-gradient-to-br from-[#163126] via-[#1D3E2F] to-[#28503C] p-5 text-white">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Wand2 className="h-5 w-5 text-[#C8DD9F]" />
        Let AI find the best project for you
      </h2>
      <p className="mt-1 text-xs text-[#D5DED2]">
        Describe your challenge. The AI reads the code and README of the most relevant student projects on GitHub and
        recommends the best starting points.
      </p>
      <form onSubmit={run} className="mt-3 flex flex-col gap-2 md:flex-row">
        <label htmlFor="ai-need" className="sr-only">What do you need?</label>
        <textarea
          id="ai-need"
          rows={2}
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          placeholder="e.g. We need to stop fraud on our customers' accounts and track who logs in."
          className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-[#A9BBAA] focus:border-[#C8DD9F] focus:outline-none"
        />
        <button
          type="submit"
          disabled={need.trim().length < 10 || state.status === "loading"}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#C8DD9F] px-5 py-2.5 text-sm font-bold text-[#163126] hover:bg-[#D5E7B5] disabled:opacity-60"
        >
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Recommend projects
        </button>
      </form>

      {state.status === "loading" && (
        <p role="status" className="mt-3 text-xs text-[#D5DED2]">Reading projects on GitHub and comparing them with your need… this can take up to a minute.</p>
      )}
      {state.status === "error" && (
        <p role="alert" className="mt-3 rounded-lg bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">{state.message}</p>
      )}

      {state.status === "done" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${state.data.source === "ai" ? "bg-[#C8DD9F] text-[#163126]" : "bg-[#F2E3BF] text-[#6B5320]"}`}>
              {state.data.source === "ai" ? "AI recommendation · Claude" : "Keyword match (not AI)"}
            </span>
            {state.data.note && <span className="text-[11px] text-[#F2E3BF]">{state.data.note}</span>}
          </div>
          <p className="text-sm leading-relaxed text-[#E7EEE2]">{state.data.overview}</p>
          {state.data.recommendations.length > 0 && (
            <ol className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {state.data.recommendations.map((r, i) => {
                const project = byId[r.projectId];
                if (!project) return null;
                return (
                  <li key={r.projectId} className="flex flex-col rounded-xl bg-white p-4 text-[#2C1A10]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-[#163126] px-2 py-0.5 text-[11px] font-bold text-[#C8DD9F]">#{i + 1}</span>
                      <span className="text-xs font-bold text-[#2F5A2F]">{r.fitScore}% fit</span>
                    </div>
                    <button type="button" onClick={() => onOpenProject(project.id)} className="mt-2 text-left text-base font-bold hover:text-[#3F5D3F] hover:underline">
                      {project.title}
                    </button>
                    <p className="text-[11px] text-[#6E5A4F]">{[categoryLabel(project.category), project.ownerName].filter(Boolean).join(" · ")}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF4EE]" role="progressbar" aria-label={`${project.title} fit`} aria-valuenow={r.fitScore} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-[#5E7A5E]" style={{ width: `${r.fitScore}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{r.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#5C493E]">{r.whyItFits}</p>
                    <p className="mt-2 text-xs text-[#3B2314]"><strong>What it would take:</strong> {r.whatItWouldTake}</p>
                    <p className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-[#6E5A4F]"><Clock className="h-3 w-3" />{r.estimatedWeeks}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
