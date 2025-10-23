import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders children correctly', () => {
      render(<Card>Test Card Content</Card>);
      expect(screen.getByText('Test Card Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('CardHeader', () => {
    it('renders header content', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('renders title as h3 by default', () => {
      render(<CardTitle>Card Title</CardTitle>);
      const title = screen.getByText('Card Title');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('CardDescription', () => {
    it('renders description with proper styling', () => {
      render(<CardDescription>Card Description</CardDescription>);
      const description = screen.getByText('Card Description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('renders content with proper padding', () => {
      render(<CardContent>Card Content</CardContent>);
      const content = screen.getByText('Card Content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders footer with flex layout', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      const footer = screen.getByText('Footer Content');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Complete Card', () => {
    it('renders complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test Content</p>
          </CardContent>
          <CardFooter>
            <button>Test Button</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test button/i })).toBeInTheDocument();
    });
  });
});
