# GEO Analyzer Requirements Specification

## Overview

This document defines all features and requirements for GEO Analyzer v3.0, an AI search engine citation analysis platform supporting 4 LLMs (Perplexity, ChatGPT, Gemini, Claude).

---

## Phase 1: Core MVP

### 1.1 Project Setup

#### 1.1.1 Next.js Project Initialization
- Create Next.js 14 project with App Router
- Enable TypeScript strict mode
- Configure Tailwind CSS 3.x
- Set up ESLint

#### 1.1.2 Additional Dependencies
- @supabase/supabase-js, @supabase/ssr (Supabase client)
- lucide-react (icons)
- recharts (charts)
- class-variance-authority, clsx, tailwind-merge (utilities)
- zod (validation)
- date-fns (date formatting)

#### 1.1.3 shadcn/ui Components
- button, input, card, badge, table, tabs
- skeleton, toast, dialog, dropdown-menu
- select, textarea, label, separator
- switch, progress, avatar, collapsible

#### 1.1.4 Project Structure
```
geo-analyzer/
├── app/ (App Router pages)
├── components/ (React components)
│   ├── ui/ (shadcn/ui)
│   ├── analysis/
│   ├── dashboard/
│   ├── project/
│   ├── page-analysis/
│   ├── reports/
│   └── layout/
├── lib/
│   ├── supabase/ (client, server, types, queries)
│   ├── llm/ (API wrappers)
│   └── utils/
├── hooks/
├── types/
├── contexts/
└── supabase/
    ├── migrations/
    └── functions/
```

#### 1.1.5 Supabase Project Setup
- Create Supabase project (Region: ap-northeast-2)
- Configure API keys (URL, anon key, service_role key)
- Set up environment variables (.env.local)

#### 1.1.6 Supabase Client Configuration
- Browser client (createBrowserClient)
- Server client (createServerClient with cookies)
- Database type definitions

#### 1.1.7 Basic Layout Implementation
- Header component with navigation
- Main content area
- Toast notifications

#### 1.1.8 GitHub Repository Setup
- Initialize git repository
- Configure .gitignore (exclude .env files)
- Initial commit and push

---

### 1.2 Database Construction

#### 1.2.1 analyses Table (4 LLM Support)
- **id**: UUID primary key
- **query_text**: TEXT NOT NULL
- **my_domain**: TEXT (target domain)
- **my_brand**: TEXT (brand name)
- **brand_aliases**: TEXT[] (brand variations)
- **results**: JSONB (4 LLM results with UnifiedCitation)
- **summary**: JSONB (analysis summary)
- **cross_validation**: JSONB (cross-platform verification)
- **competitor_analysis**: JSONB (competitor data)
- **status**: TEXT ('pending'|'processing'|'completed'|'failed')
- **error_message**: TEXT
- **created_at, updated_at, completed_at**: TIMESTAMPTZ

#### 1.2.2 TypeScript Type Definitions
- LLMType: 'perplexity' | 'chatgpt' | 'gemini' | 'claude'
- UnifiedCitation interface with:
  - id, source, position
  - url, cleanUrl, domain
  - title, snippet, publishedDate
  - mentionCount, avgConfidence, confidenceScores
  - textSpans (with start, end, text, confidence)
- LLMResult, AnalysisResults, AnalysisSummary
- CrossValidation, CompetitorAnalysis

#### 1.2.3 Data Access Functions
- createAnalysis, updateAnalysis, updateAnalysisStatus
- getAnalysis, getAnalyses, deleteAnalysis
- getAnalysisStats

#### 1.2.4 Database Testing
- Create test page for CRUD verification
- Verify Supabase Dashboard data

---

### 1.3 Edge Function Development (4 LLMs)

#### 1.3.1 Supabase CLI Setup
- Install Supabase CLI
- Initialize project connection
- Create analyze-query function

#### 1.3.2 Environment Variables
- PERPLEXITY_API_KEY (sonar-pro)
- OPENAI_API_KEY (gpt-4o)
- GOOGLE_AI_API_KEY (gemini-2.0-flash)
- ANTHROPIC_API_KEY (claude-sonnet-4)
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

