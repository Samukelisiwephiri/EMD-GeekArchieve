"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { categoryLabel, CATEGORY_BY_ID } from "../lib/categories";

const MAX_SUGGESTIONS = 6;

function Highlight({ text, query }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-[#C8DD9F] px-0.5 text-[#163126]">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/** Where a project matches the query, best first: title start, title, category, skill, person, description. */
export function matchProject(project, q) {
  const query = q.trim().toLowerCase();
  if (!query) return { rank: 0, where: "" };
  const title = project.title.toLowerCase();
  if (title.startsWith(query)) return { rank: 1, where: "" };
  if (title.includes(query)) return { rank: 2, where: "" };
  const category = categoryLabel(project.category);
  if (category.toLowerCase().includes(query)) return { rank: 3, where: category };
  const skill = (project.stack || []).find((s) => s.toLowerCase().includes(query));
  if (skill) return { rank: 4, where: skill };
  if ((project.ownerName || "").toLowerCase().includes(query)) return { rank: 5, where: project.ownerName };
  if ([project.domain, project.summary, project.description].join(" ").toLowerCase().includes(query)) return { rank: 6, where: "description" };
  return null;
}

/**
 * Search box that shows matching projects as you type (like a search engine),
 * with keyboard support. Picking a suggestion calls onPick(project).
 */
export default function SearchSuggest({ value, onChange, projects, onPick, placeholder }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const blurTimer = useRef(null);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    return projects
      .map((project) => ({ project, match: matchProject(project, value) }))
      .filter((x) => x.match)
      .sort((a, b) => a.match.rank - b.match.rank || a.project.title.localeCompare(b.project.title))
      .slice(0, MAX_SUGGESTIONS);
  }, [projects, value]);

  const showList = open && value.trim().length > 0;

  const pick = (project) => {
    setOpen(false);
    setActive(-1);
    onPick(project);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && showList && active >= 0 && suggestions[active]) {
      e.preventDefault();
      pick(suggestions[active].project);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C8B80]" />
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Search projects"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm focus:border-[#5E7A5E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8DD9F]"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching projects"
          onMouseDown={() => clearTimeout(blurTimer.current)}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-[#D8CFC4] bg-white py-1.5 shadow-[0_18px_40px_rgba(22,49,38,0.18)]"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[#6E5A4F]">No projects match “{value.trim()}”</li>
          ) : (
            suggestions.map(({ project, match }, i) => (
              <li
                key={project.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(project)}
                className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i === active ? "bg-[#EEF4EE]" : ""}`}
              >
                <span className="mt-0.5 text-base" aria-hidden="true">{CATEGORY_BY_ID[project.category]?.emoji || "📁"}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#2C1A10]">
                    <Highlight text={project.title} query={value.trim()} />
                  </span>
                  <span className="block truncate text-xs text-[#6E5A4F]">
                    {[categoryLabel(project.category), project.ownerName].filter(Boolean).join(" · ")}
                    {match.where && match.where !== "description" && match.where !== categoryLabel(project.category) && match.where !== project.ownerName && (
                      <> · <Highlight text={match.where} query={value.trim()} /></>
                    )}
                    {match.where === "description" && " · matches description"}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
