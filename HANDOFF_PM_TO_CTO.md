# Handoff: PM → CTO / Architect

## Project

TPML Operations Dashboard

## Date

January 31, 2025

## Handoff Type

Technical Planning — Product requirements defined, ready for architecture.

---

## What the PM Defined

### MVP Scope (Sprint 1)

Business-friendly project creation that runs the **full PM → CTO workflow automatically**:

1. **Project intake form** — Collects business-only fields: name, client, problem statement, target users, key workflows, success criteria, constraints
2. **AI PM planning** — Claude API call using PM role prompt to generate: MVP definition, sprint breakdown, prioritized backlog with acceptance criteria
3. **AI CTO architecture** — Claude API call using CTO role prompt (receives PM output) to generate: tech stack decisions, data model, integration design. Hidden from owner unless requested.
4. **One-page summary display** — Shows what will be built, sprint plan, timeline, decisions needed (business language only)
5. **Approval flow** — Owner approves, requests revision, or rejects
6. **Artifact generation on approval** — System generates BACKLOG.md, architecture docs, and handoff documents automatically
7. **Persistence** — Projects stored with intake data, generated artifacts, approval status
8. **Basic auth** — Single-user (owner only)

**Key enhancement:** The dashboard replicates what we did manually for this project — the full PM → CTO handoff workflow runs automatically when the owner creates a project.

### Full Backlog

See `BACKLOG.md` for complete sprint plan (3 sprints, 6 weeks) and future backlog.

### Business Constraints (from PROJECT_BRIEF.md)

- Separate app from tpml-marketing
- Deployable to Vercel
- Integrates with existing tpml-core framework (roles, knowledge base)
- Single user initially
- Real-time AI response (target: under 90 seconds for plan generation)

---

## Instructions for CTO / Architect

Per `HANDOFF_OWNER_TO_PM_CTO.md`, the CTO should:

1. **Make all technical decisions autonomously** — Do not ask the business owner about frameworks, databases, hosting, or architecture
2. **Reference TPML standards:**
   - `../../tpml-core/standards/TECH_STACK.md` — Standard stack (Next.js 14, PostgreSQL/Neon, Prisma, etc.)
   - `../../tpml-core/standards/CODING_STANDARDS.md`
   - `../../tpml-core/standards/GIT_WORKFLOW.md`
3. **Create architecture documentation:**
   - Tech stack selection (should align with TECH_STACK.md unless deviation required)
   - Data model (projects, sprints, reviews, intake forms)
   - AI integration approach (Claude API for real-time plan generation)
   - Connection to tpml-core framework
4. **Design key pipelines:**
   - Project intake → AI processing → summary generation
   - Sprint review conversation + document generation (Sprint 3)
5. **Document via ADR** any deviations from standard stack

---

## Technical Questions from PM

These are for CTO consideration, not business owner:

1. **AI integration:** Direct Claude API calls vs. orchestration layer (e.g., LangChain, custom)? Need to load role prompts from tpml-core dynamically.

2. **Role prompt injection:** How to structure the system prompt so PM + CTO role definitions are included when generating project plans?

3. **Workflow orchestration:** How to chain PM → CTO calls? Options:
   - Sequential: PM call completes, output feeds into CTO call
   - Parallel with merge: Both run simultaneously, merge results
   - Single call with combined prompt: One API call with both roles

4. **Session management:** Sprint debrief chat needs conversational context within a session. How to manage this — database storage, in-memory, or Claude's conversation API?

5. **Document generation:** One-page summaries and sprint status docs need to be exportable. PDF generation approach?

6. **Artifact storage:** Where to store generated BACKLOG.md, architecture docs, handoffs?
   - Database as text/JSON (queryable, portable)
   - File system in a project directory (matches current manual workflow)
   - Both (database is source of truth, can export to files)

7. **Knowledge base integration (future):** Eventually, new projects should scaffold entries in `tpml-core/knowledge/`. Design with this in mind.

---

## Data Model Considerations

Suggested entities (Architect to finalize):

| Entity | Key Fields |
|--------|------------|
| Project | id, name, clientId, status, intakeData (JSON), generatedPlan, approvalStatus |
| Client | id, name, metadata |
| Sprint | id, projectId, number, status, startDate, endDate |
| SprintReview | id, sprintId, conversationHistory, statusDocument |
| User | id, email, role (owner only for MVP) |

---

## Definition of Done for Architecture Phase

- [ ] ADR documenting tech stack decisions
- [ ] Data model / schema design
- [ ] AI integration design (prompts, API calls, response handling)
- [ ] Component architecture (pages, API routes)
- [ ] Ready to hand off to Implementer with clear spec

---

## Approval Status

**Approved by business owner** on January 31, 2025 with enhancement: the dashboard must run the full PM → CTO workflow automatically (same workflow we did manually for this project).

CTO can proceed with technical architecture.

---

## Changelog

| Date | Change | Changed By |
|------|--------|------------|
| 2025-01-31 | Initial handoff created | PM |
| 2025-01-31 | Added full PM → CTO workflow automation requirement per owner approval | PM |
