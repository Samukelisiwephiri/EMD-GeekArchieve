"use client";

import React, { useState } from "react";
import { CheckCircle2, Github, GitFork, Loader2, Star } from "lucide-react";
import { CATEGORIES } from "../lib/categories";

const MAX_PICKS = 6;

/**
 * Lets a student load their public GitHub repos and pick the ones they're most
 * confident in. Picked repos become projects shown to organisations.
 */
export default function GitHubImport({ defaultUsername = "", existingRepoUrls, onImport }) {
  const [username, setUsername] = useState(defaultUsername);
  const [state, setState] = useState({ status: "idle" });
  const [picked, setPicked] = useState({}); // fullName -> category id
  const [showForks, setShowForks] = useState(false);
  const [done, setDone] = useState("");

  const load = async (e) => {
    e?.preventDefault();
    setDone("");
    setPicked({});
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/github-repos?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load your repositories.");
      setState({ status: "loaded", repos: data.repos, username: data.username });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  };

  const toggle = (repo) =>
    setPicked((current) => {
      const next = { ...current };
      if (next[repo.fullName]) delete next[repo.fullName];
      else if (Object.keys(next).length < MAX_PICKS) next[repo.fullName] = repo.suggestedCategory;
      return next;
    });

  const importPicked = () => {
    const repos = state.repos.filter((r) => picked[r.fullName]).map((r) => ({ ...r, category: picked[r.fullName] }));
    onImport(repos);
    setDone(`${repos.length} project${repos.length === 1 ? "" : "s"} added. Edit them below to add a demo video and more detail.`);
    setPicked({});
  };

  const repos = state.status === "loaded" ? state.repos.filter((r) => showForks || !r.fork) : [];
  const pickedCount = Object.keys(picked).length;

  return (
    <section aria-label="Choose projects from GitHub" className="rounded-2xl border border-[#D8CFC4] bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[#2C1A10]">
        <Github className="h-5 w-5" />
        Pick your best work from GitHub
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[#6E5A4F]">
        Choose up to {MAX_PICKS} repositories you&apos;re most confident in. Only the projects you choose are shown to
        organisations — quality beats quantity.
      </p>

      <form onSubmit={load} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="gh-import-user" className="sr-only">GitHub username</label>
        <input
          id="gh-import-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your GitHub username"
          autoComplete="off"
          className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-3.5 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!username.trim() || state.status === "loading"}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#24292F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
          Load my repos
        </button>
      </form>

      {state.status === "error" && (
        <p role="alert" className="mt-3 rounded-lg border border-[#E7C3BC] bg-[#FBEDEA] px-3 py-2 text-xs text-[#8A2C1E]">{state.message}</p>
      )}
      {done && (
        <p role="status" className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#EEF7E8] px-3 py-2 text-xs font-medium text-[#2F5A2F]">
          <CheckCircle2 className="h-4 w-4" />
          {done}
        </p>
      )}

      {state.status === "loaded" && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E5A4F]">
            <span>
              {repos.length} public repo{repos.length === 1 ? "" : "s"} for @{state.username} · {pickedCount}/{MAX_PICKS} chosen
            </span>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={showForks} onChange={(e) => setShowForks(e.target.checked)} className="accent-[#5E7A5E]" />
              Show forks
            </label>
          </div>
          {repos.length === 0 ? (
            <p className="rounded-xl bg-[#FAF8F5] px-3.5 py-3 text-sm text-[#6E5A4F]">No public repositories to show.</p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {repos.map((repo) => {
                const already = existingRepoUrls.has(repo.url.toLowerCase());
                const isPicked = Boolean(picked[repo.fullName]);
                const full = !isPicked && pickedCount >= MAX_PICKS;
                return (
                  <li
                    key={repo.fullName}
                    className={`rounded-xl border p-3 transition ${
                      isPicked ? "border-[#5E7A5E] bg-[#F4F9EC] ring-1 ring-[#C8DD9F]" : "border-[#E6DFD5] bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Choose ${repo.name}`}
                        checked={isPicked}
                        disabled={already || full}
                        onChange={() => toggle(repo)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#5E7A5E]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-[#2C1A10]">
                          {repo.name}
                          {repo.fork && <span className="inline-flex items-center gap-0.5 text-[11px] font-normal text-[#8A786D]"><GitFork className="h-3 w-3" />fork</span>}
                          {already && <span className="rounded-full bg-[#EEF4EE] px-2 py-0.5 text-[10px] font-semibold text-[#2F472F]">Already added</span>}
                        </p>
                        {repo.description && <p className="mt-0.5 text-xs text-[#5C493E]">{repo.description}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-[#8A786D]">
                          {repo.language && <span>{repo.language}</span>}
                          <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" />{repo.stars}</span>
                          <span>Updated {new Date(repo.pushedAt).toLocaleDateString()}</span>
                        </p>
                        {isPicked && (
                          <label className="mt-2 flex items-center gap-2 text-xs text-[#3B2314]">
                            Category
                            <select
                              value={picked[repo.fullName]}
                              onChange={(e) => setPicked((current) => ({ ...current, [repo.fullName]: e.target.value }))}
                              className="rounded-lg border border-[#D8CFC4] bg-white px-2 py-1 text-xs"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            disabled={!pickedCount}
            onClick={importPicked}
            className="mt-3 w-full rounded-xl bg-[#5E7A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4C654C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pickedCount ? `Show ${pickedCount} chosen project${pickedCount === 1 ? "" : "s"} to organisations` : "Choose your best projects above"}
          </button>
        </div>
      )}
    </section>
  );
}
