/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockGetSession = jest.fn()
const mockFindFirst = jest.fn()
const mockUpdateMany = jest.fn()
const mockFindUniqueOrThrow = jest.fn()
const mockHistoryCreate = jest.fn()
const mockTransaction = jest.fn()

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
  getSession: (...args: any[]) => mockGetSession(...args),
  canAccessProject: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    project: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    projectStatusHistory: {
      create: (...args: any[]) => mockHistoryCreate(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}))

import { PATCH } from '../route'
import { NextRequest } from 'next/server'

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/projects/proj1/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const routeParams = { params: { id: 'proj1' } }

describe('/api/projects/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PATCH', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = createRequest({ status: 'COMPLETE' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session has no user.id', async () => {
      mockGetSession.mockResolvedValue({ user: { email: 'test@test.com' } })

      const request = createRequest({ status: 'COMPLETE' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid status value', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })

      const request = createRequest({ status: 'BOGUS' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request data')
    })

    it('should return 404 when project not found or not owned', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue(null)

      const request = createRequest({ status: 'COMPLETE' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid status transition', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'IN_PROGRESS',
        ownerId: 'user1',
      })

      // IN_PROGRESS -> APPROVED is not a valid transition
      const request = createRequest({ status: 'APPROVED' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Invalid status transition')
    })

    it('should return 400 for transitions from FINISHED (terminal)', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'FINISHED',
        ownerId: 'user1',
      })

      const request = createRequest({ status: 'COMPLETE' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(400)
    })

    it('should successfully transition IN_PROGRESS -> COMPLETE', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'IN_PROGRESS',
        ownerId: 'user1',
      })

      const updatedProject = {
        id: 'proj1',
        status: 'COMPLETE',
        ownerId: 'user1',
        archivedAt: null,
      }

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          project: {
            updateMany: mockUpdateMany.mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: mockFindUniqueOrThrow.mockResolvedValue(updatedProject),
          },
          projectStatusHistory: {
            create: mockHistoryCreate.mockResolvedValue({}),
          },
        }
        return fn(tx)
      })

      const request = createRequest({ status: 'COMPLETE' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('COMPLETE')

      // Verify optimistic lock was used
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'proj1',
            status: 'IN_PROGRESS', // optimistic lock on current status
          }),
        })
      )
    })

    it('should set archivedAt when transitioning to FINISHED', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'APPROVED',
        ownerId: 'user1',
      })

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          project: {
            updateMany: mockUpdateMany.mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: mockFindUniqueOrThrow.mockResolvedValue({
              id: 'proj1',
              status: 'FINISHED',
              archivedAt: new Date(),
            }),
          },
          projectStatusHistory: {
            create: mockHistoryCreate.mockResolvedValue({}),
          },
        }
        return fn(tx)
      })

      const request = createRequest({ status: 'FINISHED' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(200)

      // Verify archivedAt was set (not null)
      const updateCall = mockUpdateMany.mock.calls[0][0]
      expect(updateCall.data.archivedAt).toBeInstanceOf(Date)
    })

    it('should clear archivedAt when transitioning away from FINISHED', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'COMPLETE',
        ownerId: 'user1',
      })

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          project: {
            updateMany: mockUpdateMany.mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: mockFindUniqueOrThrow.mockResolvedValue({
              id: 'proj1',
              status: 'IN_PROGRESS',
              archivedAt: null,
            }),
          },
          projectStatusHistory: {
            create: mockHistoryCreate.mockResolvedValue({}),
          },
        }
        return fn(tx)
      })

      const request = createRequest({ status: 'IN_PROGRESS' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(200)

      // Verify archivedAt was explicitly set to null
      const updateCall = mockUpdateMany.mock.calls[0][0]
      expect(updateCall.data.archivedAt).toBeNull()
    })

    it('should return 409 on concurrent modification (race condition)', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'IN_PROGRESS',
        ownerId: 'user1',
      })

      // Simulate race: updateMany returns count 0 because status changed
      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          project: {
            updateMany: mockUpdateMany.mockResolvedValue({ count: 0 }),
          },
          projectStatusHistory: {
            create: mockHistoryCreate,
          },
        }
        return fn(tx)
      })

      const request = createRequest({ status: 'COMPLETE' })
      const response = await PATCH(request, routeParams)

      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toContain('changed by another request')
    })

    it('should create history entry with correct data', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@test.com' },
      })
      mockFindFirst.mockResolvedValue({
        id: 'proj1',
        status: 'COMPLETE',
        ownerId: 'user1',
      })

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          project: {
            updateMany: mockUpdateMany.mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: mockFindUniqueOrThrow.mockResolvedValue({
              id: 'proj1',
              status: 'APPROVED',
            }),
          },
          projectStatusHistory: {
            create: mockHistoryCreate.mockResolvedValue({}),
          },
        }
        return fn(tx)
      })

      const request = createRequest({ status: 'APPROVED' })
      await PATCH(request, routeParams)

      expect(mockHistoryCreate).toHaveBeenCalledWith({
        data: {
          projectId: 'proj1',
          oldStatus: 'COMPLETE',
          newStatus: 'APPROVED',
          changedBy: 'user1',
        },
      })
    })
  })
})
