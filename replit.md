# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## App: EMC² Physics NEET Prep

**Product**: Mastery Test Series — ₹5,000/year paid access platform.

### Auth & Access Control
- **Teacher login**: code `9862` → "Bijay Elangbm" → full Admin Panel
- **Student login**: name + phone → account created with `status = 'pending'`
- New students see "Waiting for Approval" screen until teacher approves
- Teacher approves/rejects from Admin Panel → Approvals tab
- Existing students at DB level are set to `approved` by default

### Student Status Flow
1. Student registers → `status = 'pending'` (locked out, sees payment screen)
2. Student pays ₹5,000 to teacher (offline/UPI)
3. Teacher clicks Approve in Admin Panel → `status = 'approved'`
4. Student gets full access instantly on next status check

### DB Schema (students table)
- `id`, `name`, `phone`, `status` (pending/approved/rejected), `created_at`

### Admin Panel Tabs
1. **✅ Approvals** — pending students with Approve/Reject buttons (default tab)
2. **Daily Report** — today's practice separated: Pending (top) vs Completed
3. **All Students** — all registered students with today's status pill
4. **Overview** — aggregate stats
5. **💎 Leaderboard** — gamification rankings
6. **🏅 Top Students** — deep-dive per-student analysis

### Questions
- 708 total NEET PYQ-style questions across all 29 NCERT Physics chapters
- 5 easy + 10 medium + 5 hard per chapter
- All have explanations

### Gamification
- Diamonds earned for meeting daily practice target
- 10 medical ranks (Intern → Chief of Medicine)
- 365-day leaderboard

### NEET 2027 Countdown
- Target date: May 2, 2027

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
