# GEO Analyzer Implementation Plan

## Overview
Detailed execution plan for implementing GEO Analyzer v3.0 - AI search engine citation analysis platform supporting 4 LLMs (Perplexity, ChatGPT, Gemini, Claude).

---

## Phase 0: Prerequisites

### 0.1 Environment Setup
- [ ] Create Supabase account and project (Region: ap-northeast-2 Seoul)
- [ ] Obtain 4 LLM API keys:
  - Perplexity API key (pplx-xxx)
  - OpenAI API key (sk-xxx)
  - Google AI API key (xxx)
  - Anthropic API key (sk-ant-xxx)
- [ ] Create GitHub repository
- [ ] Set up Vercel account

---

## Phase 1: Core MVP

### Stage 1.1: Project Setup (Days 1-2)

#### Task 1.1.1: Create Next.js Project
```bash
npx create-next-app@latest geo-analyzer --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd geo-analyzer
```
**Verification**: `npm run dev` succeeds, http://localhost:3000 loads

#### Task 1.1.2: Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react recharts
npm install class-variance-authority clsx tailwind-merge
npm install zod date-fns
npm install -D @types/node
```
**Verification**: `package.json` updated, no install errors

#### Task 1.1.3: Configure shadcn/ui
```bash
npx shadcn@latest init
npx shadcn@latest add button input card badge table tabs skeleton toast dialog dropdown-menu
```
**Verification**: `components.json` created, UI components in `src/components/ui/`

#### Task 1.1.4: Create Project Structure
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── analysis/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── api/analyze/route.ts
├── components/
│   ├── ui/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── analysis/
├── lib/supabase/
│   ├── client.ts
│   ├── server.ts
│   └── types.ts
├── hooks/
└── types/index.ts
```
**Verification**: All directories and placeholder files created

#### Task 1.1.5: Supabase Project Configuration
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy URL and API keys from Project Settings > API
- [ ] Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```
**Verification**: `.env.local` created, `.gitignore` includes `.env*.local`

#### Task 1.1.6: Supabase Client Setup
Create files:
- `lib/supabase/client.ts` - Browser client with createBrowserClient
- `lib/supabase/server.ts` - Server client with createServerClient
- `lib/supabase/types.ts` - Database types

**Verification**: No TypeScript errors on import

#### Task 1.1.7: Basic Layout Implementation
- [ ] Create `components/layout/Header.tsx` with navigation
- [ ] Update `app/layout.tsx` with Header and Toaster
- [ ] Create basic `app/page.tsx`

**Verification**: Header displays, navigation works

#### Task 1.1.8: GitHub Repository Setup
```bash
git init
git add .
git commit -m "Initial commit: Next.js 14 + Tailwind + Supabase setup"
git remote add origin https://github.com/[username]/geo-analyzer.git
git push -u origin main
```
**Verification**: Code pushed to GitHub

---

### Stage 1.2: Database Setup (Days 3-4)

#### Task 1.2.1: Create analyses Table
Execute in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    my_domain TEXT,
    my_brand TEXT,
    brand_aliases TEXT[],
    results JSONB NOT NULL DEFAULT '{}',
    summary JSONB,
    cross_validation JSONB,
    competitor_analysis JSONB,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_my_domain ON analyses(my_domain);
```
**Verification**: Table visible in Supabase Table Editor

#### Task 1.2.2: TypeScript Type Definitions
Update `lib/supabase/types.ts` with:
- `UnifiedCitation` interface (id, source, position, url, cleanUrl, domain, title, snippet, publishedDate, mentionCount, avgConfidence, confidenceScores, textSpans)
- `LLMType = 'perplexity' | 'chatgpt' | 'gemini' | 'claude'`
- `LLMResult` interface
- `AnalysisResults` with 4 LLM fields
- `AnalysisSummary` with 4 LLM citationRateByLLM
- `CrossValidation`, `CompetitorAnalysis` interfaces
- Database schema types

**Verification**: TypeScript compiles without errors

#### Task 1.2.3: Data Access Functions
Create `lib/supabase/queries.ts` with:
- `createAnalysis()`
- `updateAnalysis()`
- `updateAnalysisStatus()`
- `getAnalysis()`
- `getAnalyses()`
- `deleteAnalysis()`
- `getAnalysisStats()`

**Verification**: Functions import without errors

#### Task 1.2.4: Database Testing
Create temporary `app/test-db/page.tsx` for testing CRUD operations
**Verification**: Create, Read, Delete operations work; delete test page after verification

