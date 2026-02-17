# TPML Worker Service Architecture

## Overview

A dedicated worker service that runs Claude Code sessions for actual code implementation. The worker runs on a VPS (DigitalOcean Droplet) and integrates with the existing Vercel + Inngest infrastructure.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TPML Operations                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────────┐ │
│  │   Vercel     │    │   Inngest    │    │   DigitalOcean Droplet     │ │
│  │  Dashboard   │    │    Cloud     │    │       (Worker)             │ │
│  │              │    │              │    │                            │ │
│  │ ┌──────────┐ │    │  ┌────────┐  │    │  ┌──────────────────────┐  │ │
│  │ │ Next.js  │ │───▶│  │ Events │  │───▶│  │  Worker Service      │  │ │
│  │ │ Dashboard│ │    │  │ Queue  │  │    │  │  (Node.js + Inngest) │  │ │
│  │ └──────────┘ │    │  └────────┘  │    │  └──────────┬───────────┘  │ │
│  │              │    │              │    │             │              │ │
│  │ ┌──────────┐ │    │  ┌────────┐  │    │  ┌──────────▼───────────┐  │ │
│  │ │ API      │ │◀───│  │Results │  │◀───│  │  Claude Code CLI     │  │ │
│  │ │ Routes   │ │    │  │        │  │    │  │  (Authenticated)     │  │ │
│  │ └──────────┘ │    │  └────────┘  │    │  └──────────┬───────────┘  │ │
│  │              │    │              │    │             │              │ │
│  └──────────────┘    └──────────────┘    │  ┌──────────▼───────────┐  │ │
│                                          │  │  Project Repos       │  │ │
│                                          │  │  /projects/*         │  │ │
│                                          │  └──────────────────────┘  │ │
│                                          │                            │ │
│                                          └────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Event Flow

### 1. Implementation Request Flow

```
Dashboard                  Inngest                    Worker
    │                         │                          │
    │  kickoff project        │                          │
    ├────────────────────────▶│                          │
    │                         │                          │
    │                         │  implementation/start    │
    │                         ├─────────────────────────▶│
    │                         │                          │
    │                         │                          │ Run Claude Code
    │                         │                          │ in project dir
    │                         │                          │
    │                         │  implementation/progress │
    │                         │◀─────────────────────────┤ (streaming)
    │                         │                          │
    │                         │  implementation/complete │
    │                         │◀─────────────────────────┤
    │                         │                          │
    │  update sprint status   │                          │
    │◀────────────────────────┤                          │
    │                         │                          │
```

### 2. Review Request Flow

```
Dashboard                  Inngest                    Worker
    │                         │                          │
    │                         │  review/start            │
    │                         ├─────────────────────────▶│
    │                         │                          │
    │                         │                          │ Run Claude Code
    │                         │                          │ (review mode)
    │                         │                          │
    │                         │  review/complete         │
    │                         │◀─────────────────────────┤
    │                         │  {approved: bool,        │
    │                         │   feedback: string}      │
    │                         │                          │
```

## Inngest Events

### Events Sent TO Worker

```typescript
// Request implementation
{
  name: 'worker/implementation.start',
  data: {
    projectId: string;
    projectSlug: string;
    projectPath: string;
    sprintNumber: number;
    sprintName: string;
    handoffContent: string;
    backlogContent: string;
    architectureContent: string;
    gitRepo?: string;
    gitBranch?: string;
  }
}

// Request code review
{
  name: 'worker/review.start',
  data: {
    projectId: string;
    projectPath: string;
    sprintNumber: number;
    implementationSummary: string;
    prUrl?: string;
  }
}

// Request QA testing
{
  name: 'worker/qa.start',
  data: {
    projectId: string;
    projectPath: string;
    sprintNumber: number;
    implementationSummary: string;
    reviewSummary: string;
  }
}
```

### Events Sent FROM Worker

```typescript
// Progress update (streaming)
{
  name: 'worker/progress',
  data: {
    projectId: string;
    role: 'Implementer' | 'Reviewer' | 'QA';
    status: 'running' | 'waiting' | 'writing';
    message: string;
    outputChunk?: string;
  }
}

// Implementation complete
{
  name: 'worker/implementation.complete',
  data: {
    projectId: string;
    success: boolean;
    summary: string;
    filesChanged: string[];
    commitSha?: string;
    prUrl?: string;
    error?: string;
    duration: number;
  }
}

// Review complete
{
  name: 'worker/review.complete',
  data: {
    projectId: string;
    approved: boolean;
    feedback: string;
    issues?: string[];
    duration: number;
  }
}

// QA complete
{
  name: 'worker/qa.complete',
  data: {
    projectId: string;
    passed: boolean;
    testResults: string;
    bugs?: string[];
    duration: number;
  }
}
```

## Worker Service Structure

```
tpml-worker/
├── package.json
├── tsconfig.json
├── .env
├── src/
│   ├── index.ts              # Main entry, starts Inngest serve
│   ├── inngest/
│   │   ├── client.ts         # Inngest client config
│   │   ├── functions/
│   │   │   ├── implementation.ts  # Handle implementation requests
│   │   │   ├── review.ts          # Handle review requests
│   │   │   └── qa.ts              # Handle QA requests
│   ├── claude/
│   │   ├── invoke.ts         # Claude Code CLI wrapper
│   │   ├── prompts.ts        # Role-specific prompts
│   │   └── parser.ts         # Parse Claude output
│   ├── git/
│   │   ├── clone.ts          # Clone/pull repos
│   │   ├── commit.ts         # Commit changes
│   │   └── pr.ts             # Create PRs
│   └── utils/
│       ├── logger.ts
│       └── config.ts
└── projects/                 # Cloned project repos
    ├── project-a/
    ├── project-b/
    └── ...
```

## Worker Service Implementation

### Main Entry (src/index.ts)

```typescript
import express from 'express';
import { serve } from 'inngest/express';
import { inngest } from './inngest/client';
import { handleImplementation } from './inngest/functions/implementation';
import { handleReview } from './inngest/functions/review';
import { handleQA } from './inngest/functions/qa';

const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inngest endpoint
app.use('/api/inngest', serve({
  client: inngest,
  functions: [
    handleImplementation,
    handleReview,
    handleQA,
  ],
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});
```

### Implementation Handler (src/inngest/functions/implementation.ts)

```typescript
import { inngest } from '../client';
import { invokeClaudeCode, buildImplementerPrompt } from '../../claude/invoke';
import { cloneOrPullRepo, commitChanges, createPR } from '../../git';

export const handleImplementation = inngest.createFunction(
  {
    id: 'worker-implementation',
    name: 'Handle Implementation Request',
  },
  { event: 'worker/implementation.start' },
  async ({ event, step }) => {
    const {
      projectId,
      projectSlug,
      projectPath,
      sprintNumber,
      handoffContent,
      gitRepo,
      gitBranch,
    } = event.data;

    // Step 1: Prepare project directory
    const localPath = await step.run('prepare-project', async () => {
      if (gitRepo) {
        return await cloneOrPullRepo(gitRepo, gitBranch, projectSlug);
      }
      return projectPath;
    });

    // Step 2: Build implementation prompt
    const prompt = await step.run('build-prompt', async () => {
      return buildImplementerPrompt({
        projectSlug,
        sprintNumber,
        handoffContent,
      });
    });

    // Step 3: Run Claude Code
    const result = await step.run('run-claude-code', async () => {
      return invokeClaudeCode({
        projectPath: localPath,
        prompt,
        role: 'implementer',
        timeout: 600000, // 10 min
        onProgress: (chunk) => {
          // Emit progress events
          inngest.send({
            name: 'worker/progress',
            data: {
              projectId,
              role: 'Implementer',
              status: 'running',
              outputChunk: chunk,
            },
          });
        },
      });
    });

    // Step 4: Commit and create PR if successful
    let commitSha, prUrl;
    if (result.success && gitRepo) {
      const gitResult = await step.run('git-commit-pr', async () => {
        const sha = await commitChanges(localPath, `Sprint ${sprintNumber} implementation`);
        const pr = await createPR(localPath, {
          title: `Sprint ${sprintNumber}: Implementation`,
          body: result.summary,
          branch: `sprint-${sprintNumber}-impl`,
        });
        return { sha, prUrl: pr.url };
      });
      commitSha = gitResult.sha;
      prUrl = gitResult.prUrl;
    }

    // Step 5: Report completion
    await step.run('report-complete', async () => {
      await inngest.send({
        name: 'worker/implementation.complete',
        data: {
          projectId,
          success: result.success,
          summary: result.output,
          filesChanged: result.filesChanged || [],
          commitSha,
          prUrl,
          error: result.error,
          duration: result.duration,
        },
      });
    });

    return { success: result.success };
  }
);
```

## DigitalOcean Droplet Setup

### 1. Create Droplet

- **Image:** Ubuntu 22.04 LTS
- **Plan:** Basic, $12/month (2GB RAM, 1 vCPU)
- **Region:** Same as your users (e.g., NYC, SFO)
- **Authentication:** SSH key

### 2. Initial Server Setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Git
apt install -y git

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Authenticate Claude (interactive)
claude auth login

# Create app user
adduser --disabled-password tpml
usermod -aG sudo tpml

# Create projects directory
mkdir -p /home/tpml/projects
chown tpml:tpml /home/tpml/projects
```

### 3. Deploy Worker Service

```bash
# As tpml user
su - tpml

# Clone worker repo
git clone https://github.com/your-org/tpml-worker.git
cd tpml-worker

# Install dependencies
npm install

# Create .env
cat > .env << 'EOF'
PORT=3001
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key
ANTHROPIC_API_KEY=your-anthropic-key
GITHUB_TOKEN=your-github-token
PROJECTS_ROOT=/home/tpml/projects
EOF

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name tpml-worker
pm2 save
pm2 startup
```

### 4. Configure Nginx (Optional, for HTTPS)

```bash
apt install -y nginx certbot python3-certbot-nginx

# Configure nginx
cat > /etc/nginx/sites-available/tpml-worker << 'EOF'
server {
    listen 80;
    server_name worker.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/tpml-worker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL cert
certbot --nginx -d worker.yourdomain.com
```

### 5. Register with Inngest

In your Inngest dashboard, add the worker's endpoint:
- **URL:** `https://worker.yourdomain.com/api/inngest`

## Integration with Existing Workflow

### Modify handleProjectKickoff in tpml-operations

Instead of the bots just "talking about" implementation, they now trigger actual Claude Code sessions:

```typescript
// After Implementer outlines plan, trigger actual implementation
await step.run('trigger-implementation', async () => {
  await inngest.send({
    name: 'worker/implementation.start',
    data: {
      projectId,
      projectSlug: project.slug,
      projectPath: `/home/tpml/projects/${project.slug}`,
      sprintNumber,
      sprintName,
      handoffContent,
      gitRepo: project.gitRepo,
      gitBranch: `sprint-${sprintNumber}`,
    },
  });
});

// Wait for implementation to complete
const implResult = await step.waitForEvent('wait-for-implementation', {
  event: 'worker/implementation.complete',
  match: 'data.projectId',
  timeout: '30m',
});

if (!implResult?.data.success) {
  // Handle failure
}

// Continue with review...
```

## Security Considerations

1. **Inngest Signing Keys:** Verify all incoming events
2. **GitHub Token:** Use fine-grained tokens with minimal permissions
3. **Firewall:** Only allow inbound on ports 22 (SSH), 80, 443
4. **Claude Auth:** Store credentials securely, not in repo
5. **Project Isolation:** Each project in its own directory

## Monitoring

1. **PM2 Monitoring:** `pm2 monit`
2. **Logs:** `pm2 logs tpml-worker`
3. **Inngest Dashboard:** View function runs and errors
4. **Health Endpoint:** Monitor `/health`

## Cost Estimate

| Service | Cost/Month |
|---------|-----------|
| DigitalOcean Droplet (2GB) | $12 |
| Domain (optional) | $1 |
| **Total** | ~$13/month |

Plus Claude API usage for code generation.
