# Project Brief: TPML Operations Dashboard

## Business Owner

Nick Borgdorff — Human Leadership

## Date

January 31, 2025

---

## Problem Statement

TPML operates with an AI-staffed organization managing software projects for portfolio companies. Currently, creating a new project requires the business owner to participate in technical discussions — choosing frameworks, defining database schemas, configuring infrastructure. The business owner should only need to describe the business need and make business decisions. The AI team should handle all technical details autonomously.

There is also no central place to see what's happening across all projects, review sprint progress, or give direction to the AI team without opening Claude Code sessions.

## What I Need

A company-level dashboard that serves as my command center for running the AI-staffed organization. Specifically:

### 1. Project Creation (Business-Friendly Intake)

I want to create a new project by answering business questions only:
- What's the project name?
- Who's the client?
- What business problem does this solve?
- Who are the target users?
- What are the key workflows? (plain English, e.g. "customers place orders, admin approves accounts")
- What does success look like?
- Any timeline or budget constraints?

After I submit this, the AI team (PM + CTO) should generate a complete technical plan and present me a **one-page summary** that I can approve or send back for revision. I should not see architecture diagrams, database schemas, or framework choices unless I ask — just a clear summary of what will be built, how long it will take, and what decisions need my input.

The AI interaction should happen in real time — I submit the intake, wait a minute, and get the summary back on screen.

### 2. Sprint Reviews

After each sprint, I want two things:
- A **conversational debrief** — I can ask questions, give direction, raise concerns, and the AI team responds in context
- A **written status document** — summary of what was built, what's next, what decisions are pending, any risks or blockers

I want to be consulted after each sprint, not just informed. The debrief should feel like a meeting with my team, not a report I read.

### 3. Project Overview

At a glance, I want to see:
- All active projects and their current status
- Which sprint each project is in
- Upcoming milestones
- Decisions waiting for me
- Recent activity across the AI team

## What I Don't Need

- I don't need to manage individual tasks or assign work — the PM does that
- I don't need to see code, PRs, or technical artifacts unless I ask
- I don't need to configure infrastructure or choose tools — the CTO does that
- I don't need to approve every decision — only business-level ones

## Clients / Projects This Will Manage

- SBE Medical, Inc. — Order portal (existing, active)
- TPML Marketing Platform (existing, active)
- Future portfolio company projects

## Success Criteria

1. I can create a new project in under 5 minutes by answering business questions
2. The AI team generates a technical plan without my involvement
3. I receive a clear one-page summary for approval
4. After each sprint, I get a debrief and written status
5. I can see all projects and their status on one screen
6. I never have to answer technical questions to get a project started

## Constraints

- Must integrate with the existing TPML AI team framework (roles, knowledge base, CLAUDE.md)
- Uses Claude API for real-time AI interactions on the dashboard
- Should be deployable to Vercel
- Must be a separate application from the marketing platform
- Single user for now (me) — multi-user can come later