---

### Stage 1.3: Edge Function Development (Days 5-11)

#### Task 1.3.1: Supabase CLI Setup
```bash
npm install -g supabase
supabase init
supabase login
supabase link --project-ref [YOUR_PROJECT_REF]
supabase functions new analyze-query
```
**Verification**: `supabase/functions/analyze-query/` created

#### Task 1.3.2: Environment Variables Configuration
Supabase Dashboard > Project Settings > Edge Functions > Secrets:
- `PERPLEXITY_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_AI_API_KEY`
- `ANTHROPIC_API_KEY`

Create `supabase/functions/.env` for local development
**Verification**: Secrets registered in Dashboard

#### Task 1.3.3: Common Types Definition
Create `supabase/functions/analyze-query/llm/types.ts`:
- `TextSpan` interface
- `UnifiedCitation` interface
- `LLMResponse` interface
- `AnalyzeRequest` interface
- `Competitor` interface
- `ProcessedLLMResult` interface
- `AnalysisResult` (4 LLMs)
- `AnalysisSummary`, `CrossValidation`, `CompetitorAnalysis`

**Verification**: File created, no syntax errors

#### Task 1.3.4: OpenAI API Implementation
Create `supabase/functions/analyze-query/llm/openai.ts`:
- Use Responses API (`/v1/responses`)
- Model: `gpt-4o`
- Tool: `web_search_preview`
- Extract citations from `annotations[]`
- Map `start_index`, `end_index` to `textSpans`

**Verification**: Local function test returns citations

#### Task 1.3.5: Gemini API Implementation
Create `supabase/functions/analyze-query/llm/gemini.ts`:
- Model: `gemini-2.0-flash`
- Tool: `google_search`
- Extract from `groundingMetadata.groundingChunks`
- Extract `confidenceScores` from `groundingSupports`
- Calculate `avgConfidence`

**Verification**: Local function test returns citations with confidence scores

#### Task 1.3.6: Perplexity API Implementation
Create `supabase/functions/analyze-query/llm/perplexity.ts`:
- Model: `sonar-pro`
- Setting: `search_context_size: 'high'`
- Primary source: `search_results[]`
- Fallback: `citations[]`
- Extract `date`, `snippet` from results
- Count `[1]`, `[2]` references for `mentionCount`

**Verification**: Local function test returns citations with publishedDate

#### Task 1.3.7: Claude API Implementation
Create `supabase/functions/analyze-query/llm/claude.ts`:
- Model: `claude-sonnet-4-20250514`
- Tool: `web_search_20250305`
- Options: `max_uses: 5`
- Extract from `web_search_tool_result.content`

**Verification**: Local function test returns citations

#### Task 1.3.8: Utility Functions
Create utility files:
- `utils/domain-matcher.ts`: `normalizeDomain()`, `domainsMatch()`, `findBrandMention()`, `processLLMResult()`
- `utils/summary.ts`: `generateSummary()`
- `utils/cross-validation.ts`: `calculateCrossValidation()`
- `utils/competitor-analysis.ts`: `analyzeCompetitors()`

**Verification**: All utilities import without errors

#### Task 1.3.9: Main Edge Function
Create `supabase/functions/analyze-query/index.ts`:
- CORS headers configuration
- Request validation
- DB record creation (status: processing)
- 4 LLM parallel calls with `Promise.allSettled`
- Result processing with `processLLMResult()`
- Summary generation
- Cross-platform validation
- Competitor analysis (optional)
- DB update (status: completed)
- Response return

**Verification**: Full flow works with mock data

#### Task 1.3.10: Deployment and Testing
```bash
supabase functions serve analyze-query --env-file supabase/functions/.env
# Test with curl
supabase functions deploy analyze-query
```
**Verification**:
- Local test succeeds
- Deployed function returns results
- DB records created correctly

---

### Stage 1.4: Frontend Development (Days 12-18)

#### Task 1.4.1: Types and Hooks Definition
Create `types/index.ts` and `hooks/useAnalysis.ts`:
- Export all necessary types
- `useAnalysis` hook with `analyze()`, `getAnalyses()`, `getAnalysis()`

**Verification**: No TypeScript errors

#### Task 1.4.2: Query Input Component
Create `components/analysis/QueryInput.tsx`:
- Query text input (required)
- Domain input (optional)
- Brand name input (optional)
- Loading state with spinner
- Form validation

**Verification**: Form submits correctly

