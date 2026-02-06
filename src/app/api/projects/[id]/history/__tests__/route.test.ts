/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockGetSession = jest.fn()
const mockProjectFindFirst = jest.fn()
const mockHistoryFindMany = jest.fn()

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
  getSession: (...args: any[]) => mockGetSession(...args),
  canAccessProject: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    project: {
      findFirst: (...args: any[]) => mockProjectFindFirst(...args),
    },
    projectStatusHistory: {
      findMany: (...args: any[]) => mockHistoryFindMany(...args),
    },
  },
}))

import { GET } from '../route'
import { NextRequest } from 'next/server'

const routeParams = { params: { id: 'proj1' } }

describe('/api/projects/[id]/history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      const response = await GET(request, routeParams)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session has no user.id', async () => {
      mockGetSession.mockResolvedValue({ user: { email: 'test@test.com' } })

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      const response = await GET(request, routeParams)

      expect(response.status).toBe(401)
    })

    it('should return 404 when project not found or not owned', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockProjectFindFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      const response = await GET(request, routeParams)

      expect(response.status).toBe(404)
    })

    it('should return history for owned project', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockProjectFindFirst.mockResolvedValue({
        id: 'proj1',
        ownerId: 'user1',
      })

      const mockHistory = [
        {
          id: 'h2',
          projectId: 'proj1',
          oldStatus: 'IN_PROGRESS',
          newStatus: 'COMPLETE',
          changedBy: 'user1',
          changedAt: '2025-01-02T00:00:00Z',
          user: { id: 'user1', name: 'Test User', email: 'test@test.com' },
        },
        {
          id: 'h1',
          projectId: 'proj1',
          oldStatus: null,
          newStatus: 'IN_PROGRESS',
          changedBy: 'user1',
          changedAt: '2025-01-01T00:00:00Z',
          user: { id: 'user1', name: 'Test User', email: 'test@test.com' },
        },
      ]
      mockHistoryFindMany.mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      const response = await GET(request, routeParams)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(2)
      expect(body[0].id).toBe('h2') // most recent first
    })

    it('should return empty array when no history exists', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockProjectFindFirst.mockResolvedValue({
        id: 'proj1',
        ownerId: 'user1',
      })
      mockHistoryFindMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      const response = await GET(request, routeParams)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual([])
    })

    it('should query with correct ordering', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockProjectFindFirst.mockResolvedValue({
        id: 'proj1',
        ownerId: 'user1',
      })
      mockHistoryFindMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      await GET(request, routeParams)

      expect(mockHistoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'proj1' },
          orderBy: { changedAt: 'desc' },
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockProjectFindFirst.mockResolvedValue({
        id: 'proj1',
        ownerId: 'user1',
      })
      mockHistoryFindMany.mockRejectedValue(new Error('DB error'))

      const request = new NextRequest('http://localhost:3000/api/projects/proj1/history')
      const response = await GET(request, routeParams)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch project history')
    })
  })
})
