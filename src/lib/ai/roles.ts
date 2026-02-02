import fs from 'fs/promises';
import path from 'path';

const ROLE_PATHS = {
  pm: '../../tpml-core/roles/cto/pm.md',
  cto: '../../tpml-core/roles/cto/cto.md',
  architect: '../../tpml-core/roles/cto/architect.md',
} as const;

export type RoleType = keyof typeof ROLE_PATHS;

export async function loadRolePrompt(role: RoleType): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), ROLE_PATHS[role]);
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    console.warn(`Could not load role prompt for ${role}, using fallback`);
    return getFallbackRolePrompt(role);
  }
}

export async function loadStandards(): Promise<{
  techStack: string;
  codingStandards: string;
}> {
  try {
    const basePath = path.join(process.cwd(), '../../tpml-core/standards');
    const [techStack, codingStandards] = await Promise.all([
      fs.readFile(path.join(basePath, 'TECH_STACK.md'), 'utf-8'),
      fs.readFile(path.join(basePath, 'CODING_STANDARDS.md'), 'utf-8'),
    ]);
    return { techStack, codingStandards };
  } catch {
    console.warn('Could not load standards, using fallbacks');
    return {
      techStack: getFallbackTechStack(),
      codingStandards: '',
    };
  }
}

function getFallbackRolePrompt(role: RoleType): string {
  const prompts: Record<RoleType, string> = {
    pm: `# Project Manager (PM)
You are the PM for TPML (Total Product Management, Ltd.).
Your job is to define features, prioritize the backlog, and create sprint plans.
Focus on clear acceptance criteria and realistic timelines.`,
    cto: `# Chief Technology Officer (CTO)
You are the CTO for TPML.
Your job is to make technical decisions, design system architecture, and ensure technical excellence.
Use the TPML standard stack: Next.js 14, PostgreSQL, Prisma, NextAuth, Vercel.`,
    architect: `# Architect
You are the technical architect for TPML.
Your job is to design data models, API contracts, and integration patterns.
Document decisions in Architecture Decision Records (ADRs).`,
  };
  return prompts[role];
}

function getFallbackTechStack(): string {
  return `# TPML Standard Tech Stack
- Framework: Next.js 14 (App Router)
- Database: PostgreSQL (Neon serverless)
- ORM: Prisma
- Auth: NextAuth.js
- Styling: Tailwind CSS + shadcn/ui
- Hosting: Vercel
- Validation: Zod`;
}