#### Task 1.4.3: LLM Result Card Component
Create `components/analysis/LLMResultCard.tsx`:
- Display 4 LLM types with colors:
  - Perplexity: `#f59e0b`
  - ChatGPT: `#10b981`
  - Gemini: `#6366f1`
  - Claude: `#ec4899`
- Success/failure states
- Citations list
- Domain highlighting
- Response time display

**Verification**: Cards render correctly for all states

#### Task 1.4.4: Analysis Summary Component
Create `components/analysis/AnalysisSummary.tsx`:
- Citation rate (domain)
- Brand mention rate
- Total citations
- Average response time
- Cited LLMs list
- 4 LLM support

**Verification**: Summary displays correct calculations

#### Task 1.4.5: Main Page Implementation
Update `app/page.tsx`:
- QueryInput component
- Results display with AnalysisSummary
- 4 LLM result cards
- Toast notifications
- Link to detail page

**Verification**: Full analysis flow works

#### Task 1.4.6: Analysis History Page
Create `app/analysis/page.tsx`:
- Fetch analyses list
- Display cards with query, status, date
- Pagination or infinite scroll
- Link to detail pages
- Loading skeleton

**Verification**: History loads and displays correctly

#### Task 1.4.7: Analysis Detail Page
Create `app/analysis/[id]/page.tsx`:
- Fetch single analysis by ID
- Display full results
- All 4 LLM cards
- Summary section
- Back navigation
- 404 handling

**Verification**: Detail page loads correctly

#### Task 1.4.8: Toast Hook
```bash
npx shadcn@latest add toast
```
Verify `hooks/use-toast.ts` exists

**Verification**: Toast notifications work

---

## Phase 2: Project Management & Dashboard

### Stage 2.1: Project Management (Days 19-22)

#### Task 2.1.1: Create Tables
Execute in Supabase SQL Editor:
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    brand_aliases TEXT[] DEFAULT '{}',
    industry TEXT,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'phrase',
    intent TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    last_analysis_id UUID,
    last_analysis_at TIMESTAMPTZ,
    avg_citation_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    brand_aliases TEXT[] DEFAULT '{}',
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analyses ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE analyses ADD COLUMN query_id UUID REFERENCES queries(id);
```

#### Task 2.1.2: TypeScript Types
Add to `types/index.ts`:
- `Project`, `ProjectInsert`, `ProjectUpdate`
- `Query`, `QueryInsert`, `QueryUpdate`
- `Competitor`, `CompetitorInsert`
- `ProjectWithRelations`

#### Task 2.1.3: Data Access Functions
Create:
- `lib/supabase/queries/projects.ts`
- `lib/supabase/queries/queries.ts`
- `lib/supabase/queries/competitors.ts`

#### Task 2.1.4: Projects Page
Create `app/projects/page.tsx`:
- Project list grid
- Create project button
- Empty state

#### Task 2.1.5: Create Project Dialog
Create `components/project/CreateProjectDialog.tsx`:
- Project name, brand name, domain inputs
- Industry select
- Brand aliases input
- Description textarea

```bash
npx shadcn@latest add dialog select textarea label
```

#### Task 2.1.6: Project Detail Page
Create `app/projects/[id]/page.tsx`:
- Project info header
- Statistics cards
- Queries tab
- Competitors tab

#### Task 2.1.7: Query Components
Create:
- `components/project/QueryList.tsx`
- `components/project/AddQueryDialog.tsx`

```bash
npx shadcn@latest add switch
```

#### Task 2.1.8: Competitor Components
Create:
- `components/project/CompetitorList.tsx`
- `components/project/AddCompetitorDialog.tsx`
- Max 5 competitors limit

#### Task 2.1.9: Header Navigation Update
Update `components/layout/Header.tsx`:
- Add "Projects" nav item
- Active state styling

---

### Stage 2.2: Dashboard & Charts (Days 23-26)

#### Task 2.2.1: Daily Metrics Table
```sql
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_analyses INTEGER DEFAULT 0,
    citation_rate DECIMAL(5,2),
    brand_mention_rate DECIMAL(5,2),
    llm_stats JSONB DEFAULT '{}',
    competitor_stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, date)
);
```

#### Task 2.2.2: Statistics Functions
Create `lib/supabase/queries/metrics.ts`:
- `calculateDailyMetrics()`
- `getMetricsByProject()`
- `getMetricsTrend()`

#### Task 2.2.3: Dashboard Page
Create `app/dashboard/page.tsx`:
- Project selector
- Date range filter
- Summary cards
- Chart sections

#### Task 2.2.4: Citation Trend Chart
Create `components/dashboard/CitationTrendChart.tsx`:
- Recharts LineChart
- Date on X-axis
- Citation rate on Y-axis

#### Task 2.2.5: LLM Comparison Chart
Create `components/dashboard/LLMComparisonChart.tsx`:
- Recharts BarChart
- 4 LLM bars with colors:
  - Perplexity: `#f59e0b`
  - ChatGPT: `#10b981`
  - Gemini: `#6366f1`
  - Claude: `#ec4899`