#### 1.3.3 Common Types (UnifiedCitation Schema)
- TextSpan interface
- UnifiedCitation interface
- LLMResponse interface
- AnalyzeRequest interface
- ProcessedLLMResult interface
- AnalysisSummary, CrossValidation, CompetitorAnalysis

#### 1.3.4 ChatGPT API Implementation
- Endpoint: /v1/responses (Responses API)
- Model: gpt-4o
- Tool: web_search_preview
- Extract citations from annotations[]
- Support textSpans (start_index, end_index)

#### 1.3.5 Gemini API Implementation
- Model: gemini-2.0-flash
- Tool: google_search
- Extract citations from groundingMetadata
- Extract confidenceScores from groundingSupports
- Calculate avgConfidence per citation

#### 1.3.6 Perplexity API Implementation
- Model: sonar-pro
- Citation source: search_results[] (primary), citations[] (fallback)
- Settings: search_context_size: 'high'
- Extract publishedDate, snippet

#### 1.3.7 Claude API Implementation
- Model: claude-sonnet-4-20250514
- Tool: web_search_20250305
- Extract citations from web_search_tool_result
- Support allowed_domains, blocked_domains, max_uses

#### 1.3.8 Utility Functions
- domain-matcher.ts: normalizeDomain, domainsMatch, findBrandMention
- summary.ts: generateSummary
- cross-validation.ts: calculateCrossValidation
- competitor-analysis.ts: analyzeCompetitors

#### 1.3.9 Main Edge Function Implementation
- CORS configuration
- Request validation
- 4 LLM parallel calls (Promise.allSettled)
- Result processing and normalization
- Cross-platform verification
- Competitor analysis
- DB update with results

#### 1.3.10 Deployment and Testing
- Local testing (supabase functions serve)
- Production deployment (supabase functions deploy)
- cURL test commands

---

### 1.4 Frontend Development

#### 1.4.1 Common Types and Hooks
- types/index.ts: LLMType, Citation, LLMResult, Analysis
- hooks/useAnalysis.ts: analyze, getAnalyses, getAnalysis

#### 1.4.2 Query Input Component
- QueryInput.tsx with query, domain, brand fields
- Loading state with spinner
- Form validation

#### 1.4.3 LLM Result Card Component
- LLMResultCard.tsx with success/failure states
- Display answer, citations, domain highlighting
- Show response time, model, citation count
- Brand mention context display

#### 1.4.4 Analysis Summary Component
- AnalysisSummary.tsx with metrics cards
- Citation rate, brand mention rate
- Total citations, response time
- LLM breakdown

#### 1.4.5 Main Page Implementation
- app/page.tsx with QueryInput
- Display results after analysis
- LLMResultCard for each LLM (4 cards)
- AnalysisSummary component
- Navigation to detail page

#### 1.4.6 Analysis History Page
- app/analysis/page.tsx with list view
- Skeleton loading state
- Date formatting (date-fns, ko locale)
- Status badges

#### 1.4.7 Analysis Detail Page
- app/analysis/[id]/page.tsx
- Back navigation
- Full result display
- All 4 LLM cards

#### 1.4.8 Toast Hook
- Install shadcn toast component
- Configure useToast hook

---

## Phase 2: Project Management and Dashboard

### 2.1 Project/Query/Competitor Management

#### 2.1.1 Database Tables
**projects table**:
- id, name, brand_name, domain, brand_aliases
- industry, description, logo_url, settings
- created_at, updated_at

**queries table**:
- id, project_id, text, type, intent
- is_active, priority, tags, notes
- last_analysis_id, last_analysis_at, avg_citation_rate
- created_at, updated_at

**competitors table**:
- id, project_id, name, domain, brand_aliases
- description, logo_url, created_at

**analyses table extensions**:
- project_id, query_id (foreign keys)

#### 2.1.2 TypeScript Types
- Project, ProjectInsert, ProjectUpdate
- Query, QueryInsert, QueryUpdate
- Competitor, CompetitorInsert
- ProjectWithRelations

