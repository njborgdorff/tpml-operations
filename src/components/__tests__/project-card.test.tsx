import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProjectCard } from '../project-card';
import { ProjectStatus } from '@prisma/client';

// Mock date-fns to avoid timezone issues in tests
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') {
      return 'Jan 1, 2024';
    }
    return date.toString();
  }),
}));

const mockProject = {
  id: 'project1',
  name: 'Test Project',
  description: 'Test project description',
  status: ProjectStatus.IN_PROGRESS,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  userId: 'user1',
  user: {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
  },
};

describe('ProjectCard', () => {
  const mockOnStatusUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project information correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test project description')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Created Jan 1, 2024')).toBeInTheDocument();
  });

  it('should render "No description provided" when description is null', () => {
    const projectWithoutDescription = { ...mockProject, description: null };
    
    render(
      <ProjectCard
        project={projectWithoutDescription}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    expect(screen.getByText('No description provided')).toBeInTheDocument();
  });

  it('should show archived date when project is archived', () => {
    const archivedProject = {
      ...mockProject,
      status: ProjectStatus.FINISHED,
      archivedAt: new Date('2024-01-15'),
    };

    render(
      <ProjectCard
        project={archivedProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    expect(screen.getByText('Archived Jan 1, 2024')).toBeInTheDocument();
  });

  it('should not show actions menu for finished projects', () => {
    const finishedProject = {
      ...mockProject,
      status: ProjectStatus.FINISHED,
    };

    render(
      <ProjectCard
        project={finishedProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show correct actions for IN_PROGRESS status', () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    // Click the actions button
    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    expect(screen.getByText('Mark as Complete')).toBeInTheDocument();
    expect(screen.queryByText('Mark as Approved')).not.toBeInTheDocument();
  });

  it('should show correct actions for COMPLETE status', () => {
    const completeProject = {
      ...mockProject,
      status: ProjectStatus.COMPLETE,
    };

    render(
      <ProjectCard
        project={completeProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    expect(screen.getByText('Mark as In Progress')).toBeInTheDocument();
    expect(screen.getByText('Mark as Approved')).toBeInTheDocument();
  });

  it('should show correct actions for APPROVED status', () => {
    const approvedProject = {
      ...mockProject,
      status: ProjectStatus.APPROVED,
    };

    render(
      <ProjectCard
        project={approvedProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    expect(screen.getByText('Mark as Complete')).toBeInTheDocument();
    expect(screen.getByText('Move to Finished')).toBeInTheDocument();
  });

  it('should call onStatusUpdate when action is clicked', async () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    const completeAction = screen.getByText('Mark as Complete');
    fireEvent.click(completeAction);

    expect(mockOnStatusUpdate).toHaveBeenCalledWith('project1', ProjectStatus.COMPLETE);
  });

  it('should close actions menu when clicking outside', () => {
    render(
      <div>
        <ProjectCard
          project={mockProject}
          onStatusUpdate={mockOnStatusUpdate}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    // Open actions menu
    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);
    expect(screen.getByText('Mark as Complete')).toBeInTheDocument();

    // Click outside to close
    fireEvent.click(screen.getByTestId('outside'));
    expect(screen.queryByText('Mark as Complete')).not.toBeInTheDocument();
  });

  it('should show updating state during status update', () => {
    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdate}
        isUpdating={true}
      />
    );

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    // Actions button should be disabled
    const actionsButton = screen.getByRole('button');
    expect(actionsButton).toBeDisabled();
  });

  it('should handle status update with loading state', async () => {
    let resolvePromise: (value?: any) => void;
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    const mockOnStatusUpdateAsync = jest.fn(() => mockPromise);

    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdateAsync}
      />
    );

    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    const completeAction = screen.getByText('Mark as Complete');
    fireEvent.click(completeAction);

    // Should show updating state immediately
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.queryByText('Mark as Complete')).not.toBeInTheDocument(); // Menu should close

    // Resolve the promise
    resolvePromise!();
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });
  });

  it('should handle errors during status update gracefully', async () => {
    const mockOnStatusUpdateError = jest.fn(() => Promise.reject(new Error('Update failed')));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ProjectCard
        project={mockProject}
        onStatusUpdate={mockOnStatusUpdateError}
      />
    );

    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    const completeAction = screen.getByText('Mark as Complete');
    fireEvent.click(completeAction);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update status:', expect.any(Error));
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});