import { axe } from 'jest-axe';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VotingPlanPage from '@/pages/VotingPlanPage';

const { apiClientMock, trackEventMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  trackEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/apiClient', () => ({
  default: apiClientMock,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: trackEventMock,
}));

describe('VotingPlanPage', () => {
  beforeEach(() => {
    apiClientMock.post.mockReset();
    trackEventMock.mockClear();
  });

  it('submits the selected stage context when generating a plan', async () => {
    apiClientMock.post.mockResolvedValue({
      data: {
        data: {
          plan_markdown: '## Your Plan\n\n1. Verify your booth.',
          suggestions: [],
          sources: [],
        },
      },
    });

    const { container } = render(
      <HelmetProvider>
        <VotingPlanPage />
      </HelmetProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Campaign Period' }));
    await userEvent.click(screen.getByRole('button', { name: /i need new registration/i }));
    await screen.findByText('What is your voting situation right now?');
    await userEvent.click(screen.getByRole('button', { name: /away from home or recently moved/i }));
    await screen.findByText('What kind of plan should the assistant generate?');
    await userEvent.click(screen.getByRole('button', { name: /polling process clarity/i }));
    await userEvent.click(await screen.findByRole('button', { name: /generate my plan/i }));

    await waitFor(() => {
      expect(apiClientMock.post).toHaveBeenCalledWith(
        '/api/voting-plan',
        expect.objectContaining({
          stage_context: 'Campaign Period',
        })
      );
    });
    expect(await screen.findByText('Your Personal Checklist')).toBeInTheDocument();
    expect(trackEventMock).toHaveBeenCalledWith(
      'voting_plan_generated',
      expect.objectContaining({ stage_context: 'Campaign Period' })
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
