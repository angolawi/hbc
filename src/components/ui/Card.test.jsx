import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, Badge } from './Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div data-testid="child">Test Child</div>
      </Card>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    const card = screen.getByText('Content');
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('bg-zinc-950/50');
  });
});

describe('Badge Component', () => {
  it('renders correctly with default variant', () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText('New');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-zinc-800');
  });

  it('applies variant classes', () => {
    render(<Badge variant="cyan">Cool</Badge>);
    const badge = screen.getByText('Cool');
    expect(badge).toHaveClass('bg-zinc-800/80');
  });
});
