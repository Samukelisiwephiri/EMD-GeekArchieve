# Geek Archive (by Embedded Intelligence)

Geek Archive connects project partners with existing software projects and multidisciplinary youth pods. Organizations can describe a need, browse the project archive, and manage pod work. Youth talent can maintain a profile, view only matched opportunities, manage pod work, and build career proof.

Sign-in uses Supabase Auth when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (copy `.env.example` to `.env.local`). Email/password, Google and GitHub sign-in are supported; enable the Google and GitHub providers in the Supabase dashboard and add your site URL to the allowed redirect URLs. New accounts get their role (youth or organization) from the sign-up form via `supabase/schema.sql`; Google/GitHub sign-ups start as youth.

Without those keys the app runs in **demo mode**: sign-in is simulated, passwords are not checked, and the sign-in card says so. Projects, profiles and pods are still held in browser memory in both modes, so a production deployment must also move that data to the Supabase tables before storing private organization or talent data.

The starter project archive includes Imbewu Learn, RekaLoka, Hlokomela AI, and Inkanini RS485. Project descriptions, sectors, and technologies are used for browsing and basic text matching.

## Folder Structure
- `src/app/layout.jsx` & `src/app/page.jsx` — Next.js App Router entry points
- `src/app/globals.css` & `tailwind.config.js` — Global styles and Tailwind theme
- `src/components/InteractiveAuthBackdrop.jsx` — Interactive pointer-reactive background canvas for the Sign In / Sign Up landing view
- `src/components/GeekArchiveApp.jsx` — Role-specific dashboards, need matcher, searchable project archive, talent profiles, pod workspace, and mock interview simulator
- `supabase/schema.sql` — PostgreSQL + `pgvector` schema for prototypes, problem briefs, and pods

## Local Setup
```bash
npm install
npm run dev
```