#### 2.1.3 Data Access Functions
- projects.ts: createProject, getProjects, getProjectWithRelations, updateProject, deleteProject
- queries.ts: createQuery, getQueriesByProject, updateQuery, deleteQuery, toggleQueryActive
- competitors.ts: createCompetitor, getCompetitorsByProject, deleteCompetitor, getCompetitorCount

#### 2.1.4 Projects Page
- app/projects/page.tsx with grid layout
- Project cards with logo, domain, industry
- Empty state handling

#### 2.1.5 Create Project Dialog
- CreateProjectDialog.tsx
- Form fields: name, brand_name, domain, industry, aliases, description
- Industry dropdown selection

#### 2.1.6 Project Detail Page
- app/projects/[id]/page.tsx
- Statistics cards (queries, competitors, analyses count)
- Tabs for queries and competitors
- Delete functionality

#### 2.1.7 Query List/Add Components
- QueryList.tsx with toggle, delete, analyze actions
- AddQueryDialog.tsx with type/intent selection
- Priority and active status management

#### 2.1.8 Competitor List/Add Components
- CompetitorList.tsx with delete action
- AddCompetitorDialog.tsx
- Maximum 5 competitors limit

#### 2.1.9 Header Navigation Update
- Add Projects link to navigation

---

### 2.2 Dashboard and Charts

#### 2.2.1 Daily Metrics Table
- daily_metrics table with 4 LLM columns
- Citation counts per LLM (perplexity, chatgpt, gemini, claude)
- Brand mention counts per LLM
- Competitor citations JSONB
- Unique constraint on (project_id, date)

#### 2.2.2 Statistics Calculation Functions
- DailyMetric interface (4 LLM support)
- DashboardStats interface with citationRateByLLM
- getProjectDashboardStats: 30-day analysis
- getCitationTrend: daily trend data for 4 LLMs
- getCompetitorComparison: competitor analysis
- getQueryPerformance: per-query stats

#### 2.2.3 Dashboard Page
- app/dashboard/page.tsx
- Project selector dropdown
- Metric cards (total analyses, citation rate, brand mention rate)
- Trend indicator (up/down/stable)

#### 2.2.4 Citation Trend Chart
- CitationTrendChart.tsx with Recharts LineChart
- 5 lines: overall + 4 LLMs (Perplexity, ChatGPT, Gemini, Claude)
- 30-day view with date formatting

#### 2.2.5 LLM Comparison Chart
- LLMComparisonChart.tsx with Recharts BarChart
- Horizontal bars for 4 LLMs
- Color coding per LLM

#### 2.2.6 Competitor Comparison Chart
- CompetitorComparisonChart.tsx
- Bar chart comparing my domain vs competitors
- Highlight my domain

#### 2.2.7 Query Performance Table
- QueryPerformanceTable.tsx with Table component
- Columns: query, analysis count, avg rate, performance badge, last analysis
- Performance badges (high/medium/low)

#### 2.2.8 Navigation Update
- Add Dashboard link to Header

---

### 2.3 Analysis-Project Integration

#### 2.3.1 Main Page Improvement
- ProjectSelector component
- SavedQuerySelector component
- URL parameter handling (projectId, query)

#### 2.3.2 Project/Query Selector Components
- ProjectSelector.tsx with Select dropdown
- SavedQuerySelector.tsx for saved queries

#### 2.3.3 QueryInput Modification
- Default values from project
- Collapsible advanced settings
- Auto-populate from selected project

#### 2.3.4 useAnalysis Hook Modification
- Extended request with projectId, queryId
- Pass to Edge Function

#### 2.3.5 Edge Function Modification
- Accept projectId, queryId in request
- Save to analysis record
- Update query statistics (last_analysis_id, avg_citation_rate)

---

## Phase 3: Advanced Features

### 3.1 Page Structure Analysis

