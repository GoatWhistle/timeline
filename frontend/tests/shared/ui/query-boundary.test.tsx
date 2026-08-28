import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'

const SKELETON = <output data-testid="skeleton">loading</output>

describe('QueryBoundary keeps data on screen while refetching', () => {
  it('renders the existing rows during a refetch instead of a skeleton', () => {
    renderWithProviders(
      <QueryBoundary isPending={false} isFetching hasData skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    expect(screen.getByText('row content')).toBeInTheDocument()
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
  })

  it('marks the refetching region busy so assistive tech announces it', () => {
    renderWithProviders(
      <QueryBoundary isPending={false} isFetching hasData skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    expect(screen.getByText('row content').parentElement).toHaveAttribute('aria-busy', 'true')
  })

  it('dims the stale region rather than hiding it', () => {
    renderWithProviders(
      <QueryBoundary isPending={false} isFetching hasData skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    expect(screen.getByText('row content').parentElement?.className).toContain('opacity-60')
  })

  it('leaves settled data undimmed and not busy', () => {
    renderWithProviders(
      <QueryBoundary isPending={false} isFetching={false} hasData skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    const region = screen.getByText('row content').parentElement
    expect(region).not.toHaveAttribute('aria-busy')
    expect(region?.className).not.toContain('opacity-60')
  })

  it('never shows a skeleton over data even while a background pending flag is set', () => {
    renderWithProviders(
      <QueryBoundary isPending isFetching hasData skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('row content')).toBeInTheDocument()
  })
})

describe('QueryBoundary shows nothing during the first 200ms', () => {
  it('renders neither the skeleton nor the children on a fresh pending load', () => {
    renderWithProviders(
      <QueryBoundary isPending skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('row content')).not.toBeInTheDocument()
  })

  it('shows the error state instead of any indicator when the query failed', () => {
    renderWithProviders(
      <QueryBoundary isPending={false} isError error={new Error('boom')} skeleton={SKELETON}>
        <p>row content</p>
      </QueryBoundary>,
    )

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('row content')).not.toBeInTheDocument()
  })
})

describe('SkeletonTable mirrors the real table geometry', () => {
  it('renders the requested number of body rows and columns', () => {
    renderWithProviders(<SkeletonTable rows={4} columns={5} />)

    const bodyRows = screen.getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(4)
    expect(bodyRows[0]?.querySelectorAll('td')).toHaveLength(5)
  })

  it('renders a header row so the skeleton does not shift when headers land', () => {
    renderWithProviders(<SkeletonTable rows={2} columns={3} />)

    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
  })

  it('exposes itself as a busy status region', () => {
    renderWithProviders(<SkeletonTable rows={2} columns={2} />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })
})
