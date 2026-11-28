# Geek Archive (by Embedded Intelligence)

Geek Archive connects South African SMMEs, NGOs and sponsors with verified students and developers.
Students showcase the GitHub projects they're most confident in, each with a demo video; organisations
discover them by category, watch the demos, get a plain-language AI analysis of each project, receive
AI recommendations for their need, contact students, and send an offer (with a short message) to a
three-person pod (developer, UI/UX designer, business student). Students accept or decline the offer;
once the work is delivered, the organisation signs it off.

**Live:** [geek-archive.vercel.app](https://geek-archive.vercel.app) (Vercel + Supabase).

**Walkthrough:** a 23-step screenshot guide of the whole flow (sign-up, demo video, discovery,
offers, accept/decline, sign-off) is in [`docs/walkthrough/index.html`](docs/walkthrough/index.html).
Open the file in a browser after cloning; GitHub shows HTML files as source code.

## Features

| For students & developers | For SMMEs, NGOs & sponsors | For admins |
|---|---|---|
| Sign up with full details (name, SA mobile, student/developer/IT, institution) | Sign up with full details (contact person, SA mobile, organisation name, SMME/NGO, CIPC/NPO number) | Review verification requests (approve, or reject with a reason the person sees) |
| Verify: university email (instant), GitHub, or admin review | Verify: CIPC / NPO number + admin review | Accounts tab: everyone who signed up, filter "Not verified" / "Email not confirmed"; confirm an email whose confirmation never arrived; verify an account directly |
| | | Team tab: invite admins by email, cancel invites, remove admins |
| Pick best projects from GitHub; upload a demo video (MP4/WebM/MOV, 50 MB) or link one | Discover by category, search-as-you-type | Admin banner: requests waiting, admins, open invites |
| Show/hide each project; edit/delete (videos are deleted with it) | Watch demos (pop up and play), view student profiles | |
| Talent profile (edit/delete) | AI project analysis & AI recommendations | |
| Messages from organisations; reply by email or "Not now" | Contact students (privacy-preserving) | |
| **Received offers**: see what's offered and the message, then Accept or Decline (plus sample offers to practise on); My pods | Send an offer with a message; see each student's answer; sign off once someone accepted | |

Privacy (POPIA): consent at sign-up, privacy notice, "Privacy & my data" (download / delete account),
no ID numbers or documents collected. Phone numbers and registration details are private (the person
and admins only); students' contact details are never shown to organisations. Google/GitHub sign-up
users and older accounts are asked for the required details after sign-in.

## Architecture

- **Next.js 15 (App Router)** — UI in `src/components/`, API routes in `src/app/api/`.
- **Supabase** — sign-in (email/password, Google, GitHub), Postgres database, row-level security.
  All access rules live in `supabase/schema.sql` and are enforced by the database, not the browser.
- **Claude (Anthropic API)** — server-side only (`/api/analyze-project`, `/api/recommend-projects`),
  structured outputs, cached and rate-limited; the key never reaches the browser.
- **GitHub API** — public repo data for the repo picker and AI analysis.

| API route | Who can call it (with Supabase configured) |
|---|---|
| `POST /api/analyze-project` | Signed-in, verified organisations/admins |
| `POST /api/recommend-projects` | Signed-in, verified organisations/admins |
| `GET /api/github-repos` | Signed-in, verified students/developers |
| `POST /api/verify-github` | Signed-in users (demo-mode GitHub check) |

Google/GitHub sign-in buttons only appear for the methods switched on in Supabase (the app reads
Supabase's public auth settings). If GitHub sign-in is off, developers verify through admin review
with their GitHub username instead of "Connect GitHub".

## Going live

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (choose a region close to South Africa).
2. **SQL Editor** → paste the whole of `supabase/schema.sql` → **Run**. It is safe to run again after
   updates.
3. **Authentication → URL Configuration**: set *Site URL* to your domain (e.g. `https://geekarchive.co.za`)
   and add it to *Redirect URLs* (password-reset and OAuth links return here).
4. **Authentication → Sign In / Providers**:
   - Email: keep **Confirm email** on (students are only auto-verified once their `.ac.za` email is
     confirmed, and admin invites only take effect for a confirmed address).
   - **Emails → SMTP**: add your own email provider (e.g. Resend). Supabase's built-in sender is heavily
     rate-limited and may only deliver to your own team, so real users wouldn't get confirmation emails.
   - Enable **GitHub** (needed for developer verification) and optionally **Google**.
   - Enable **Manual linking** (developers connect GitHub to an existing account to get verified).
5. **Project Settings → API**: copy the *Project URL* and *anon public* key. Never use the
   `service_role` key in this app.

### 2. Environment variables
Copy `.env.example` to `.env.local` (local) or set them in your host (production):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | anon public key |
| `ANTHROPIC_API_KEY` | For AI | Server-only. Without it, AI features show clearly-labelled basic estimates |
| `GITHUB_TOKEN` | Recommended | Fine-grained token, no permissions needed. Raises GitHub's limit from 60 to 5,000 requests/hour |
| `NEXT_PUBLIC_PRIVACY_CONTACT` | Yes (POPIA) | Information Officer email shown in the privacy notice |
| `NEXT_PUBLIC_DEMO_MODE` | No | `true` only for a pitch demo without Supabase. Never in a real deployment |

A production build **without** the Supabase variables shows a "not connected" page and its API
routes return `503`, so a misconfigured deployment can't hand out fake sign-ins or free AI usage.

### 3. Deploy (Vercel)
1. Import the GitHub repo in [vercel.com](https://vercel.com); set **Root Directory** to `GeekArchive`.
   (Or from this folder: `vercel link`, then `vercel deploy --prod`.)
2. Easiest database setup: in the Vercel project open **Storage → Supabase**. Vercel creates the
   Supabase project and adds `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for you.
   Otherwise add the environment variables above yourself.
3. Run `supabase/schema.sql` on the database (SQL Editor), then redeploy so the build picks up the keys.
4. Add your custom domain, and use it in Supabase's Site URL / Redirect URLs.

### 4. Admins
**First admin:** sign up normally, confirm your email, then in the Supabase SQL Editor run:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@yourdomain.co.za');
```
**More admins:** in the app, open **Team** and invite them by email. Someone who already has a
confirmed account becomes an admin straight away; anyone else becomes one automatically when they
sign up and confirm that email address. Admins can cancel invites and remove other admins (not
themselves, and never the last admin; the last admin also can't delete their own account).

Admins see the **Verifications** tab to approve SMMEs/NGOs, developers and students who don't have a
university email. Check CIPC numbers on bizportal.gov.za, NPO numbers on the DSD NPO register and
GitHub profiles before approving; a rejection needs a reason, which the person sees.

**Accounts** lists everyone, including people who never sent a verification request. Use **Confirm
email** when someone's confirmation email didn't arrive (they can then sign in), and **Verify** to
approve an account directly using the details it registered with.

### 5. POPIA checklist (organisation, not code)
- Register your Information Officer with the Information Regulator and set `NEXT_PUBLIC_PRIVACY_CONTACT`.
- Sign Supabase's and Anthropic's data processing terms (cross-border transfers, POPIA s72).
- Have the privacy notice (`src/components/Privacy.jsx`) reviewed for your organisation.
- Decide how quickly admins respond to access/deletion requests (the app handles self-service ones).

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

Without Supabase variables, `npm run dev` runs in **demo mode**: data lives in the browser and any
password works. Use `admin@geekarchive.demo` to sign in as a demo admin and approve verifications.

Production build check:
```bash
npm run build && npm start
```

## Folder structure
- `src/app/page.jsx` — entry; shows a setup screen if a production build isn't connected to Supabase
- `src/app/api/*` — server routes (AI analysis, AI recommendations, GitHub repos, GitHub verification)
- `src/components/GeekArchiveApp.jsx` — dashboards and main flows
- `src/components/*` — project links/video, profiles, AI panels, verification, privacy, sign-up details,
  admin queue (`AdminVerifications.jsx`) and admin team (`AdminTeam.jsx`)
- `src/lib/*` — Supabase client, API auth, media/GitHub helpers, categories, verification rules,
  sign-up details (`accountDetails.js`), uploaded demo videos (`demoVideos.js`)
- `supabase/schema.sql` — tables, triggers, functions and row-level security