#### 3.1.1 page_analyses Table
- id, project_id, url, title, meta_description
- scores: JSONB (overall, technical, content, trust, LLM-specific ready scores)
- technical_analysis: JSONB (crawlability for 4 bots, performance, structure)
- content_analysis: JSONB (BLUF, structure, authority)
- schema_analysis: JSONB (schemas, missing recommendations)
- recommendations: JSONB array
- llm_checklists: JSONB (4 LLM checklists)
- status, error_message, created_at, analyzed_at

#### 3.1.2 TypeScript Type Definitions
- CrawlabilityAnalysis (4 bot checks: PerplexityBot, OAI-SearchBot, Googlebot, ClaudeBot)
- PerformanceAnalysis, StructureAnalysis, TechnicalAnalysis
- BLUFAnalysis, ContentStructureAnalysis, AuthorityAnalysis, ContentAnalysis
- SchemaItem, SchemaAnalysis
- PageScores (including perplexity_ready, chatgpt_ready, gemini_ready, claude_ready)
- Recommendation (with targetLLMs array)
- ChecklistItem, LLMChecklists (4 LLMs)
- PageAnalysis

#### 3.1.3 analyze-page Edge Function
- URL fetch and HTML parsing (deno_dom)
- robots.txt analysis for 4 bots
- Technical analysis (HTTPS, mobile, H1, header hierarchy)
- Content analysis (BLUF, FAQ, comparison tables, author info)
- Schema.org analysis (FAQPage, Article, Organization, BreadcrumbList)
- Score calculation (overall, technical, content, trust, 4 LLM readiness)
- Recommendation generation (targeting specific LLMs)
- LLM checklist generation (4 separate checklists)

#### 3.1.4 Page Analysis Page
- app/page-analysis/page.tsx
- URL input form
- Loading state

#### 3.1.5 Analysis Result Components
- PageAnalysisResult.tsx
- Score display with color coding
- 4 LLM readiness progress bars
- Tabs: recommendations, checklist, details
- RecommendationList with priority badges
- LLMChecklistView (4 LLM columns)
- DetailedAnalysis (technical, schema)

#### 3.1.6 Navigation Update
- Add Page Analysis link to Header

---

### 3.2 Authentication System

#### 3.2.1 Supabase Dashboard Settings
- Enable Email provider
- Configure Google OAuth (optional)
- URL configuration (site URL, redirect URLs)
- Email templates

#### 3.2.2 Database RLS Settings
**profiles table**:
- id, email, full_name, avatar_url, company, role
- Trigger for automatic profile creation

**Table modifications**:
- Add user_id to projects, analyses, page_analyses

**RLS Policies**:
- profiles: view/update own
- projects: full CRUD for own projects
- queries: based on project ownership
- competitors: based on project ownership
- analyses: view own or null user_id
- page_analyses: view own or null user_id

#### 3.2.3 Supabase Auth Client
- lib/supabase/auth.ts
- signUp, signIn, signInWithGoogle
- signOut, resetPassword, updatePassword
- getCurrentUser, getSession
- getProfile, updateProfile

#### 3.2.4 Auth Context and Hook
- contexts/AuthContext.tsx
- AuthProvider with session management
- useAuth hook
- Add to app/layout.tsx

#### 3.2.5 Login Page
- app/login/page.tsx
- Email/password form
- Google OAuth button
- Forgot password link
- Sign up link

#### 3.2.6 Signup Page
- app/signup/page.tsx
- Name, email, password, confirm password
- Email verification success state

#### 3.2.7 OAuth Callback Handler
- app/auth/callback/route.ts
- Exchange code for session
- Redirect handling

#### 3.2.8 Protected Route Middleware
- middleware.ts at project root
- Protected routes: /projects, /dashboard, /profile
- Redirect to login if unauthenticated
- Redirect to home if already authenticated on auth pages

#### 3.2.9 Header User Info
- User avatar with dropdown menu
- Profile and settings links
- Logout functionality
- Conditional navigation based on auth status

#### 3.2.10 Existing Data Handling
- Migration strategy for null user_id data
- RLS policy allowing null user_id access

---

