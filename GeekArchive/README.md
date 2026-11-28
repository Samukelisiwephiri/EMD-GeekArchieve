# Geek Archive (by Embedded Intelligence)

Geek Archive connects South African SMMEs, NGOs and sponsors with verified students and developers.
Students showcase the GitHub projects they're most confident in; organisations discover them by
category, watch demo videos, get a plain-language AI analysis of each project, receive AI
recommendations for their need, contact students, and request a three-person pod (developer,
UI/UX designer, business student) to finish and tailor the project, then sign off the
delivered work.

## Features

| For students & developers | For SMMEs, NGOs & sponsors | For admins |
|---|---|---|
| Verify (university email, GitHub, or review) | Verify (CIPC / NPO number + review) | Review verification requests |
| Pick best projects from GitHub; demo videos; categories | Discover by category, search-as-you-type | |
| Show/hide each project; edit/delete | Watch demos (autoplay), view student profiles | |
| Talent profile (edit/delete) | AI project analysis & AI recommendations | |
| Messages from organisations; reply by email | Contact students (privacy-preserving) | |
| Pods and matched opportunities | Request pods, sign off delivered work | |

Privacy (POPIA): consent at sign-up, privacy notice, "Privacy & my data" (download / delete account),
no ID numbers or documents collected, students' contact details never shown to organisations.

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

## Going live

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (choose a region close to South Africa).
2. **SQL Editor** → paste the whole of `supabase/schema.sql` → **Run**. It is safe to run again after
   updates.
3. **Authentication → URL Configuration**: set *Site URL* to your domain (e.g. `https://geekarchive.co.za`)
   and add it to *Redirect URLs* (password-reset and OAuth links return here).
4. **Authentication → Sign In / Providers**:
   - Email: keep **Confirm email** on (students are only auto-verified once their `.ac.za` email is confirmed).
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
2. Add the environment variables above, then deploy.
3. Add your custom domain, and use it in Supabase's Site URL / Redirect URLs.

### 4. Create the first admin
Sign up normally, confirm your email, then in the Supabase SQL Editor run:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@yourdomain.co.za');
```
Admins see the **Verifications** tab to approve SMMEs/NGOs and students who don't have a university
email. Check CIPC numbers on bizportal.gov.za and NPO numbers on the DSD NPO register before approving.

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
- `src/components/*` — project links/video, profiles, AI panels, verification, privacy, admin queue
- `src/lib/*` — Supabase client, API auth, media/GitHub helpers, categories, verification rules
- `supabase/schema.sql` — tables, triggers, functions and row-level security
