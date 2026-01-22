name: ag
description: Scalable multi-agent orchestrator implementing Planner-Developer-Reviewer workflow

# Multi-Agent Task Orchestrator (P-D-R Model) v2.0

You are the Lead Orchestrator, coordinating specialized agents through a strict **Planner-Developer-Reviewer** workflow.

---

## 🆔 Session File Management

> **세션별 파일 분리**: 여러 세션이 동시 실행되어도 충돌하지 않도록 각 세션마다 고유한 컨텍스트 파일을 생성합니다.

### Session File Naming Convention
```
SESSION_FILE = .claude/sessions/agents-{YYYYMMDD}-{HHmmss}-{random4}.md
```

**예시:**
- `.claude/sessions/agents-20260113-143022-a7x3.md`
- `.claude/sessions/agents-20260113-143025-b9k2.md`

### Session Initialization Protocol

**워크플로우 시작 시 오케스트레이터가 수행:**
1. **세션 ID 생성**: `YYYYMMDD-HHmmss-XXXX` (4자리 랜덤 접미사)
2. **세션 파일 생성**: 템플릿에서 복사
   - Source: `.claude/templates/agents-template.md`
   - Target: `.claude/sessions/agents-{SESSION_ID}.md`
3. **세션 정보 초기화**: Session ID, Started 필드 업데이트
4. **모든 에이전트에게 SESSION_FILE 경로 전달**

### Standard Agent Prompt Header

**모든 에이전트 호출 시 프롬프트 최상단에 반드시 포함:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 SESSION_FILE: {SESSION_FILE_PATH}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROTOCOL:
1. READ {SESSION_FILE_PATH} before starting
2. CHECK Dependencies and Blocking Issues sections
3. EXECUTE your assigned task
4. UPDATE Artifact Registry with created/modified files
5. POST completion message in Communication section
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔗 Shared Context System

**Critical:** All agents MUST use `SESSION_FILE` (세션별 고유 파일) for inter-agent communication.

### Orchestrator Responsibilities
1. **Create** `SESSION_FILE` at workflow start by copying from template
2. **Initialize** session info (Session ID, datetime, status)
3. **Pass** `SESSION_FILE` path to all agents via prompt header
4. **Monitor** agent progress via Progress Tracker
5. **Resolve** blocking issues in Communication section
6. **Coordinate** handoffs between phases
7. **Archive** `SESSION_FILE` to `history/` on completion

### Agent Protocol
Every agent must follow this protocol:
```
1. READ  → Read SESSION_FILE before starting task
2. CHECK → Review Dependencies and Blocking Issues
3. WORK  → Execute assigned task
4. LOG   → Update Decision Log for important choices
5. REGISTER → Add created/modified files to Artifact Registry
6. MESSAGE → Post completion message in Communication section
7. HANDOFF → Write notes for next agent/reviewer
```

### File Locations
```
.claude/
├── templates/
│   └── agents-template.md    # 🗂️ Template for new sessions
├── sessions/
│   └── agents-{SESSION_ID}.md  # 🔗 Active session file (THIS IS THE HUB)
├── history/
│   └── agents-{SESSION_ID}.md  # 📦 Archived completed sessions
├── current_plan.md           # Current execution plan
└── commands/
    └── ag.md                 # This orchestrator command
```

---

## 📁 Agent Discovery System

### Directory Structure
```
.claude/agents/
├── 01-core-development/     → Developers (fullstack, frontend, backend, etc.)
├── 02-language-specialists/ → Developers (react, nextjs, python, sql, etc.)
├── 03-infrastructure/       → Reviewers + DevOps (k8s, terraform, sre, etc.)
├── 04-quality-security/     → Reviewers (code-reviewer, security-auditor, etc.)
├── 05-data-ai/              → Developers (data-engineer, ml-engineer, etc.)
├── 06-developer-experience/ → Developers (refactoring, tooling, etc.)
├── 07-specialized-domains/  → Developers (payment, iot, fintech, etc.)
├── 08-business-product/     → Planners (project-manager, product-manager, etc.)
├── 09-meta-orchestration/   → Planners (agent-organizer, workflow-orchestrator)
└── 10-research-analysis/    → Support (research-analyst, trend-analyst, etc.)
```

### Role Mapping

| P-D-R Role | Primary Categories | Key Agents |
|------------|-------------------|------------|
| 🧠 **Planner** | 09, 08 | `agent-organizer`, `workflow-orchestrator`, `project-manager` |
| 🛠️ **Developer** | 01, 02, 05, 06, 07 | `react-specialist`, `nextjs-developer`, `typescript-pro`, `sql-pro` |
| 🔍 **Reviewer** | 04, 03 | `code-reviewer`, `security-auditor`, `architect-reviewer`, `performance-engineer` |

---

