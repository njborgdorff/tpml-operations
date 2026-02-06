import { describe, it, expect } from '@jest/globals'
import { ProjectStatus } from '@prisma/client'
import {
  validateStatusTransition,
  validateProjectData,
  isValidProjectStatus,
  canMoveToFinished,
  isActiveProject,
  getNextStatus,
  formatStatus,
  getStatusBadgeClasses,
  ProjectValidationError,
  ProjectStatusTransitionError,
} from '../project-utils'

describe('project-utils', () => {
  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => {
        validateStatusTransition(ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE)
      }).not.toThrow()

      expect(() => {
        validateStatusTransition(ProjectStatus.COMPLETE, ProjectStatus.APPROVED)
      }).not.toThrow()

      expect(() => {
        validateStatusTransition(ProjectStatus.APPROVED, ProjectStatus.FINISHED)
      }).not.toThrow()
    })

    it('should allow reverse transitions where defined', () => {
      expect(() => {
        validateStatusTransition(ProjectStatus.COMPLETE, ProjectStatus.IN_PROGRESS)
      }).not.toThrow()

      expect(() => {
        validateStatusTransition(ProjectStatus.APPROVED, ProjectStatus.COMPLETE)
      }).not.toThrow()
    })

    it('should throw error for invalid transitions', () => {
      expect(() => {
        validateStatusTransition(ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED)
      }).toThrow(ProjectStatusTransitionError)

      expect(() => {
        validateStatusTransition(ProjectStatus.FINISHED, ProjectStatus.COMPLETE)
      }).toThrow(ProjectStatusTransitionError)
    })

    it('should throw error for transitions from statuses not in the workflow', () => {
      expect(() => {
        validateStatusTransition(ProjectStatus.INTAKE, ProjectStatus.COMPLETE)
      }).toThrow(ProjectStatusTransitionError)
    })

    it('should include current and target status in error', () => {
      try {
        validateStatusTransition(ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ProjectStatusTransitionError)
        const transitionError = error as ProjectStatusTransitionError
        expect(transitionError.currentStatus).toBe(ProjectStatus.IN_PROGRESS)
        expect(transitionError.targetStatus).toBe(ProjectStatus.APPROVED)
      }
    })
  })

  describe('validateProjectData', () => {
    it('should validate project name', () => {
      expect(() => {
        validateProjectData({ name: '' })
      }).toThrow(ProjectValidationError)

      expect(() => {
        validateProjectData({ name: 'A'.repeat(101) })
      }).toThrow(ProjectValidationError)

      expect(() => {
        validateProjectData({ name: 'Valid Project Name' })
      }).not.toThrow()
    })

    it('should validate project description', () => {
      expect(() => {
        validateProjectData({ description: 'A'.repeat(501) })
      }).toThrow(ProjectValidationError)

      expect(() => {
        validateProjectData({ description: 'Valid description' })
      }).not.toThrow()
    })

    it('should validate project status', () => {
      expect(() => {
        validateProjectData({ status: 'INVALID_STATUS' })
      }).toThrow(ProjectValidationError)

      expect(() => {
        validateProjectData({ status: ProjectStatus.IN_PROGRESS })
      }).not.toThrow()
    })

    it('should include field name in validation error', () => {
      try {
        validateProjectData({ name: '' })
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ProjectValidationError)
        const validationError = error as ProjectValidationError
        expect(validationError.field).toBe('name')
      }
    })
  })

  describe('isValidProjectStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidProjectStatus('IN_PROGRESS')).toBe(true)
      expect(isValidProjectStatus('COMPLETE')).toBe(true)
      expect(isValidProjectStatus('APPROVED')).toBe(true)
      expect(isValidProjectStatus('FINISHED')).toBe(true)
      expect(isValidProjectStatus('INTAKE')).toBe(true)
      expect(isValidProjectStatus('COMPLETED')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isValidProjectStatus('INVALID')).toBe(false)
      expect(isValidProjectStatus('')).toBe(false)
      expect(isValidProjectStatus('in_progress')).toBe(false)
    })
  })

  describe('canMoveToFinished', () => {
    it('should return true only for APPROVED status', () => {
      expect(canMoveToFinished(ProjectStatus.APPROVED)).toBe(true)
      expect(canMoveToFinished(ProjectStatus.IN_PROGRESS)).toBe(false)
      expect(canMoveToFinished(ProjectStatus.COMPLETE)).toBe(false)
      expect(canMoveToFinished(ProjectStatus.FINISHED)).toBe(false)
    })
  })

  describe('isActiveProject', () => {
    it('should return true for active statuses', () => {
      expect(isActiveProject(ProjectStatus.IN_PROGRESS)).toBe(true)
      expect(isActiveProject(ProjectStatus.COMPLETE)).toBe(true)
      expect(isActiveProject(ProjectStatus.APPROVED)).toBe(true)
    })

    it('should return false for FINISHED status', () => {
      expect(isActiveProject(ProjectStatus.FINISHED)).toBe(false)
    })
  })

  describe('getNextStatus', () => {
    it('should return correct next status in workflow', () => {
      expect(getNextStatus(ProjectStatus.IN_PROGRESS)).toBe(ProjectStatus.COMPLETE)
      expect(getNextStatus(ProjectStatus.COMPLETE)).toBe(ProjectStatus.APPROVED)
      expect(getNextStatus(ProjectStatus.APPROVED)).toBe(ProjectStatus.FINISHED)
      expect(getNextStatus(ProjectStatus.FINISHED)).toBe(null)
    })

    it('should return null for statuses not in the workflow', () => {
      expect(getNextStatus(ProjectStatus.INTAKE)).toBe(null)
      expect(getNextStatus(ProjectStatus.CANCELLED)).toBe(null)
    })
  })

  describe('formatStatus', () => {
    it('should format status for display', () => {
      expect(formatStatus(ProjectStatus.IN_PROGRESS)).toBe('In Progress')
      expect(formatStatus(ProjectStatus.COMPLETE)).toBe('Complete')
      expect(formatStatus(ProjectStatus.APPROVED)).toBe('Approved')
      expect(formatStatus(ProjectStatus.FINISHED)).toBe('Finished')
      expect(formatStatus(ProjectStatus.INTAKE)).toBe('Intake')
    })
  })

  describe('getStatusBadgeClasses', () => {
    it('should return appropriate CSS classes for each status', () => {
      const classes = getStatusBadgeClasses(ProjectStatus.IN_PROGRESS)
      expect(classes).toContain('inline-flex')
      expect(classes).toContain('bg-blue-100')
      expect(classes).toContain('text-blue-800')
    })

    it('should include base classes for all workflow statuses', () => {
      const workflowStatuses = [
        ProjectStatus.IN_PROGRESS,
        ProjectStatus.COMPLETE,
        ProjectStatus.APPROVED,
        ProjectStatus.FINISHED,
      ]

      workflowStatuses.forEach((status) => {
        const classes = getStatusBadgeClasses(status)
        expect(classes).toContain('inline-flex')
        expect(classes).toContain('items-center')
        expect(classes).toContain('px-2.5')
        expect(classes).toContain('py-0.5')
        expect(classes).toContain('rounded-full')
        expect(classes).toContain('text-xs')
        expect(classes).toContain('font-medium')
        expect(classes).toContain('border')
      })
    })
  })
})
