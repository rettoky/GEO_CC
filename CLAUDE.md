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
## Supabase Rules

- **Project ID**: `fnwgevhulijlgxdtrobu` (리전: ap-northeast-2)
- **ALWAYS use MCP tools for Supabase operations**: Never use Supabase CLI commands (e.g., `npx supabase ...`).
- Use MCP tools like `mcp__supabase__deploy_edge_function`, `mcp__supabase__execute_sql`, `mcp__supabase__get_logs`, etc.
- MCP provides better integration and avoids authentication issues.

## Git Commit Rules

- **Commit after important work**: 중요한 작업이 완료될 때마다 커밋을 생성하세요.
- 기능 구현, 버그 수정, 리팩토링 등 의미 있는 변경 후에는 반드시 커밋합니다.
- 커밋 메시지는 변경 내용을 명확하게 설명해야 합니다.
<!-- MANUAL ADDITIONS END -->
