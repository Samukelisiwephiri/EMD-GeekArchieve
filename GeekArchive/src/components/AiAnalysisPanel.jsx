"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Github,
  HelpCircle,
  Leaf,
  Loader2,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";

// Results survive closing and reopening the project window during a visit.
const results = new Map();
const keyFor = (p) => JSON.stringify([p.id, p.title, p.description, p.stack, p.repo, p.domain]);

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-[#E6DFD5] bg-white p-4">
      <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#3F5D3F]">
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * "Analyse this project" for SMMEs/NGOs: plain-language summary, skills used,
 * tools used, time to complete, remaining work, tools to sustain it, risks and
 * questions to ask the student.
 */
export default function AiAnalysisPanel({ project }) {
  const key = keyFor(project);
  const [state, setState] = useState(() => results.get(key) || { status: "idle" });

  const run = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only project details are sent — never the student's name or contact details.
        body: JSON.stringify({
          project: {
            title: project.title,
            summary: project.summary,
            description: project.description,
            domain: project.domain,
            stack: project.stack,
            repo: project.repo,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The analysis couldn't be completed.");
      const next = { status: "done", data };
      results.set(key, next);
      setState(next);
    } catch (err) {
      setState({ status: "error", message: err.message || "The analysis couldn't be completed." });
    }
  };

  if (state.status === "idle" || state.status === "error") {
    return (
      <div className="rounded-2xl border border-[#C8DD9F] bg-gradient-to-br from-[#F4F9EC] to-[#EEF4EE] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#163126]">
              <Sparkles className="h-4 w-4 text-[#5E7A5E]" />
              AI project analysis
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#3E4F46]">
              Reads the GitHub repo and explains, in plain language: the skills used, the tools used, how long it
              will take to finish, and which tools would keep it running long-term.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#163126] px-4 py-2.5 text-sm font-semibold text-[#C8DD9F] hover:bg-[#0F241B]"
          >
            <Sparkles className="h-4 w-4" />
            Analyse this project
          </button>
        </div>
        {state.status === "error" && (
          <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">
            {state.message}
          </p>
        )}
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-[#C8DD9F] bg-[#F4F9EC] p-5">
        <Loader2 className="h-5 w-5 animate-spin text-[#5E7A5E]" />
        <div>
          <p className="text-sm font-semibold text-[#163126]">Analysing {project.title}…</p>
          <p className="text-xs text-[#3E4F46]">Reading the repository and preparing a plain-language report. This can take up to a minute.</p>
        </div>
      </div>
    );
  }

  const { analysis: a, source, note, repo } = state.data;
  const pct = Math.min(100, Math.max(0, a.percentComplete));

  return (
    <div className="space-y-3" aria-label="AI project analysis">
      <div className="rounded-2xl bg-gradient-to-br from-[#163126] to-[#28503C] p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-[#C8DD9F]" />
            {source === "ai" ? "AI project analysis" : "Basic estimate"}
          </p>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              source === "ai" ? "bg-[#C8DD9F] text-[#163126]" : "bg-[#F2E3BF] text-[#6B5320]"
            }`}
          >
            {source === "ai" ? "Powered by Claude" : "Automatic, not AI-reviewed"}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#E7EEE2]">{a.plainSummary}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#D5DED2]">
            <span>{a.stage}</span>
            <span className="font-semibold text-white">~{pct}% complete</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Estimated completion">
            <div className="h-full rounded-full bg-[#C8DD9F]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {note && <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[11px] text-[#F2E3BF]">{note}</p>}
      </div>

      <Section icon={Clock} title="Time to complete">
        <p className="text-2xl font-bold text-[#163126]">
          {a.timeToComplete.minWeeks}–{a.timeToComplete.maxWeeks} weeks
        </p>
        <p className="mt-0.5 text-xs text-[#6E5A4F]">
          With {a.timeToComplete.team} · <span className="font-semibold">{a.timeToComplete.confidence} confidence</span>
        </p>
        <p className="mt-2 text-sm text-[#3B2314]">{a.timeToComplete.reasoning}</p>
        {a.remainingWork.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {a.remainingWork.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#3B2314]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8FA58F]" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section icon={Sparkles} title="Skills used">
          <ul className="space-y-2">
            {a.skillsUsed.map((s) => (
              <li key={s.skill}>
                <p className="text-sm font-semibold text-[#2C1A10]">{s.skill}</p>
                <p className="text-xs text-[#6E5A4F]">{s.evidence}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={Wrench} title="Tools used">
          <ul className="space-y-2">
            {a.toolsUsed.map((t) => (
              <li key={t.name}>
                <p className="text-sm font-semibold text-[#2C1A10]">{t.name}</p>
                <p className="text-xs text-[#6E5A4F]">{t.purpose}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section icon={Leaf} title="Tools to sustain it long-term">
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {a.sustainabilityTools.map((t) => (
            <li key={t.name} className="rounded-xl bg-[#F4F9EC] px-3.5 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[#163126]">{t.name}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#3F5D3F]">{t.cost}</span>
              </div>
              <p className="mt-1 text-xs text-[#3E4F46]">{t.why}</p>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section icon={AlertTriangle} title="Risks to know about">
          <ul className="list-disc space-y-1 pl-4 text-sm text-[#3B2314]">
            {a.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
        <Section icon={HelpCircle} title="Questions to ask the student">
          <ul className="list-disc space-y-1 pl-4 text-sm text-[#3B2314]">
            {a.questionsToAsk.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A786D]">
        <span className="inline-flex items-center gap-1">
          <Github className="h-3.5 w-3.5" />
          {repo?.available
            ? `Based on ${repo.fullName}${repo.languages?.length ? ` (${repo.languages.slice(0, 3).map((l) => l.name).join(", ")})` : ""}`
            : repo?.reason || "No GitHub repository was available"}
        </span>
        <button type="button" onClick={run} className="inline-flex items-center gap-1 font-semibold text-[#3F5D3F] hover:underline">
          <RefreshCw className="h-3 w-3" />
          Run again
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[#8A786D]">
        Estimates are a guide, not a quote — confirm details with the student. Only project details and public GitHub
        content are sent for analysis, never personal information.
      </p>
    </div>
  );
}
