import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ArchiveConfirmDialog } from '../ArchiveConfirmDialog'

describe('ArchiveConfirmDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnConfirm = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render dialog content when open', () => {
    render(
      <ArchiveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        projectName="Test Project"
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('Move to Finished?')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should not render dialog content when closed', () => {
    render(
      <ArchiveConfirmDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        projectName="Test Project"
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.queryByText('Move to Finished?')).not.toBeInTheDocument()
  })

  it('should call onConfirm when Confirm button is clicked', () => {
    render(
      <ArchiveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        projectName="Test Project"
        onConfirm={mockOnConfirm}
      />
    )

    fireEvent.click(screen.getByText('Confirm'))
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
  })

  it('should call onOpenChange(false) when Cancel button is clicked', () => {
    render(
      <ArchiveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        projectName="Test Project"
        onConfirm={mockOnConfirm}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should show loading state and disable buttons when isLoading', () => {
    render(
      <ArchiveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        projectName="Test Project"
        onConfirm={mockOnConfirm}
        isLoading={true}
      />
    )

    expect(screen.getByText('Moving...')).toBeInTheDocument()
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()

    const cancelButton = screen.getByText('Cancel')
    expect(cancelButton).toBeDisabled()

    const movingButton = screen.getByText('Moving...')
    expect(movingButton).toBeDisabled()
  })
})
