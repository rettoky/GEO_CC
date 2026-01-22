# 🤖 Multi-Agent Shared Context

> **이 파일은 에이전트 간 데이터 공유를 위한 중앙 허브입니다.**
> 모든 에이전트는 작업 시작 전 이 파일을 읽고, 중요한 결과를 기록해야 합니다.

---

## 📋 Current Session

| Field | Value |
|-------|-------|
| **Session ID** | `{SESSION_ID}` |
| **Started** | `{DATETIME}` |
| **Status** | `🟢 ACTIVE` |
| **Current Phase** | `PLANNING` |
| **Iteration** | `1 of 3` |

---

## 🎯 Mission Objective

```
{USER_REQUEST}
```

### Acceptance Criteria
- [ ] {CRITERION_1}
- [ ] {CRITERION_2}
- [ ] {CRITERION_3}

---

## 👥 Active Team

| Role | Agent | Status | Assigned Task |
|------|-------|--------|---------------|
| 🧠 Planner | `{PLANNER_AGENT}` | ⏳ Waiting | {TASK} |
| 🛠️ Developer | `{DEV_AGENT_1}` | ⏳ Waiting | {TASK} |
| 🛠️ Developer | `{DEV_AGENT_2}` | ⏳ Waiting | {TASK} |
| 🔍 Reviewer | `{REVIEWER_AGENT}` | ⏸️ Pending | {TASK} |

---

## 📁 Artifact Registry

> 각 에이전트가 생성/수정한 파일을 여기에 등록합니다.

### Created Files
| File Path | Created By | Purpose | Status |
|-----------|------------|---------|--------|
| - | - | - | - |

### Modified Files
| File Path | Modified By | Changes Summary |
|-----------|-------------|-----------------|
| - | - | - |

### Dependencies
| File | Depends On | Provided By |
|------|-----------|-------------|
| - | - | - |

---

## 📝 Decision Log

> 워크플로우 중 내린 중요한 결정사항을 기록합니다.

### Architecture Decisions

| ID | Decision | Rationale | Made By | Date |
|----|----------|-----------|---------|------|
| - | - | - | - | - |

### Trade-offs Considered

| Option A | Option B | Chosen | Reason |
|----------|----------|--------|--------|
| - | - | - | - |

---

## 💬 Agent Communication

> 에이전트 간 메시지 전달용 큐입니다.

### Messages

```
{MESSAGES_WILL_BE_ADDED_HERE}
```

### Blocking Issues

| Issue | Reported By | Blocking | Resolution |
|-------|-------------|----------|------------|
| - | - | - | - |

---

## 🔍 Discovered Context

> 작업 중 발견한 중요한 코드베이스 정보입니다.

### Existing Patterns
```typescript
{DISCOVERED_PATTERNS}
```

### Related Files Found
- {FILE_1}
- {FILE_2}

### Important Constraints
- ⚠️ RLS 정책 필수: 모든 테이블은 companyId 기반 격리
- ⚠️ TypeScript strict mode 활성화
- ⚠️ `pnpm dev` 실행 금지 - 사용자가 이미 실행 중

---

## 📊 Progress Tracker

### Phase 1: Planning ⏸️
- [ ] Analyze user request
- [ ] Select agent team
- [ ] Create execution plan
- [ ] Save plan to `current_plan.md`

### Phase 2: Development ⏸️
- [ ] {TASK_2_1}
- [ ] {TASK_2_2}
- [ ] {TASK_2_3}

### Phase 3: Review ⏸️
- [ ] Code review
- [ ] Security audit
- [ ] Performance check
- [ ] Type check (`pnpm type-check`)

### Phase 4: Integration ⏸️
- [ ] Run build (`pnpm build`)
- [ ] Final verification
- [ ] Present changes to user

---

## 🚨 Error Log

| Timestamp | Agent | Error | Status | Resolution |
|-----------|-------|-------|--------|------------|
| - | - | - | - | - |

---

## 📌 Handoff Notes

> 다음 에이전트에게 전달할 컨텍스트입니다.

### For Reviewers
```
{HANDOFF_NOTES_FOR_REVIEWERS}
```

### For Next Session
```
{HANDOFF_NOTES_FOR_NEXT_SESSION}
```

---

## 🔄 Session History

| Session | Date | Objective | Status | Key Outcomes |
|---------|------|-----------|--------|--------------|
| - | - | - | - | - |

---

> **⚠️ Agent Protocol:**
> 1. **READ** this file at task start
> 2. **UPDATE** relevant sections during work
> 3. **LOG** important decisions and discoveries
> 4. **COMMUNICATE** via Messages section
> 5. **REGISTER** all created/modified files
