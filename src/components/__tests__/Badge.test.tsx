import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../Badge';
import type { BadgeTone, BadgeSize } from '../Badge';

// ---------------------------------------------------------------------------
// Tone variants
// ---------------------------------------------------------------------------
describe('Badge — tone variants', () => {
  const tones: BadgeTone[] = ['neutral', 'info', 'success', 'warning', 'danger'];

  const TONE_COLOR: Record<BadgeTone, string> = {
    neutral: 'var(--muted)',
    info: 'var(--info)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
  };

  it.each(tones)('renders with correct token color for tone "%s"', (tone) => {
    render(<Badge tone={tone}>{tone}</Badge>);
    const badge = screen.getByText(tone);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ color: TONE_COLOR[tone] });
  });

  it('defaults to neutral tone when no tone prop is supplied', () => {
    render(<Badge>default</Badge>);
    expect(screen.getByText('default')).toHaveStyle({ color: 'var(--muted)' });
  });
});

// ---------------------------------------------------------------------------
// Size variants
// ---------------------------------------------------------------------------
describe('Badge — size variants', () => {
  const SIZE_STYLES: Record<BadgeSize, { padding: string; fontSize: string }> = {
    sm: { padding: '1px 6px', fontSize: '10px' },
    md: { padding: '2px 8px', fontSize: '11px' },
    lg: { padding: '3px 10px', fontSize: '13px' },
  };

  it.each(Object.entries(SIZE_STYLES) as [BadgeSize, { padding: string; fontSize: string }][])(
    'applies correct padding and font-size for size "%s"',
    (size, expected) => {
      render(
        <Badge size={size} aria-label={`${size} badge`}>
          {size}
        </Badge>
      );
      const badge = screen.getByLabelText(`${size} badge`);
      expect(badge).toHaveStyle({ padding: expected.padding, fontSize: expected.fontSize });
    }
  );

  it('defaults to md size when no size prop is supplied', () => {
    render(<Badge aria-label="default size">count</Badge>);
    expect(screen.getByLabelText('default size')).toHaveStyle({
      padding: '2px 8px',
      fontSize: '11px',
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility — aria-label
// ---------------------------------------------------------------------------
describe('Badge — accessibility', () => {
  it('exposes aria-label on the root element', () => {
    render(
      <Badge tone="info" aria-label="5 unread notifications">
        5
      </Badge>
    );
    const badge = screen.getByLabelText('5 unread notifications');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  it('renders without aria-label when prop is omitted', () => {
    render(<Badge>Label only</Badge>);
    const badge = screen.getByText('Label only');
    expect(badge).not.toHaveAttribute('aria-label');
  });

  it('numeric badge with zero count renders and is labelled', () => {
    render(
      <Badge tone="neutral" aria-label="0 pending items">
        0
      </Badge>
    );
    expect(screen.getByLabelText('0 pending items')).toHaveTextContent('0');
  });
});

// ---------------------------------------------------------------------------
// Zero-count handling
// ---------------------------------------------------------------------------
describe('Badge — zero count', () => {
  it('renders a zero value without hiding the badge', () => {
    render(
      <Badge tone="info" aria-label="0 unread">
        0
      </Badge>
    );
    expect(screen.getByLabelText('0 unread')).toBeInTheDocument();
  });

  it('renders an explicit string zero', () => {
    render(<Badge aria-label="queue count 0">{'0'}</Badge>);
    expect(screen.getByLabelText('queue count 0')).toHaveTextContent('0');
  });
});

// ---------------------------------------------------------------------------
// className forwarding
// ---------------------------------------------------------------------------
describe('Badge — className prop', () => {
  it('merges extra classNames onto the root element', () => {
    render(
      <Badge className="extra-class another" aria-label="classed badge">
        Label
      </Badge>
    );
    const badge = screen.getByLabelText('classed badge');
    expect(badge).toHaveClass('badge');
    expect(badge).toHaveClass('extra-class');
    expect(badge).toHaveClass('another');
  });

  it('always carries the base badge class', () => {
    render(<Badge aria-label="base class badge">X</Badge>);
    expect(screen.getByLabelText('base class badge')).toHaveClass('badge');
  });

  it('does not add extra spaces when className is empty string', () => {
    render(<Badge className="" aria-label="no extra class">X</Badge>);
    expect(screen.getByLabelText('no extra class').className).toBe('badge');
  });
});

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------
describe('Badge — children rendering', () => {
  it('renders a plain string child', () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders a numeric child', () => {
    render(<Badge aria-label="count 42">42</Badge>);
    expect(screen.getByLabelText('count 42')).toHaveTextContent('42');
  });

  it('renders an element child', () => {
    render(
      <Badge aria-label="icon badge">
        <span data-testid="icon">★</span>
      </Badge>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Token-driven border
// ---------------------------------------------------------------------------
describe('Badge — token-driven border', () => {
  // jsdom does not resolve CSS custom properties from computed styles, but it
  // does preserve inline style values as-written. We read `el.style.border`
  // directly to confirm the correct token is threaded through the border prop.
  it('uses the correct border token for danger tone', () => {
    render(
      <Badge tone="danger" aria-label="danger badge">
        !
      </Badge>
    );
    expect(screen.getByLabelText('danger badge').style.border).toBe(
      '1px solid var(--danger)'
    );
  });

  it('uses the correct border token for success tone', () => {
    render(
      <Badge tone="success" aria-label="success badge">
        ✓
      </Badge>
    );
    expect(screen.getByLabelText('success badge').style.border).toBe(
      '1px solid var(--success)'
    );
  });

  it('uses the correct border token for info tone', () => {
    render(
      <Badge tone="info" aria-label="info badge">
        i
      </Badge>
    );
    expect(screen.getByLabelText('info badge').style.border).toBe(
      '1px solid var(--info)'
    );
  });
});
