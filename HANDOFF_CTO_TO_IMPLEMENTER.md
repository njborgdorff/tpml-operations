# Handoff: CTO → Implementer

## Project

TPML Operations Dashboard

## Date

January 31, 2025

## Handoff Type

Sprint 1 Implementation — Architecture complete, ready to build.

---

## Sprint 1 Scope

Build the project creation flow with automated AI planning.

### User Flow

```
Owner logs in
    ↓
Owner clicks "New Project"
    ↓
Owner fills intake form (business questions)
    ↓
Owner submits → AI processes (60-90 sec) → Summary displayed
    ↓
Owner reviews summary → Approves / Requests Revision / Rejects
    ↓
On approval → Artifacts generated and stored
```

### Features to Implement

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| S1-1 | Project intake form | P0 | See `IntakeSchema` in ARCHITECTURE.md |
| S1-2 | AI PM planning | P0 | Sequential Claude API calls |
| S1-3 | AI CTO architecture | P0 | Receives PM output |
| S1-4 | One-page summary | P0 | Markdown display |
| S1-5 | Approval flow | P0 | Approve/Revision/Reject |
| S1-6 | Artifact generation | P0 | Generate BACKLOG.md on approval |
| S1-7 | Project persistence | P0 | Prisma schema defined |
| S1-8 | Basic auth | P1 | NextAuth credentials |

---

## Technical Specification

### Reference Documents

1. `ARCHITECTURE.md` — Full technical spec including:
   - Prisma schema (copy to `prisma/schema.prisma`)
   - Application structure
   - AI workflow code
   - API route implementations
   - Type definitions

2. `BACKLOG.md` — Acceptance criteria for each feature

3. `tpml-core/standards/CODING_STANDARDS.md` — Code style requirements

4. `tpml-core/standards/TECH_STACK.md` — Dependencies and versions

### Setup Steps

1. **Initialize Project**
   ```bash
   npx create-next-app@14 tpml-operations --typescript --tailwind --eslint --app --src-dir
   cd tpml-operations
   ```

2. **Install Dependencies**
   ```bash
   npm install @prisma/client @anthropic-ai/sdk next-auth zod
   npm install -D prisma
   npx shadcn-ui@latest init
   ```

3. **Setup Database**
   - Create Neon project for tpml-operations
   - Copy schema from ARCHITECTURE.md to `prisma/schema.prisma`
   - Run `npx prisma migrate dev --name init`

4. **Configure Environment**
   ```bash
   # .env.local
   DATABASE_URL="postgresql://..."
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="$(openssl rand -base64 32)"
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

5. **Build Core Components**
   - Follow structure in ARCHITECTURE.md
   - Start with auth, then intake form, then AI workflow

### Key Implementation Notes

1. **AI Workflow:**
   - Load role prompts from filesystem (relative path to tpml-core)
   - Parse JSON responses carefully (Claude may add markdown formatting)
   - Log all AI calls to `conversations` table for continuity

2. **Form Handling:**
   - Use React Hook Form + Zod resolver
   - Multi-section form with clear field labels
   - No technical fields visible to user

3. **Processing UX:**
   - Show progress indicator during 60-90 second AI processing
   - Consider polling or streaming for status updates
   - Handle errors gracefully with retry option

4. **Artifact Generation:**
   - Generate markdown matching manual format
   - Store in database, provide download endpoint
   - Include metadata (generated date, version)

---

## Acceptance Criteria Summary

### Intake Form
- [ ] Form has all fields from IntakeSchema
- [ ] Validation errors display inline
- [ ] No technical questions visible
- [ ] Submit creates project with status INTAKE

### AI Processing
- [ ] Processing completes within 90 seconds
- [ ] PM plan stored in database
- [ ] CTO architecture stored in database
- [ ] Summary generated in business language
- [ ] Conversations logged for continuity

### Summary Review
- [ ] Summary displays as formatted markdown
- [ ] Approve button → status APPROVED, artifacts generated
- [ ] Revision button → status REVISION_REQUESTED, owner can add notes
- [ ] Reject button → status REJECTED

### Artifacts
- [ ] BACKLOG.md generated on approval
- [ ] ARCHITECTURE.md generated on approval
- [ ] Artifacts downloadable from project detail page

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] TypeScript strict mode, no `any`
- [ ] Passes ESLint with TPML config
- [ ] Unit tests for AI workflow orchestration
- [ ] Manual testing on local environment
- [ ] Ready for Reviewer handoff

---

## Escalation Path

- **Blocked on AI response issues:** CTO
- **Unclear requirements:** PM
- **Infrastructure issues:** DevOps

---

## Changelog

| Date | Change | Changed By |
|------|--------|------------|
| 2025-01-31 | Initial handoff created | CTO |
