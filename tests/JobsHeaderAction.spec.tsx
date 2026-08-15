// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JobsHeaderAction, type JobsHeaderActionProps } from '../src/client/JobsHeaderAction.js'

function props(openJobs: JobsHeaderActionProps['openJobs']): JobsHeaderActionProps {
  return {
    sessionId: 'session-1',
    openJobs,
    t: key => key === 'header' ? 'Jobs' : key === 'headerAria' ? 'Open Jobs app' : key,
  } as JobsHeaderActionProps
}

describe('JobsHeaderAction', () => {
  afterEach(cleanup)

  it('deep-links into the Jobs App without rendering a job list', () => {
    const openJobs = vi.fn()
    render(<JobsHeaderAction {...props(openJobs)} />)

    const button = screen.getByRole('button', { name: 'Open Jobs app' })
    expect(button.textContent).toBe('Jobs')
    expect(screen.queryByRole('list')).toBeNull()
    fireEvent.click(button)
    expect(openJobs).toHaveBeenCalledOnce()
  })
})
