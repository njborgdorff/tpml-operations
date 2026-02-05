# TPML Project Management Setup

## Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database running
3. Git for version control

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your database URL:
# DATABASE_URL="postgresql://username:password@localhost:5432/tpml_db"

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate
```

### 3. Environment Variables
Edit `.env.local` and set:
```
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access the Application
- Main app: http://localhost:3000
- Demo page: http://localhost:3000/demo
- Sign in: http://localhost:3000/auth/signin

## Development Authentication

The system uses a simple email-based authentication for development:
1. Go to `/auth/signin`
2. Enter any email address
3. Optionally enter a name
4. Click "Sign In"

This will create a user account automatically for testing.

## Database Management

```bash
# Push schema changes without migration
npm run db:push

# Open Prisma Studio
npm run db:studio

# Reset database (development only)
npx prisma migrate reset
```

## Testing the System

1. Sign in with any email
2. Create a new project
3. Change project status using the dropdown menu
4. Filter projects by status or type
5. Verify status changes are persisted

## Production Deployment

For production:
1. Replace the credentials provider with proper OAuth providers (Google, GitHub, etc.)
2. Set proper environment variables
3. Use a production PostgreSQL database
4. Set NEXTAUTH_SECRET to a secure random string