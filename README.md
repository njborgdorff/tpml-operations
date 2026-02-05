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

### Projects
- `GET /api/projects` - List projects with filtering
  - Query params: `status`, `filter` (active/finished)
- `POST /api/projects` - Create new project
- `PATCH /api/projects/[id]/status` - Update project status
- `GET /api/projects/[id]/history` - Get status change history

### Authentication
- `POST /api/auth/signin` - Sign in (NextAuth)
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Health Check
- `GET /api/health` - System health and feature status

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── providers/        # Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── types/                # TypeScript type definitions
```

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Database commands
npm run db:push          # Push schema changes
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio

# Linting
npm run lint
```

## Environment Variables

Required environment variables in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/tpml_db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

## Production Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Production Considerations
- Replace credentials provider with OAuth providers (Google, GitHub)
- Use secure database connection strings
- Set strong NEXTAUTH_SECRET
- Enable HTTPS in production
- Configure proper CORS settings

## Testing

### Manual Testing Checklist

#### P0 Features
- [ ] Create project (starts as IN_PROGRESS)
- [ ] Update project status through UI
- [ ] Verify status changes persist
- [ ] Check status badges display correctly
- [ ] Test responsive design on mobile

#### P1 Features
- [ ] Filter projects by specific status
- [ ] Filter by Active/Finished project types
- [ ] Clear filters functionality
- [ ] Filter state persists during session

### API Testing
Use the health endpoint to verify all features:
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Run `npm run db:push` to sync schema

2. **Authentication issues**
   - Check NEXTAUTH_SECRET is set
   - Clear browser cookies/localStorage
   - Verify NEXTAUTH_URL matches your domain

3. **Build errors**
   - Run `npm run db:generate` after schema changes
   - Clear Next.js cache: `rm -rf .next`
   - Check TypeScript errors: `npx tsc --noEmit`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the SPRINT1_VERIFICATION.md guide
3. Open an issue on GitHub