### 3.3 Report Generation

#### 3.3.1 reports Table
- id, user_id, project_id
- title, type ('manual'|'weekly'|'monthly')
- period_start, period_end
- summary: JSONB (totalAnalyses, avgCitationRate, llmPerformance for 3 LLMs, competitorComparison)
- metrics: JSONB (citationTrend, queryBreakdown, llmBreakdown)
- recommendations: JSONB array
- file_url, file_size
- status, error_message
- created_at, generated_at

#### 3.3.2 TypeScript Type Definitions
- ReportType, ReportStatus
- QueryPerformance, LLMPerformance, CompetitorPerformance
- ReportSummary, ReportMetrics, ReportRecommendation
- Report, ReportInsert

#### 3.3.3 Report Data Collection Functions
- lib/reports/generateReportData.ts
- calculateSummary: LLM stats, trends
- calculateMetrics: daily trends, query breakdown
- generateRecommendations: based on performance

#### 3.3.4 Reports Page
- app/reports/page.tsx
- Project selector
- Report list with status badges
- Download button for completed reports

#### 3.3.5 Generate Report Dialog
- GenerateReportDialog.tsx
- Title, type selection
- Date range picker (default 30 days)

#### 3.3.6 Navigation Update
- Add Reports link to Header

#### 3.3.7 PDF Generation (Optional)
- Consider jspdf + html2canvas
- Or browser print-to-PDF as MVP approach

---

## Cross-Cutting Requirements

### Error Handling
- Individual LLM failures don't block others (Promise.allSettled)
- User-friendly error messages
- Error logging to Supabase

### Performance
- LLM response timeout: 60 seconds max
- Page loading: under 2 seconds
- Parallel API calls where possible

### Security
- Environment variables never committed
- API keys only in Supabase Secrets
- HTTPS required
- XSS and SQL injection prevention
- RLS enforcement for user data

### Code Quality
- TypeScript strict mode
- ESLint error-free
- npm run build must pass
- Naming conventions:
  - Components: PascalCase (QueryInput.tsx)
  - Hooks: camelCase with 'use' prefix (useAnalysis.ts)
  - Types: PascalCase (Analysis, LLMResult)

### Cross-Platform Verification Grades
- **A**: 3+ LLMs cite same domain → 95%+ confidence
- **B**: 2 LLMs cite same domain → 80%+ confidence
- **C**: 1 LLM cites + URL verified → 60%+ confidence
- **D**: 1 LLM cites + URL unverified → <30% confidence

---

## API Contracts Summary

### Perplexity API
- Model: sonar-pro
- Citation: search_results[] → UnifiedCitation
- Unique: publishedDate, snippet

### OpenAI Responses API
- Model: gpt-4o
- Endpoint: /v1/responses
- Citation: annotations[] → UnifiedCitation
- Unique: start_index, end_index (textSpans)

### Gemini API
- Model: gemini-2.0-flash
- Tool: google_search
- Citation: groundingMetadata → UnifiedCitation
- Unique: confidenceScores[] (only LLM with confidence)

### Claude API
- Model: claude-sonnet-4-20250514
- Tool: web_search_20250305
- Citation: web_search_tool_result → UnifiedCitation
- Options: allowed_domains, blocked_domains, max_uses

---

## Deliverables Checklist

### Phase 1 (Core MVP)
- [ ] Next.js 14 project with Tailwind + shadcn/ui
- [ ] Supabase database with analyses table
- [ ] 4 LLM Edge Function (analyze-query)
- [ ] Query input UI
- [ ] Results display (4 LLM cards + summary)
- [ ] Analysis history page
- [ ] Analysis detail page

### Phase 2 (Project Management)
- [ ] Projects, queries, competitors tables
- [ ] Project management pages
- [ ] Dashboard with charts
- [ ] Analysis-project integration

### Phase 3 (Advanced)
- [ ] Page structure analysis
- [ ] Authentication (email + Google)
- [ ] RLS implementation
- [ ] Report generation

---

*Version: 3.0*
*Last Updated: 2025-12-01*
