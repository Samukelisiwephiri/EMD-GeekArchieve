"use client";

import React from "react";
import { BadgeCheck, Github, Lock, PlayCircle, Sparkles, Users, Wand2 } from "lucide-react";

// Shown as a label, e.g. "Hackathon entry · NEMISA Hackathon 2026". Set it with
// NEXT_PUBLIC_EVENT_NAME; leave it empty to hide the label. This describes the
// project as an entry — it is not an official badge of the event organiser.
const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME ?? "NEMISA Hackathon";

export function EventBadge() {
  if (!EVENT_NAME) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2C94C]/40 bg-[#F2C94C]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5DC8A]">
      <span aria-hidden="true">🏆</span>
      Hackathon entry · {EVENT_NAME}
    </span>
  );
}

const UNIQUE = [
  {
    icon: BadgeCheck,
    title: "Verified on both sides",
    text: "Students verify with a university email or GitHub; SMMEs and NGOs with their CIPC or NPO number. Everyone knows who they're dealing with.",
  },
  {
    icon: Github,
    title: "Real work, straight from GitHub",
    text: "Students pick the repos they're proudest of. Organisations see only what students chose — with live demo videos.",
  },
  {
    icon: Sparkles,
    title: "AI that explains the code",
    text: "Claude reads each project's repository and tells a business owner, in plain language, the skills used, the time to finish and the tools to sustain it.",
  },
  {
    icon: Lock,
    title: "POPIA by design",
    text: "Consent, a clear privacy notice, download-or-delete your data, and no ID numbers or documents. Students' contact details are never exposed.",
  },
];

const STEPS = [
  { icon: Github, title: "Students showcase", text: "Verify, then choose your best GitHub projects and add a demo video." },
  { icon: Wand2, title: "Organisations discover", text: "Describe a need. AI recommends projects; search by category or as you type." },
  { icon: Users, title: "A pod delivers", text: "Request a developer, designer and business student to finish the project." },
  { icon: BadgeCheck, title: "Proof that counts", text: "Sign-off turns delivered work into a verified credential for each student." },
];

/** "Why Geek Archive" + "How it works" — below the sign-in card on the landing page. */
export default function LandingSections() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16">
      <section aria-labelledby="why-heading" className="mt-6">
        <h2 id="why-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          What makes Geek Archive different
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {UNIQUE.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm transition hover:border-[#C8DD9F]/40 hover:bg-white/[0.09]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8DD9F] text-[#163126]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#C9D6C6]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-heading" className="mt-14">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl border border-white/10 bg-[#0F241B]/60 p-5">
              <span className="text-xs font-black tracking-widest text-[#C8DD9F]">STEP {i + 1}</span>
              <p className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
                <Icon className="h-4 w-4 text-[#C8DD9F]" />
                {title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#C9D6C6]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#C8DD9F] to-[#E3EFC6] p-6 text-[#163126] sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-xl font-bold">Ideas become jobs. Builds become proof.</p>
          <p className="mt-1 text-sm text-[#2F472F]">
            Built in South Africa for SMMEs, NGOs and the next generation of developers.
          </p>
        </div>
        <a
          href="#top"
          className="inline-flex items-center gap-2 rounded-full bg-[#163126] px-5 py-3 text-sm font-bold text-[#C8DD9F] hover:bg-[#0F241B]"
        >
          <PlayCircle className="h-4 w-4" />
          Get started
        </a>
      </section>
    </div>
  );
}