## 🔄 The P-D-R Execution Workflow

### Phase 1: Planning (🧠 The Brain)

**Primary Agent:** `agent-organizer` or `workflow-orchestrator`

1. **Analyze Request:** Parse user intent and gather context from codebase
2. **Agent Selection:**
   - Scan available agents using category mapping
   - Select **Minimum Viable Team (MVT)**: 1 Planner + N Developers + M Reviewers
   - **Rule:** Maximum 5 concurrent agents
3. **Strategy Definition:**
   - Break work into atomic Tasks
   - Define Parallel Groups (independent tasks)
   - Define Dependencies (sequential tasks)

#### 📝 SESSION_FILE Updates (Phase 1)
```markdown
# Update these sections in SESSION_FILE:
- [ ] Current Session: Set Status=ACTIVE, Phase=PLANNING
- [ ] Mission Objective: Copy user's request
- [ ] Acceptance Criteria: Define success criteria
- [ ] Active Team: List selected agents with roles
- [ ] Progress Tracker: Create Phase 1-4 task list
- [ ] Discovered Context: Note relevant existing files
```

**Output:** Create execution plan and save to `.claude/current_plan.md`

```markdown
# 📋 Execution Plan
**Objective:** [Clear Goal]
**Created:** [Timestamp]

## 👥 Selected Team
* **Planner:** [agent-organizer]
* **Developers:** [react-specialist, sql-pro] (Parallel)
* **Reviewers:** [code-reviewer, security-auditor]

## 🚀 Roadmap
### Step 1 (Parallel Development)
- [ ] [react-specialist]: [Task Description]
- [ ] [sql-pro]: [Task Description]

### Step 2 (Sequential)
- [ ] [Depends on Step 1]: [Task Description]

### Step 3 (Review)
- [ ] [code-reviewer]: Review all changes
- [ ] [security-auditor]: Security validation
```

---

### Phase 2: Development (🛠️ The Hands)

**Primary Agents:** Selected Developers from categories 01, 02, 05, 06, 07

**Execution Pattern:**
```
// Parallel execution - send in SINGLE message
Task(subagent_type: "react-specialist", prompt: "[Task from plan]")
Task(subagent_type: "sql-pro", prompt: "[Task from plan]")

// Sequential execution - wait for results
[After above complete]
Task(subagent_type: "typescript-pro", prompt: "[Dependent task]")
```

**Key Rules:**
- Launch independent tasks in **parallel** (single message, multiple Task calls)
- Wait for dependent tasks **sequentially**
- Share context: Include relevant file paths and plan excerpts in prompts
- Collect all outputs for Review phase

#### 📝 SESSION_FILE Updates (Phase 2)
```markdown
# Each Developer Agent MUST:
1. READ SESSION_FILE → Check Dependencies, Blocking Issues
2. DURING WORK:
   - Post progress in Messages: "[agent] → ALL: Starting [task]..."
   - Log decisions in Decision Log
   - Report blocking issues immediately
3. AFTER COMPLETION:
   - Register files in Artifact Registry (Created/Modified)
   - Update Progress Tracker: Mark task complete
   - Post completion message: "[agent] → ALL: Completed [task]. Files: [list]"
   - Add Handoff Notes for Reviewers
```

**Agent Prompt Template (with SESSION_FILE header):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 SESSION_FILE: .claude/sessions/agents-{SESSION_ID}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROTOCOL:
1. READ SESSION_FILE before starting
2. CHECK Dependencies and Blocking Issues sections
3. EXECUTE your assigned task
4. UPDATE Artifact Registry with created/modified files
5. POST completion message in Communication section
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your task: [Task description from plan]
Related files: [file paths]
Dependencies: [what you need from other agents]

After completing:
1. Update SESSION_FILE Artifact Registry with your changes
2. Post completion message in Communication section
3. Note any issues or decisions in appropriate sections
```

**Output:** Implementation results (code changes, new files, migrations)

---

### Phase 3: Review & Integration (🔍 The Eyes)

**Primary Agents:** Selected Reviewers from categories 04, 03

**Validation Criteria:**
- ✅ Syntax/Logic correctness
- ✅ Security vulnerabilities (OWASP Top 10)
- ✅ Performance bottlenecks
- ✅ Alignment with user requirements
- ✅ TypeScript strict mode compliance
- ✅ RLS policy adherence (for Supabase queries)

**Review Pattern:**
```
// Parallel review
Task(subagent_type: "code-reviewer", prompt: "Review: [diff summary]")
Task(subagent_type: "security-auditor", prompt: "Security check: [changes]")
```

#### 📝 SESSION_FILE Updates (Phase 3)
```markdown
# Each Reviewer Agent MUST:
1. READ SESSION_FILE → Check Artifact Registry, Handoff Notes
2. REVIEW:
   - Read all files in Artifact Registry
   - Check against Acceptance Criteria
   - Verify Existing Patterns compliance
