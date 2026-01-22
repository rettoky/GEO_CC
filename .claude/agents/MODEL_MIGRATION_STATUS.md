# Agent Model Migration Status

## 작업 개요

모든 에이전트 파일의 기본 모델을 `sonnet`에서 `opus`로 변경하는 작업입니다.

### 수정 방법

각 에이전트 `.md` 파일의 YAML 프론트매터에서 `tools:` 줄 다음에 `model: opus`를 추가합니다.

**수정 전:**
```yaml
---
name: agent-name
description: Agent description
tools: Read, Write, Edit, Bash, Glob, Grep
---
```

**수정 후:**
```yaml
---
name: agent-name
description: Agent description
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---
```

---

## 폴더별 진행 상황

### 1. 01-core-development (완료)

| 파일명 | 상태 |
|--------|------|
| api-designer.md | 완료 |
| backend-developer.md | 완료 |
| electron-pro.md | 완료 |
| frontend-developer.md | 완료 |
| fullstack-developer.md | 완료 |
| graphql-architect.md | 완료 |
| microservices-architect.md | 완료 |
| mobile-developer.md | 완료 |
| ui-designer.md | 완료 |
| websocket-engineer.md | 완료 |

---

### 2. 02-language-specialists (완료)

| 파일명 | 상태 |
|--------|------|
| angular-architect.md | 완료 |
| cpp-pro.md | 완료 |
| csharp-developer.md | 완료 |
| django-developer.md | 완료 |
| dotnet-core-expert.md | 완료 |
| dotnet-framework-4.8-expert.md | 완료 |
| elixir-expert.md | 완료 |
| flutter-expert.md | 완료 |
| golang-pro.md | 완료 |
| java-architect.md | 완료 |
| javascript-pro.md | 완료 |
| kotlin-specialist.md | 완료 |
| laravel-specialist.md | 완료 |
| nextjs-developer.md | 완료 |
| php-pro.md | 완료 |
| powershell-5.1-expert.md | 완료 |
| powershell-7-expert.md | 완료 |
| python-pro.md | 완료 |
| rails-expert.md | 완료 |
| react-specialist.md | 완료 |
| rust-engineer.md | 완료 |
| spring-boot-engineer.md | 완료 |
| sql-pro.md | 완료 |
| swift-expert.md | 완료 |
| typescript-pro.md | 완료 |
| vue-expert.md | 완료 |

---

### 3. 03-infrastructure (완료)

| 파일명 | 상태 |
|--------|------|
| azure-infra-engineer.md | 완료 |
| cloud-architect.md | 완료 |
| database-administrator.md | 완료 |
| deployment-engineer.md | 완료 |
| devops-engineer.md | 완료 |
| devops-incident-responder.md | 완료 |
| incident-responder.md | 완료 |
| kubernetes-specialist.md | 완료 |
| network-engineer.md | 완료 |
| platform-engineer.md | 완료 |
| security-engineer.md | 완료 |
| sre-engineer.md | 완료 |
| terraform-engineer.md | 완료 |
| windows-infra-admin.md | 완료 |

---

### 4. 04-quality-security (완료)

| 파일명 | 상태 |
|--------|------|
| accessibility-tester.md | 완료 |
| ad-security-reviewer.md | 완료 |
| architect-reviewer.md | 완료 |
| chaos-engineer.md | 완료 |
| code-reviewer.md | 완료 |
| compliance-auditor.md | 완료 |
| debugger.md | 완료 |
| error-detective.md | 완료 |
| penetration-tester.md | 완료 |
| performance-engineer.md | 완료 |
| powershell-security-hardening.md | 완료 |
| qa-expert.md | 완료 |
| security-auditor.md | 완료 |
| test-automator.md | 완료 |

---

### 5. 05-data-ai (완료)

| 파일명 | 상태 |
|--------|------|
| ai-engineer.md | 완료 |
| data-analyst.md | 완료 |
| data-engineer.md | 완료 |
| data-scientist.md | 완료 |
| database-optimizer.md | 완료 |
| llm-architect.md | 완료 |
| machine-learning-engineer.md | 완료 |
| ml-engineer.md | 완료 |
| mlops-engineer.md | 완료 |
| nlp-engineer.md | 완료 |
| postgres-pro.md | 완료 |
| prompt-engineer.md | 완료 |

