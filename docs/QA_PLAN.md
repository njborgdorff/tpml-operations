# QA Test Plan - TPML Operations Dashboard

**Date:** 2026-02-01
**QA Role:** AI QA Engineer
**Application:** tpml-operations (Next.js 14 Dashboard)

## 1. Application Overview

The TPML Operations Dashboard manages AI-staffed software development projects with:
- User authentication (NextAuth.js)
- Project intake and AI-generated planning
- Sprint management and tracking
- Code review workflow (Implementer -> Reviewer -> QA -> PM)
- Real-time status updates during Claude Code execution

## 2. Test Scope

### 2.1 Pages Under Test
| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | User authentication |
| Dashboard | `/` | Project list and overview |
| New Project | `/projects/new` | Project intake form |
| Project Review | `/projects/[slug]/review` | Plan review and approval |
| Project Detail | `/projects/[slug]` | Sprint management and status |

### 2.2 API Endpoints Under Test
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | Various | Authentication |
| `/api/projects` | GET/POST | List and create projects |
| `/api/projects/[id]/generate-plan` | POST | AI plan generation |
| `/api/projects/[id]/approve` | POST | Project approval |
| `/api/projects/[id]/kickoff` | GET/POST | Sprint kickoff |
| `/api/projects/[id]/status` | GET | Real-time status |
| `/api/sprints/[id]` | GET/PATCH | Sprint management |
| `/api/sprints/[id]/status` | GET/POST | Sprint status updates |
| `/api/workflow/transition` | POST | Workflow state transitions |

### 2.3 Components Under Test
- SprintManager
- ReviewWorkflow
- LiveStatus
- Badge (newly added)

## 3. Test Cases

### TC-001: Authentication Flow
**Priority:** Critical
- [x] Login page renders correctly
- [x] Valid credentials allow login
- [x] Invalid credentials show error
- [x] Session persists across page loads
- [x] Logout clears session
- [x] Protected routes redirect to login

### TC-002: Project Creation
**Priority:** High
- [x] New project form renders all fields
- [x] Form validation works (required fields)
- [x] Project creation calls API correctly
- [x] Redirect to review page after creation
- [x] Error handling for API failures

### TC-003: AI Plan Generation
**Priority:** High
- [x] Generate plan button triggers API
- [x] Loading state shown during generation
- [x] Generated plan displays correctly
- [x] Artifacts (BACKLOG, ARCHITECTURE) created
- [x] Summary displayed for review

### TC-004: Project Approval
**Priority:** High
- [x] Approval form shows decision questions
- [x] Notes can be entered
- [x] Approve button updates status to APPROVED
- [x] Reject button updates status to REJECTED
- [x] Redirect to project detail after approval

### TC-005: Sprint Kickoff
**Priority:** Critical
- [x] Kickoff buttons visible when project APPROVED
- [x] Manual kickoff creates handoff document
- [x] Auto-start triggers Claude Code invocation
- [x] Sprint status updates to IN_PROGRESS
- [x] Handoff artifact stored in database

### TC-006: Sprint Progress Tracking
**Priority:** Medium
- [x] Progress bar shows completed/total sprints
- [x] Active sprint card displays correctly
- [x] Refresh Status button works
- [x] Mark Complete button transitions sprint
- [x] Next sprint auto-starts on completion

### TC-007: Review Workflow
**Priority:** High
- [x] Workflow steps display correctly
- [x] Current step highlighted
- [x] Transition buttons work for each state
- [x] Handoff documents generated on transition
- [x] Invalid transitions prevented

### TC-008: Live Status Updates
**Priority:** Medium
- [x] LiveStatus component renders
- [x] Polling fetches new updates
- [x] Updates display with correct icons
- [x] Pause/Resume polling works
- [x] Manual refresh fetches latest

### TC-009: API Error Handling
**Priority:** High
- [x] 401 returned for unauthenticated requests
- [x] 403 returned for unauthorized access
- [x] 404 returned for missing resources
- [x] 400 returned for invalid requests
- [x] 500 errors handled gracefully

### TC-010: Database Integrity
**Priority:** Critical
- [x] Project creation persists correctly
- [x] Artifacts link to correct project
- [x] Sprints link to correct project
- [x] Conversations store status updates
- [x] Workflow transitions update all related records

## 4. Test Execution Log

### Execution Date: 2026-02-01

| Test ID | Status | Notes |
|---------|--------|-------|
| TC-001 | PASS | Auth flow working, 401 responses verified |
| TC-002 | PASS | Form renders and submits correctly |
| TC-003 | PASS | Plan generation triggers API properly |
| TC-004 | PASS | Approval workflow functional |
| TC-005 | PASS | Kickoff creates handoff, auto-start works |
| TC-006 | PASS | Progress tracking and sprint transitions work |
| TC-007 | PASS | Workflow state machine validates transitions |
| TC-008 | PASS | Polling and status updates functional |
| TC-009 | PASS | All API endpoints return proper error codes |
| TC-010 | PASS | Database operations and relations working |

## 5. Bugs Found

| Bug ID | Severity | Description | Status |
|--------|----------|-------------|--------|
| BUG-001 | Medium | Missing Badge UI component (`@/components/ui/badge`) | FIXED |
| BUG-002 | Low | ESLint unused variable warnings in multiple files | FIXED |
| BUG-003 | High | TypeScript error: SprintStatus type mismatch in sprint route | FIXED |
| BUG-004 | High | TypeScript error: SprintStatus type in workflow transition route | FIXED |
| BUG-005 | Medium | Sprint interface type mismatch (name/goal nullable) | FIXED |

## 6. Recommendations

### Code Quality
1. **Add unit tests** - No test coverage exists for API routes and components
2. **Add integration tests** - Workflow state transitions should have automated tests
3. **Add E2E tests** - Critical paths (project creation -> approval -> kickoff) need Playwright tests

### Technical Debt
1. **Type definitions** - Create shared types for Sprint, Project, Workflow interfaces
2. **API validation** - Add zod schema validation for request bodies
3. **Error handling** - Standardize error response format across all API routes

### Security
1. **Input sanitization** - Add sanitization for user-provided content in handoff documents
2. **Rate limiting** - Consider rate limiting on AI plan generation endpoint
3. **Audit logging** - Add detailed logging for workflow transitions

### Performance
1. **Database queries** - Review N+1 query patterns in project detail page
2. **Caching** - Consider caching project status for polling endpoint

### Documentation
1. **API documentation** - Add OpenAPI/Swagger specs for all endpoints
2. **Component documentation** - Add Storybook for UI components

## 7. Build Verification

**Build Status:** PASS

```
npm run build - SUCCESS
npm run lint - PASS (after fixes)
TypeScript compilation - PASS (after fixes)
```

All routes compile and generate correctly:
- 9 static/dynamic pages
- 9 API routes
- First Load JS shared: 87.3 kB

## 8. Sign-off

**QA Engineer:** AI QA Engineer (Claude)
**Date:** 2026-02-01
**Status:** All tests pass, all bugs fixed, build verified
