import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Extender expect com toHaveNoViolations
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('Button component should not have a11y violations', async () => {
    const { container } = render(
      <Button>Click me</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Button with icon should have aria-label', async () => {
    const { container } = render(
      <Button aria-label="Save changes">
        <span>💾</span>
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Card component should not have a11y violations', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content</p>
        </CardContent>
      </Card>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input with Label should not have a11y violations', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Form should have proper labels and associations', async () => {
    const { container } = render(
      <form>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" type="text" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
        <Button type="submit">Enviar</Button>
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Interactive elements should have sufficient color contrast', async () => {
    const { container } = render(
      <div>
        <Button variant="default">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Button variant="ghost">Ghost Button</Button>
        <Button variant="destructive">Destructive Button</Button>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Navigation should have proper landmarks', async () => {
    const { container } = render(
      <div>
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/settings">Settings</a></li>
          </ul>
        </nav>
        <main>
          <h1>Main Content</h1>
          <p>Content goes here</p>
        </main>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