---

### 6. 06-developer-experience (완료)

| 파일명 | 상태 |
|--------|------|
| build-engineer.md | 완료 |
| cli-developer.md | 완료 |
| dependency-manager.md | 완료 |
| documentation-engineer.md | 완료 |
| dx-optimizer.md | 완료 |
| git-workflow-manager.md | 완료 |
| legacy-modernizer.md | 완료 |
| mcp-developer.md | 완료 |
| powershell-module-architect.md | 완료 |
| powershell-ui-architect.md | 완료 |
| refactoring-specialist.md | 완료 |
| slack-expert.md | 완료 |
| tooling-engineer.md | 완료 |

---

### 7. 07-specialized-domains (완료)

| 파일명 | 상태 |
|--------|------|
| api-documenter.md | 완료 |
| blockchain-developer.md | 완료 |
| embedded-systems.md | 완료 |
| fintech-engineer.md | 완료 |
| game-developer.md | 완료 |
| iot-engineer.md | 완료 |
| m365-admin.md | 완료 |
| mobile-app-developer.md | 완료 |
| payment-integration.md | 완료 |
| quant-analyst.md | 완료 |
| risk-manager.md | 완료 |
| seo-specialist.md | 완료 |

---

### 8. 08-business-product (완료)

| 파일명 | 상태 |
|--------|------|
| business-analyst.md | 완료 |
| content-marketer.md | 완료 |
| customer-success-manager.md | 완료 |
| legal-advisor.md | 완료 |
| product-manager.md | 완료 |
| project-manager.md | 완료 |
| sales-engineer.md | 완료 |
| scrum-master.md | 완료 |
| technical-writer.md | 완료 |
| ux-researcher.md | 완료 |
| wordpress-master.md | 완료 |

---

### 9. 09-meta-orchestration (완료)

| 파일명 | 상태 |
|--------|------|
| agent-organizer.md | 완료 |
| context-manager.md | 완료 |
| error-coordinator.md | 완료 |
| it-ops-orchestrator.md | 완료 |
| knowledge-synthesizer.md | 완료 |
| multi-agent-coordinator.md | 완료 |
| performance-monitor.md | 완료 |
| task-distributor.md | 완료 |
| workflow-orchestrator.md | 완료 |

---

### 10. 10-research-analysis (완료)

| 파일명 | 상태 |
|--------|------|
| competitive-analyst.md | 완료 |
| data-researcher.md | 완료 |
| market-researcher.md | 완료 |
| research-analyst.md | 완료 |
| search-specialist.md | 완료 |
| trend-analyst.md | 완료 |

---

## 요약

| 폴더 | 총 파일 수 | 완료 | 미완료 | 상태 |
|------|-----------|------|--------|------|
| 01-core-development | 10 | 10 | 0 | 완료 |
| 02-language-specialists | 26 | 26 | 0 | 완료 |
| 03-infrastructure | 14 | 14 | 0 | 완료 |
| 04-quality-security | 14 | 14 | 0 | 완료 |
| 05-data-ai | 12 | 12 | 0 | 완료 |
| 06-developer-experience | 13 | 13 | 0 | 완료 |
| 07-specialized-domains | 12 | 12 | 0 | 완료 |
| 08-business-product | 11 | 11 | 0 | 완료 |
| 09-meta-orchestration | 9 | 9 | 0 | 완료 |
| 10-research-analysis | 6 | 6 | 0 | 완료 |
| **총계** | **127** | **127** | **0** | **100% 완료** |

---

## 남은 작업

**모든 작업이 완료되었습니다.**

---

## 참고 사항

- 각 폴더의 `README.md` 파일은 에이전트 정의가 아니므로 수정 대상에서 제외
- 모든 에이전트에 `model: opus`가 추가됨

---

**마지막 업데이트:** 2026-01-09