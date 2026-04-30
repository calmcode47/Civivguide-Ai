import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it } from 'vitest';

import LandingPage from '@/pages/LandingPage';

describe('LandingPage', () => {
  it('presents the first-time-voter promise accessibly', async () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByRole('heading', { name: /your first vote/i })).toBeInTheDocument();
    expect(screen.getByText(/^First-Time Voter Guide$/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
