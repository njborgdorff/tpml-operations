/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockGetSession = jest.fn()
const mockFindMany = jest.fn()

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
  getSession: (...args: any[]) => mockGetSession(...args),
  canAccessProject: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    project: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/knowledge/sync', () => ({
  syncKnowledgeBase: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockRejectedValue(new Error('not found')),
}))

import { GET } from '../route'

describe('/api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 when session exists but user.id is missing', async () => {
      mockGetSession.mockResolvedValue({ user: { email: 'test@example.com' } })

      const request = new Request('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return all projects for authenticated user', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      const mockProjects = [
        {
          id: 'project1',
          name: 'Test Project',
          slug: 'test-project',
          status: 'IN_PROGRESS',
          ownerId: 'user1',
        },
      ]

      mockFindMany.mockResolvedValue(mockProjects)

      const request = new Request('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual(mockProjects)
    })

    it('should filter active projects when filter=active', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      mockFindMany.mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/projects?filter=active')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'user1',
            status: { not: 'FINISHED' },
          }),
        })
      )
    })

    it('should filter finished projects when filter=finished', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      mockFindMany.mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/projects?filter=finished')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'user1',
            status: 'FINISHED',
          }),
        })
      )
    })

    it('should filter by specific status values', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      mockFindMany.mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/projects?status=IN_PROGRESS,COMPLETE')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'user1',
            status: { in: ['IN_PROGRESS', 'COMPLETE'] },
          }),
        })
      )
    })

    it('should reject invalid status values', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      const request = new Request('http://localhost:3000/api/projects?status=INVALID,BOGUS')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Invalid status values')
    })

    it('should reject conflicting filter and status params', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      const request = new Request('http://localhost:3000/api/projects?filter=active&status=FINISHED')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Cannot use both')
    })

    it('should handle database errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      })

      mockFindMany.mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch projects')
    })
  })
})
