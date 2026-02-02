# TPML Operations Dashboard — Product Backlog

## Metadata

- **Project:** TPML Operations Dashboard
- **PM:** AI PM Role
- **Created:** January 31, 2025
- **Last Updated:** January 31, 2025
- **Status:** Planning

---

## MVP Definition

The minimum viable product delivers **business-friendly project creation** with real-time AI planning that mirrors the full PM → CTO workflow:

1. Owner submits project intake form (business questions only)
2. AI PM generates sprint breakdown and prioritized backlog
3. AI CTO produces technical architecture (invisible to owner unless requested)
4. Owner receives one-page summary for approval
5. Upon approval, project artifacts (BACKLOG.md, architecture docs, handoffs) are generated automatically
6. Project metadata and artifacts persist in database

This proves the core concept: the business owner describes a need in plain English, the AI team runs the complete planning workflow autonomously, and the owner approves a clear summary.

---

## Sprint Plan

### Sprint 1: Project Creation Flow (MVP)
**Duration:** 2 weeks
**Goal:** Owner can create a project and receive an AI-generated one-page summary

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| S1-1 | Project intake form | P0 | Form collects: name, client, problem statement, target users, key workflows, success criteria, constraints. No technical fields. |
| S1-2 | AI PM planning | P0 | Submitting intake triggers AI PM to generate: MVP definition, sprint breakdown, prioritized backlog with acceptance criteria. |
| S1-3 | AI CTO architecture | P0 | AI CTO receives PM output and generates: tech stack decisions, data model, integration design. Owner does not see this unless requested. |
| S1-4 | One-page summary display | P0 | Summary shows: what will be built, sprint plan, timeline, decisions needed. Business language only. Hides technical details. |
| S1-5 | Summary approval flow | P0 | Owner can approve, request revision, or reject. Status persists. |
| S1-6 | Artifact generation on approval | P0 | Upon approval, system generates BACKLOG.md, architecture docs, and CTO handoff — same artifacts produced manually today. |
| S1-7 | Project persistence | P0 | Projects stored in database with intake data, generated artifacts, and approval status. |
| S1-8 | Basic auth | P1 | Single-user authentication (owner only). |

**Sprint 1 Deliverable:** Working project creation flow that runs the full PM → CTO workflow automatically, deployed to Vercel.

---

### Sprint 2: Project Overview Dashboard + Conversational Continuity
**Duration:** 2 weeks
**Goal:** Owner sees all projects at a glance; AI team maintains context across sessions

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| S2-1 | Project list view | P0 | Shows all projects with name, client, status, current sprint. |
| S2-2 | Project detail view | P0 | Shows full project info, one-page summary, approval history. |
| S2-3 | Pending decisions widget | P0 | Dashboard highlights decisions awaiting owner input. |
| S2-4 | Conversation logging | P0 | All AI team interactions (planning, questions, reviews) are logged per project with timestamps and role attribution. |
| S2-5 | Context injection | P0 | When any AI role resumes work on a project, it receives relevant conversation history as context. Roles "remember" prior discussions. |
| S2-6 | Sprint progress display | P1 | Shows which sprint each project is in and completion status. |
| S2-7 | Recent activity feed | P2 | Shows last N actions across all projects (created, approved, etc.). |

**Sprint 2 Deliverable:** Owner can view all projects on one screen. AI team has conversational continuity — roles remember what was discussed.

---

### Sprint 3: Sprint Review Interface
**Duration:** 2 weeks
**Goal:** Owner can conduct conversational sprint debriefs and receive written status documents

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| S3-1 | Sprint debrief chat | P0 | Real-time conversational AI with project context loaded. Owner asks questions, gives direction. |
| S3-2 | Sprint status document | P0 | AI generates written summary: what was built, what's next, pending decisions, risks. |
| S3-3 | Document export | P1 | Status documents exportable as PDF or markdown. |
| S3-4 | Review history | P1 | Past sprint debriefs and documents accessible per project. |
| S3-5 | Milestone tracking | P2 | Mark and display key milestones per project. |

**Sprint 3 Deliverable:** Full sprint review workflow with chat and written documents.

---

## Future Backlog (Post-MVP)

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| F-1 | Knowledge base integration | P2 | New projects auto-scaffold in `tpml-core/knowledge/clients/` and `projects/` |
| F-2 | Multi-user support | P3 | Additional users with role-based access |
| F-3 | Email notifications | P3 | Notify owner of pending decisions, sprint completion |
| F-4 | QuickBooks integration | P3 | Link projects to invoices and time tracking |
| F-5 | Revision history | P2 | Track changes to plans and summaries over time |
| F-6 | Mobile view | P3 | Responsive design for phone/tablet |

---

## Prioritization Criteria

- **P0:** Must have for the sprint to be complete
- **P1:** Should have, included if time permits
- **P2:** Nice to have, defer if needed
- **P3:** Future consideration

---

## Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Claude API access | CTO | Available |
| Neon database provisioning | CTO | Pending |
| Vercel project setup | DevOps | Pending |
| Role prompt definitions | PM/CTO | Available in tpml-core |

---

## Open Questions for CTO/Architect

1. AI integration approach: direct Claude API calls vs. orchestration layer?
2. How to load role prompts (PM, CTO) dynamically from tpml-core?
3. Session management for conversational sprint debriefs
4. File generation approach for exportable documents
5. **Workflow orchestration:** How to chain PM → CTO calls so PM output feeds into CTO input? Sequential API calls or parallel with merge?
6. **Artifact storage:** Store generated BACKLOG.md and architecture docs in database as text, or generate files in a project directory?
7. **Conversation history design:** How much context to inject per role? Full history vs. summarized? Token limits? Per-project or per-sprint scoping?

---

## Changelog

| Date | Change | Changed By |
|------|--------|------------|
| 2025-01-31 | Initial backlog created | PM |
| 2025-01-31 | Added full PM → CTO workflow automation per owner feedback | PM |
| 2025-01-31 | Added conversational continuity to Sprint 2 (S2-4, S2-5) per owner feedback | PM |