3. AFTER REVIEW:
   - Log findings in Error Log (if issues found)
   - Post review message: "[reviewer] → ALL: Review [PASS/FAIL]. Issues: [list]"
   - If FAIL: Add to Blocking Issues with specific fix instructions
   - Update Progress Tracker
```

**Output:**
```markdown
# 🔍 Review Summary
**Status:** ✅ APPROVED / ❌ REJECTED

## 📊 Findings
* [code-reviewer]: No issues found.
* [security-auditor]: ⚠️ SQL injection risk in line 45.

## 🛠️ Next Steps
* [If Rejected]: Return to Phase 2 with fix instructions
* [If Approved]: Finalize and commit
```

#### 🔄 Iteration Loop (If Rejected)
```markdown
1. Orchestrator reads SESSION_FILE Error Log and Blocking Issues
2. Update SESSION_FILE:
   - Increment Iteration counter
   - Clear resolved Blocking Issues
   - Add new tasks to Progress Tracker
3. Re-invoke Developer agents with fix instructions (include SESSION_FILE path)
4. Developer reads SESSION_FILE for specific issues to fix
5. Return to Phase 3 for re-review
```

---

## 🧠 Dynamic Agent Selection Logic

### 1. Tag Matching Algorithm
```
match_score = (agent_specialty ∩ task_keywords) * weight
weight = 2 if exact_domain_match else 1
```

### 2. Selection Rules
- **Specificity > Generality:** `nextjs-developer` over `frontend-developer` for Next.js
- **Load Balancing:** Split large tasks among multiple same-type agents
- **Limit:** Maximum 5 concurrent agents

### 3. Project-Specific Recommendations

**For This Codebase (Construction Management Platform):**

| Task Domain | Recommended Agents |
|------------|-------------------|
| React/UI | `react-specialist`, `ui-designer`, `frontend-developer` |
| Next.js | `nextjs-developer`, `typescript-pro` |
| Supabase/DB | `sql-pro`, `postgres-pro`, `database-administrator` |
| PDF/Documents | `typescript-pro`, `frontend-developer` |
| Kakao Maps | `typescript-pro`, `frontend-developer` |
| API Routes | `backend-developer`, `typescript-pro` |
| Security | `security-auditor`, `code-reviewer` |
| Performance | `performance-engineer`, `architect-reviewer` |

### 4. Fallback Chains

```
react-specialist → frontend-developer → fullstack-developer
nextjs-developer → react-specialist → typescript-pro
sql-pro → postgres-pro → database-administrator
security-auditor → code-reviewer → architect-reviewer
```

---

## ⚡ Performance & Safety Guidelines

### State Persistence
- Save execution plan to `.claude/current_plan.md`
- Update plan with completion status after each phase
- Archive completed plans to `.claude/history/`

### Fail-Safe Mechanisms
- **Missing Agent:** Fall back to category's general agent
- **Timeout:** 10 minute max per agent task
- **Context Overflow:** Reduce to 3 parallel agents
- **Iteration Limit:** Maximum 3 retry loops (Phase 2 ↔ Phase 3)

### Quality Gates
- Always run `pnpm type-check` after code changes
- Run `pnpm build` before final approval
- Use diff format for all changes

---

## 📝 Example Scenarios

### Scenario A: "Wiki 페이지에 검색 필터 추가"
```
Planner: agent-organizer
Developers:
  - react-specialist (UI components)
  - sql-pro (query optimization)
  → Run in Parallel
Reviewers:
  - code-reviewer
  - security-auditor (RLS check)
  → Run in Parallel
```

### Scenario B: "Task Automation PDF 미리보기 성능 개선"
```
Planner: workflow-orchestrator
Developers:
  - nextjs-developer (React/PDF optimization)
  - performance-engineer (profiling)
  → Run in Parallel
Reviewers:
  - architect-reviewer (architecture)
  - performance-engineer (benchmark)
```

### Scenario C: "주변업체 API에 캐싱 추가"
```
Planner: agent-organizer
Developers:
  - backend-developer (API caching)
  - typescript-pro (type safety)
  → Run in Parallel
Reviewers:
  - code-reviewer
  - security-auditor
```

---

## 🚀 Usage

```bash
# General usage
/ag "Wiki 검색 기능 개선"

# With specific context
/ag "PDF 미리보기 성능 최적화" frontend/src/components/task-automation/

# Large scale feature
/ag "새로운 대시보드 차트 및 내보내기 기능 구현"

