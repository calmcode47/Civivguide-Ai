import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe } from 'jest-axe';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import TimelinePage from '@/pages/TimelinePage';

function AssistantTarget() {
  const location = useLocation();
  return <div data-testid="assistant-location">{`${location.pathname}${location.search}`}</div>;
}

describe('TimelinePage', () => {
  beforeEach(() => {
    apiClientMock.get.mockReset();
    trackEventMock.mockClear();
    apiClientMock.get.mockResolvedValue({
      data: {
        data: {
          total_steps: 3,
          sources: [
            {
              title: 'Voters Portal',
              url: 'https://voters.eci.gov.in/',
            },
          ],
          phases: [
            {
              id: 'phase-1',
              name: 'Pre-Election',
              color: '#d4a017',
              steps: [
                {
                  id: 'roll-check',
                  phase: 'Pre-Election',
                  title: 'Roll Check',
                  description: 'Verify your voter details before the schedule is announced.',
                  duration: 'Early preparation',
                  order: 1,
                  details: ['Check your name', 'Check your address'],
                },
              ],
            },
            {
              id: 'phase-2',
              name: 'Polling',
              color: '#4f6df5',
              steps: [
                {
                  id: 'polling-day',
                  phase: 'Polling',
                  title: 'Polling Day',
                  description: 'Confirm your booth, ID, and process before voting.',
                  duration: 'Election day',
                  order: 2,
                  details: ['Carry accepted ID', 'Reach the correct booth', 'Understand EVM and VVPAT'],
                },
              ],
            },
            {
              id: 'phase-3',
              name: 'Counting',
              color: '#4ac27a',
              steps: [
                {
                  id: 'counting-day',
                  phase: 'Counting',
                  title: 'Counting Day',
                  description: 'Follow official result reporting.',
                  duration: 'Post-poll',
                  order: 3,
                  details: ['Check official channels only'],
                },
              ],
            },
          ],
        },
      },
    });
  });

  it('renders an accessible timeline and carries stage context into Ask AI links', async () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/timeline']}>
          <Routes>
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/assistant" element={<AssistantTarget />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(await screen.findByText('Polling Day')).toBeInTheDocument();
    expect(screen.getByText('Process Snapshot')).toBeInTheDocument();

    const pollingCard = screen.getByRole('listitem', { name: /step 2: polling day/i });
    await userEvent.click(within(pollingCard).getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByTestId('assistant-location')).toHaveTextContent(
        /\/assistant\?prefill=Tell%20me%20more%20about%20Polling%20Day&stage=Polling%20Day/
      );
    });
    expect(trackEventMock).toHaveBeenCalledWith(
      'timeline_ask_ai_clicked',
      expect.objectContaining({ stage_context: 'Polling Day' })
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
