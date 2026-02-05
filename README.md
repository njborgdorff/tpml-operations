# TPML Project Management System

A modern project management application built with Next.js 14, TypeScript, Prisma, and Tailwind CSS.

## Sprint 1 Implementation ✅

This implementation delivers all P0 and P1 features for the Foundation Sprint:

### ✅ P0 Features (Critical)
- **S1-1: Project status tracking system**
  - Complete status workflow: IN_PROGRESS → COMPLETE → APPROVED → FINISHED
  - Database schema with ProjectStatus enum and status history logging
  - Timestamp tracking for all status changes
  - User attribution for status updates

- **S1-2: Dashboard UI updates for status display**
  - Color-coded status badges for visual identification
  - Status update dropdown menus on project cards
  - Real-time status updates with optimistic UI
  - Responsive design for mobile and desktop

### ✅ P1 Features (High Priority)
- **S1-3: Basic project filtering**
  - Filter by specific status (In Progress, Complete, Approved, Finished)
  - Filter by project type (Active vs Finished)
  - Session persistence for filter state
  - Clear filter functionality

## Features Overview

### Core Functionality
- 🏗️ **Project Management**: Create, update, and track projects
- 📊 **Status Tracking**: Four-stage status workflow with history
- 🎯 **Smart Filtering**: Filter by status and project lifecycle stage
- 👤 **User Management**: Simple email-based authentication for demo
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

### Technical Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS, Radix UI components
- **State Management**: TanStack Query for server state
- **Authentication**: NextAuth.js with credentials provider

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- Git

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd tpml-project-management

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 3. Database Setup
```bash
# Edit .env.local with your database URL
# DATABASE_URL="postgresql://username:password@localhost:5432/tpml_db"

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000 to see the application.

## Demo Authentication

For development/demo purposes, the system uses simple email-based authentication:

1. Go to http://localhost:3000
2. Click "Sign In to View Demo"
3. Enter any email address
4. Optionally enter a name
5. Click "Sign In"

This creates a user account automatically for testing.

## Testing the Sprint 1 Features

### Project Status Tracking
1. Sign in and create a new project
2. Project starts in "In Progress" status
3. Click the menu (⋯) on a project card
4. Select "Mark as Complete" to move to next status
5. Continue through: Complete → Approved → Finished
6. Verify status changes are saved and displayed

### Dashboard UI
- ✅ Status badges are color-coded and clearly visible
- ✅ Dropdown menus allow status transitions
- ✅ Real-time updates without page refresh
- ✅ Responsive layout on all screen sizes

### Project Filtering
1. Create projects in different statuses
2. Use the "Filter" dropdown to:
   - Filter by specific status (In Progress, Complete, etc.)
   - Filter by type (Active Projects, Finished Projects)
3. Clear filters to see all projects
4. Verify filter state persists during session

## Database Schema

### Core Models
- **User**: Authentication and user management
- **Project**: Main project entity with status tracking
- **ProjectStatusHistory**: Complete audit log of status changes

### Status Workflow
```
IN_PROGRESS → COMPLETE → APPROVED → FINISHED
     ↑           ↑          ↑          ↑
  (Start)    (Work done) (Reviewed)  (Archived)
```

## API Endpoints

- `GET /api/projects` - Fetch projects with filtering
- `POST /api/projects` - Create new project
- `PATCH /api/projects/[id]/status` - Update project status
- `GET /api/projects/[id]/history` - Get status change history

## Development Commands

```bash
# Development server
npm run dev

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Prisma Studio

# Build and production
npm run build
npm run start
```

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── auth/          # Authentication pages
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Homepage
├── components/
│   ├── ui/            # Reusable UI components
│   ├── providers/     # Context providers
│   └── *.tsx          # Feature components
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configurations
└── types/             # TypeScript type definitions
```

## Sprint 1 Deliverables Status

| Feature | Status | Description |
|---------|--------|-------------|
| S1-1 | ✅ Complete | Project status tracking with full workflow |
| S1-2 | ✅ Complete | Dashboard UI with status display and controls |
| S1-3 | ✅ Complete | Basic project filtering with Active/Finished views |

## Next Steps (Future Sprints)

- Advanced filtering and search functionality
- Project details and editing capabilities
- User role management and permissions
- Bulk operations and multi-select
- Reporting and analytics dashboard
- Real-time collaboration features

## License

This project is private and proprietary to TPML.