import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ProjectCard } from '../ProjectCard'
import { ProjectStatus } from '@prisma/client'

const mockProject = {
  id: 'project1',
  name: 'Test Project',
  slug: 'test-project',
  description: 'Test project description',
  status: ProjectStatus.IN_PROGRESS,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  ownerId: 'user1',
  clientId: 'client1',
  owner: {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
  },
}

describe('ProjectCard', () => {
  const mockOnStatusUpdate = jest.fn<(id: string, status: ProjectStatus) => Promise<void>>()

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnStatusUpdate.mockResolvedValue(undefined)
  })

  it('should render project information correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Test project description')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('should render "No description provided" when description is null', () => {
    const projectWithoutDescription = { ...mockProject, description: null }

    render(
      <ProjectCard
        project={projectWithoutDescription}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    expect(screen.getByText('No description provided')).toBeInTheDocument()
  })

  it('should not show actions menu for finished projects', () => {
    const finishedProject = {
      ...mockProject,
      status: ProjectStatus.FINISHED,
    }

    render(
      <ProjectCard
        project={finishedProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should show correct actions for IN_PROGRESS status', () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
    expect(screen.queryByText('Mark as Approved')).not.toBeInTheDocument()
  })

  it('should show correct actions for COMPLETE status', () => {
    const completeProject = {
      ...mockProject,
      status: ProjectStatus.COMPLETE,
    }

    render(
      <ProjectCard
        project={completeProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Mark as In Progress')).toBeInTheDocument()
    expect(screen.getByText('Mark as Approved')).toBeInTheDocument()
  })

  it('should show correct actions for APPROVED status', () => {
    const approvedProject = {
      ...mockProject,
      status: ProjectStatus.APPROVED,
    }

    render(
      <ProjectCard
        project={approvedProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
    expect(screen.getByText('Move to Finished')).toBeInTheDocument()
  })

  it('should call onStatusUpdate when action is clicked', async () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    )

    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)

    const completeAction = screen.getByText('Mark as Complete')
    fireEvent.click(completeAction)

    expect(mockOnStatusUpdate).toHaveBeenCalledWith('project1', ProjectStatus.COMPLETE)
  })

  it('should close actions menu when clicking outside', () => {
    render(
      <div>
        <ProjectCard
          project={mockProject}
          onStatusUpdate={mockOnStatusUpdate}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    )

    // Open actions menu
    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)
    expect(screen.getByText('Mark as Complete')).toBeInTheDocument()

    // Click outside to close
    fireEvent.click(screen.getByTestId('outside'))
    expect(screen.queryByText('Mark as Complete')).not.toBeInTheDocument()
  })

  it('should show updating state during status update', () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
        isUpdating={true}
      />
    )

    expect(screen.getByText('Updating...')).toBeInTheDocument()
  })

  it('should handle status update with loading state', async () => {
    let resolvePromise: (value?: unknown) => void
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    const mockOnStatusUpdateAsync = jest.fn<(id: string, status: ProjectStatus) => Promise<void>>(
      () => mockPromise as Promise<void>
    )

    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdateAsync}
      />
    )

    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)

    const completeAction = screen.getByText('Mark as Complete')
    fireEvent.click(completeAction)

    // Should show updating state immediately
    expect(screen.getByText('Updating...')).toBeInTheDocument()

    // Resolve the promise
    resolvePromise!()
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
    })
  })

  it('should handle errors during status update gracefully', async () => {
    const mockOnStatusUpdateError = jest.fn<(id: string, status: ProjectStatus) => Promise<void>>(
      () => Promise.reject(new Error('Update failed'))
    )
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdateError}
      />
    )

    const actionsButton = screen.getByRole('button')
    fireEvent.click(actionsButton)

    const completeAction = screen.getByText('Mark as Complete')
    fireEvent.click(completeAction)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update status:', expect.any(Error))
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })
})