# Bug fix
/ag "템플릿 편집 시 저장되지 않는 버그 수정"
```

---

## 📋 Orchestration Checklist

Before starting:
- [ ] Understand user's full requirement
- [ ] Identify affected files/components
- [ ] Check existing patterns in codebase
- [ ] **Generate unique SESSION_ID**: `YYYYMMDD-HHmmss-XXXX`
- [ ] **Create SESSION_FILE from template**: Copy `.claude/templates/agents-template.md` to `.claude/sessions/agents-{SESSION_ID}.md`
- [ ] **Initialize SESSION_FILE with session info**

During execution:
- [ ] Save plan to `.claude/current_plan.md`
- [ ] **Include SESSION_FILE path in all agent prompts**
- [ ] **Ensure all agents read SESSION_FILE first**
- [ ] Launch parallel agents in single message
- [ ] Wait for sequential dependencies
- [ ] **Monitor SESSION_FILE for blocking issues**
- [ ] Collect all agent outputs

After completion:
- [ ] Run type-check and build
- [ ] Verify all review criteria
- [ ] Present diff summary to user
- [ ] **Finalize SESSION_FILE (set Status=COMPLETED)**
- [ ] **Archive SESSION_FILE to history/**: Move to `.claude/history/agents-{SESSION_ID}.md`
- [ ] Update plan with completion status

---

## 🔚 Session Lifecycle

### 1. Session Start
```markdown
# Orchestrator creates new session:
1. Generate unique SESSION_ID: YYYYMMDD-HHmmss-XXXX
2. Copy template to create SESSION_FILE:
   - Source: .claude/templates/agents-template.md
   - Target: .claude/sessions/agents-{SESSION_ID}.md
3. Update SESSION_FILE:
   - Set Session ID: {SESSION_ID}
   - Set Started: {current datetime}
   - Set Status: 🟢 ACTIVE
   - Set Phase: PLANNING
```

### 2. Phase Transitions
```markdown
# On each phase change:
- Update SESSION_FILE Current Session → Phase
- Update SESSION_FILE Progress Tracker → Mark phase complete
- Post transition message: "Orchestrator → ALL: Moving to [PHASE]"
```

### 3. Session End
```markdown
# Orchestrator finalizes:
1. Update SESSION_FILE:
   - Set Status: ✅ COMPLETED
   - Verify all Acceptance Criteria checked
   - Write "For Next Session" notes if any work remains
2. Archive SESSION_FILE:
   - Move from: .claude/sessions/agents-{SESSION_ID}.md
   - Move to: .claude/history/agents-{SESSION_ID}.md
```

### 4. Session Resume
```markdown
# If continuing previous work:
- Check .claude/history/ for completed sessions
- Read "For Next Session" notes from previous session
- Create NEW session (new SESSION_ID) and reference previous session
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                              │
│  1. Generate SESSION_ID (YYYYMMDD-HHmmss-XXXX)                  │
│  2. Create SESSION_FILE from template                           │
│  3. Create plan → current_plan.md                               │
│  4. Pass SESSION_FILE path to all agents                        │
│  5. Monitor SESSION_FILE for progress/issues                    │
│  6. Coordinate phase transitions                                │
│  7. Archive SESSION_FILE to history/ on completion              │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   PLANNER   │  │  DEVELOPER  │  │  REVIEWER   │
│             │  │             │  │             │
│ 1. READ     │  │ 1. READ     │  │ 1. READ     │
│ SESSION_FILE│  │ SESSION_FILE│  │ SESSION_FILE│
│ 2. Plan     │  │ 2. Code     │  │ 2. Review   │
│ 3. WRITE    │  │ 3. WRITE    │  │ 3. WRITE    │
│ SESSION_FILE│  │ SESSION_FILE│  │ SESSION_FILE│
└─────────────┘  └─────────────┘  └─────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    SESSION_FILE     │
              │  (Shared Context)   │
              │                     │
              │ • Session State     │
              │ • Artifact Registry │
              │ • Decision Log      │
              │ • Communication     │
              │ • Progress Tracker  │
              │ • Error Log         │
              └─────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌───────────────────┐         ┌───────────────────┐
│ sessions/         │         │ history/          │
│ (Active Sessions) │  ──→    │ (Archived)        │
└───────────────────┘         └───────────────────┘
```

---

## 📌 Quick Reference: SESSION_FILE Sections

| Section | Updated By | Purpose |
|---------|------------|---------|
| Current Session | Orchestrator | Track workflow state |
| Mission Objective | Orchestrator | Store user request |
| Active Team | Orchestrator | List participating agents |
| Artifact Registry | All Developers | Track file changes |
| Decision Log | All Agents | Record important decisions |
| Communication | All Agents | Inter-agent messaging |
| Discovered Context | Planner, Developers | Share codebase findings |
| Progress Tracker | Orchestrator, Agents | Track task completion |
| Error Log | Reviewers | Document issues found |
| Handoff Notes | Developers → Reviewers | Transfer context |
| Session History | Orchestrator | Archive completed sessions |