#### Task 2.2.6: Competitor Comparison Chart
Create `components/dashboard/CompetitorChart.tsx`:
- Horizontal bar chart
- My brand vs competitors

#### Task 2.2.7: Query Performance Table
Create `components/dashboard/QueryPerformanceTable.tsx`:
- Query text
- Analysis count
- Average citation rate
- Trend indicator

#### Task 2.2.8: Navigation Update
Add "Dashboard" to Header navigation

---

### Stage 2.3: Analysis-Project Integration (Days 27-28)

#### Task 2.3.1: Main Page Enhancement
Update `app/page.tsx`:
- Add ProjectSelector component
- Add SavedQuerySelector component
- Pass project context to analysis

#### Task 2.3.2: Project/Query Selector Components
Create:
- `components/analysis/ProjectSelector.tsx`
- `components/analysis/SavedQuerySelector.tsx`

#### Task 2.3.3: QueryInput Modification
Update `components/analysis/QueryInput.tsx`:
- Accept default values from project
- Collapsible advanced settings

```bash
npx shadcn@latest add collapsible
```

#### Task 2.3.4: useAnalysis Hook Update
Update `hooks/useAnalysis.ts`:
- Add `projectId`, `queryId` to request
- Update query stats after analysis

#### Task 2.3.5: Edge Function Update
Update `analyze-query/index.ts`:
- Accept `projectId`, `queryId` in request
- Save to `project_id`, `query_id` columns
- Update query statistics

---

## Phase 3: Advanced Features

### Stage 3.1: Page Structure Analysis (Days 29-33)

#### Task 3.1.1: page_analyses Table
```sql
CREATE TABLE page_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    scores JSONB DEFAULT '{}',
    technical_analysis JSONB DEFAULT '{}',
    content_analysis JSONB DEFAULT '{}',
    schema_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    llm_checklists JSONB DEFAULT '{}',
    status TEXT DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Task 3.1.2: Page Analysis Types
Create `types/pageAnalysis.ts`:
- `CrawlabilityAnalysis` (4 bots: PerplexityBot, OAI-SearchBot, Googlebot, ClaudeBot)
- `TechnicalAnalysis`
- `ContentAnalysis` (BLUF, structure, authority)
- `SchemaAnalysis`
- `PageScores` (overall, technical, content, trust, 4 LLM readiness)
- `Recommendation` (with targetLLMs)
- `LLMChecklists` (perplexity, chatgpt, gemini, claude)
- `PageAnalysis`

#### Task 3.1.3: analyze-page Edge Function
```bash
supabase functions new analyze-page
```
Implement:
- HTML fetch and parse (deno_dom)
- Technical analysis (robots.txt for 4 bots)
- Content analysis (BLUF, FAQ, headers)
- Schema analysis (JSON-LD parsing)
- Score calculation (4 LLM readiness scores)
- Recommendations generation (4 LLM targets)
- Checklists generation (4 LLM checklists)

#### Task 3.1.4: Page Analysis Page
Create `app/page-analysis/page.tsx`:
- URL input form
- Loading state
- Results display

#### Task 3.1.5: Page Analysis Result Component
Create `components/page-analysis/PageAnalysisResult.tsx`:
- Score cards (overall, technical, content, trust)
- 4 LLM readiness progress bars
- Tabs: Recommendations, Checklist, Details
- 4 LLM checklist columns

```bash
npx shadcn@latest add progress
```

#### Task 3.1.6: Navigation Update
Add "Page Analysis" to Header navigation

---

### Stage 3.2: Authentication System (Days 34-37)

#### Task 3.2.1: Supabase Auth Configuration
Dashboard > Authentication > Providers:
- Enable Email provider
- Configure Google OAuth (optional)
- Set redirect URLs

#### Task 3.2.2: Database RLS Setup
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    company TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id to existing tables
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE analyses ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE page_analyses ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
```

