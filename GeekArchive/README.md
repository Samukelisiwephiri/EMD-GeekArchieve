# Geek Archive (by Embedded Intelligence)

Geek Archive connects project partners with existing software projects and multidisciplinary youth pods. Organizations can describe a need, browse the project archive, and manage pod work. Youth talent can maintain a profile, view only matched opportunities, manage pod work, and build career proof.

The current role split is a demo UI, not a security boundary: authentication is simulated in the client. A production deployment must use verified accounts and server/database authorization before storing private organization or talent data.

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
