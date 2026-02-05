import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    projectStatusHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('AUTH_REQUIRED');
    });

    it('should return active projects by default', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const mockProjects = [
        {
          id: 'project1',
          name: 'Test Project',
          status: ProjectStatus.IN_PROGRESS,
          userId: 'user1',
          user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
          statusHistory: [],
        },
      ];

      mockPrisma.project.findMany.mockResolvedValue(mockProjects);
      mockPrisma.project.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.projects).toEqual(mockProjects);
      expect(body.pagination.totalCount).toBe(1);

      // Verify the correct filter was applied
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED] },
          }),
        })
      );
    });

    it('should filter by finished projects when status=finished', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.project.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/projects?status=finished');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ProjectStatus.FINISHED,
          }),
        })
      );
    });

    it('should handle pagination parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.project.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/projects?page=2&limit=5');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        })
      );
    });

    it('should return 400 for invalid query parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/projects?page=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid query parameters');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockPrisma.project.findMany.mockRejectedValue(new Error('Database connection error'));

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch projects');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('POST /api/projects', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should create a project successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        description: 'Test Description',
        status: ProjectStatus.IN_PROGRESS,
        userId: 'user1',
        user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
      };

      mockPrisma.project.findFirst.mockResolvedValue(null); // No existing project
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
          },
          projectStatusHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx as any);
      });

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test Description',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.name).toBe('Test Project');
      expect(body.description).toBe('Test Description');
    });

    it('should return 400 for invalid project data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: '' }), // Invalid empty name
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid project data');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate project names', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'existing-project',
        name: 'Duplicate Name',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Duplicate Name' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe('A project with this name already exists');
      expect(body.code).toBe('DUPLICATE_NAME');
    });

    it('should handle database errors during creation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to create project');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });
});