#### Task 3.2.3: Auth Client Setup
Create `lib/supabase/auth.ts`:
- `signUp()`, `signIn()`, `signInWithGoogle()`
- `signOut()`, `resetPassword()`, `updatePassword()`
- `getCurrentUser()`, `getSession()`
- `getProfile()`, `updateProfile()`

#### Task 3.2.4: Auth Context
Create `contexts/AuthContext.tsx`:
- `AuthProvider` component
- `useAuth` hook
- Session state management

Update `app/layout.tsx` with AuthProvider

#### Task 3.2.5: Login Page
Create `app/login/page.tsx`:
- Email/password form
- Google OAuth button
- Error handling

```bash
npx shadcn@latest add separator
```

#### Task 3.2.6: Signup Page
Create `app/signup/page.tsx`:
- Registration form
- Email verification flow

#### Task 3.2.7: OAuth Callback
Create `app/auth/callback/route.ts`:
- Exchange code for session
- Redirect handling

#### Task 3.2.8: Middleware
Create `middleware.ts`:
- Protected routes check
- Auth redirect logic

#### Task 3.2.9: Header User Display
Update `components/layout/Header.tsx`:
- User avatar dropdown
- Login/signup buttons for unauthenticated
- Logout functionality

```bash
npx shadcn@latest add avatar
```

#### Task 3.2.10: Legacy Data Handling
- Allow access to `user_id IS NULL` data
- Or migrate to admin user

---

### Stage 3.3: Reports & Finalization (Days 38-41)

#### Task 3.3.1: Reports Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'manual',
    period_start DATE,
    period_end DATE,
    summary JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    file_url TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ
);
```

#### Task 3.3.2: Report Types
Create `types/report.ts`

#### Task 3.3.3: Report Data Generation
Create `lib/reports/generateReportData.ts`:
- Calculate summary from analyses
- Calculate metrics trends
- Generate recommendations

#### Task 3.3.4: Reports Page
Create `app/reports/page.tsx`:
- Project selector
- Report list
- Generate button

#### Task 3.3.5: Report Generation Dialog
Create `components/reports/GenerateReportDialog.tsx`:
- Title input
- Date range picker
- Type selector

#### Task 3.3.6: Navigation Update
Add "Reports" to Header navigation

#### Task 3.3.7: Final Polish
- [ ] Global error boundary
- [ ] Loading states
- [ ] Metadata setup
- [ ] robots.txt, sitemap.xml
- [ ] Vercel deployment
- [ ] Production testing

---

## Execution Dependencies

```
Phase 0
    └── Phase 1.1 (Setup)
        └── Phase 1.2 (Database)
            └── Phase 1.3 (Edge Functions)
                └── Phase 1.4 (Frontend)
                    └── Phase 2.1 (Project Management)
                        └── Phase 2.2 (Dashboard)
                            └── Phase 2.3 (Integration)
                                └── Phase 3.1 (Page Analysis)
                                    └── Phase 3.2 (Authentication)
                                        └── Phase 3.3 (Reports)
```

---

## Critical Checkpoints

### After Phase 1 (Day 18)
- [ ] 4 LLM analysis working
- [ ] Citations extracted correctly
- [ ] Results saved to database
- [ ] Frontend displays results

### After Phase 2 (Day 28)
- [ ] Projects CRUD working
- [ ] Queries management working
- [ ] Dashboard charts displaying
- [ ] Project-analysis linking working

### After Phase 3 (Day 41)
- [ ] Page analysis working
- [ ] User authentication working
- [ ] RLS policies enforced
- [ ] Reports generating
- [ ] Production deployed

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| LLM API changes | Use official SDK, monitor changelogs |
| API rate limits | Implement retry with backoff |
| Single LLM failure | Promise.allSettled for partial results |
| Cost overruns | Set API call limits, monitor usage |
| Performance issues | Implement caching, optimize queries |

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0 | 1 day | Day 1 |
| Phase 1.1 | 2 days | Day 3 |
| Phase 1.2 | 2 days | Day 5 |
| Phase 1.3 | 7 days | Day 12 |
| Phase 1.4 | 6 days | Day 18 |
| Phase 2.1 | 4 days | Day 22 |
| Phase 2.2 | 4 days | Day 26 |
| Phase 2.3 | 2 days | Day 28 |
| Phase 3.1 | 5 days | Day 33 |
| Phase 3.2 | 4 days | Day 37 |
| Phase 3.3 | 4 days | Day 41 |

**Total: ~41 working days**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-01 | Initial plan with 4 LLM support |
