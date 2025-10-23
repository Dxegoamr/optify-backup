import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { Button } from './button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    render(
      <div>
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    );

    expect(screen.getByRole('button', { name: /default/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /destructive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /outline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /secondary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ghost/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /link/i })).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    render(
      <div>
        <Button size="default">Default</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">Icon</Button>
      </div>
    );

    expect(screen.getByRole('button', { name: /default/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /small/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /large/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /icon/i })).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByRole('button', { name: /click me/i }).click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a custom element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    expect(screen.getByRole('link', { name: /link button/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /link button/i })).toHaveAttribute('href', '/test');
  });
});
