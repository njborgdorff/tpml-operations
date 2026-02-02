# Handoff: Business Owner → PM + CTO

## Project

TPML Operations Dashboard

## Date

January 31, 2025

## Handoff Type

New Project Intake — Business requirements defined, ready for technical planning.

---

## What the Business Owner Provided

The complete project brief is in `PROJECT_BRIEF.md`. Key points:

1. **Company-level operations dashboard** — command center for the AI-staffed organization
2. **Business-friendly project intake** — owner answers business questions, AI team generates technical plan, presents one-page summary for approval
3. **Sprint review interface** — conversational debrief (real-time AI chat) + written status document after each sprint
4. **Project overview** — all projects at a glance with status, milestones, pending decisions
5. **Real-time AI interaction** — Claude API called directly for plan generation and sprint debriefs
6. **Separate app** from tpml-marketing — new `tpml-operations` project

## What the Business Owner Explicitly Does NOT Want

- Technical questions during project creation
- Visibility into code, PRs, or architecture unless requested
- Task-level management (PM handles that)
- Approval of every decision (only business-level ones)

## Instructions for PM

1. Read the full `PROJECT_BRIEF.md`
2. Break this into sprints (suggest 1-2 week sprints)
3. Define an MVP — what's the minimum that delivers value for Sprint 1?
4. Create a `BACKLOG.md` with prioritized features
5. Identify what business decisions you need from the owner before starting
6. Hand off to Architect/CTO for technical planning

**MVP suggestion from business context:** The project creation flow is the highest value feature. If the owner can create a project and get back a one-page summary, that proves the concept. Sprint review and project overview can follow.

## Instructions for CTO / Architect

1. Read the full `PROJECT_BRIEF.md`
2. Make all technical decisions autonomously — do not ask the business owner about frameworks, databases, hosting, or architecture
3. Reference `../../tpml-core/standards/TECH_STACK.md` for TPML's standard stack
4. Reference `../../tpml-core/knowledge/decisions/` for past technical decisions
5. Create an architecture document covering:
   - Tech stack selection (with rationale in an ADR)
   - Data model (projects, sprints, reviews, intake forms)
   - AI integration approach (Claude API for real-time plan generation and sprint debriefs)
   - How this connects to the existing tpml-core framework (roles, knowledge base)
6. Design the project intake → AI processing → summary generation pipeline
7. Design the sprint review conversation + document generation flow
8. Hand off to Implementer with a complete technical spec

## Key Technical Considerations (for CTO, not business owner)

- **AI Integration:** The dashboard calls Claude API directly. For project intake, it needs to take business inputs, invoke PM + CTO role prompts, and return a structured one-page summary. For sprint debriefs, it needs conversational AI with project context loaded.
- **Knowledge Base Integration:** New projects created on the dashboard should generate corresponding entries in `tpml-core/knowledge/clients/` and scaffold a project directory in `projects/`.
- **Role Context:** When the AI generates a technical plan, it should use the actual PM and CTO role definitions from `tpml-core/roles/` as system prompts.
- **State Management:** Sprint status, review history, and project metadata need to persist in a database. The conversational debrief needs to maintain context within a session.
- **File Generation:** The one-page summary and sprint status documents should be downloadable/exportable.

## Deliverable to Business Owner

Before writing any code, produce a **one-page summary** covering:
1. What will be built (in business terms)
2. Proposed sprint plan (number of sprints, what each delivers)
3. Timeline estimate
4. Any business decisions needed before starting
5. What the owner will see after Sprint 1

Present this for approval. Do not begin implementation until approved.

---

## Knowledge Base Updates Required

After technical planning is complete:
- [ ] Add decision entry: `knowledge/decisions/YYYY-MM-DD-tpml-operations-architecture.md`
- [ ] Update client entry: `knowledge/clients/tpml-internal.md` with new project
- [ ] Add any lessons from planning to `knowledge/lessons/`
