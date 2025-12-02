# GEO_CC Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-01

## Active Technologies

- TypeScript 5.x (strict mode) + Next.js 14 (App Router), Tailwind CSS 3.x, shadcn/ui, @supabase/supabase-js, @supabase/ssr (001-core-mvp)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x (strict mode): Follow standard conventions

## Recent Changes

- 001-core-mvp: Added TypeScript 5.x (strict mode) + Next.js 14 (App Router), Tailwind CSS 3.x, shadcn/ui, @supabase/supabase-js, @supabase/ssr

<!-- MANUAL ADDITIONS START -->
## Development Server Rules

- **NEVER run `npm run dev` in background**: The user will run the development server manually to avoid port conflicts.
- Do NOT use `run_in_background: true` with `npm run dev` command.
- The user manages the development server lifecycle.
<!-- MANUAL ADDITIONS END -->
