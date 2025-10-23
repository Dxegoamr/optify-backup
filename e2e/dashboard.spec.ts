import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.route('**/onAuthStateChanged', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            uid: 'test-user-id',
            email: 'test@example.com',
            displayName: 'Test User',
          },
        }),
      });
    });

    // Mock user profile
    await page.route('**/users/test-user-id', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plano: 'ultimate',
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard with sidebar', async ({ page }) => {
    await expect(page.getByText('Optify')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Gestão de Funcionários')).toBeVisible();
    await expect(page.getByText('Pagamentos')).toBeVisible();
    await expect(page.getByText('Relatórios')).toBeVisible();
  });

  test('should display current plan in sidebar', async ({ page }) => {
    await expect(page.getByText('Plano Atual')).toBeVisible();
    await expect(page.getByText('Ultimate')).toBeVisible();
  });

  test('should navigate to different pages from sidebar', async ({ page }) => {
    // Navigate to employees page
    await page.getByText('Gestão de Funcionários').click();
    await expect(page).toHaveURL('/gestao-funcionarios');
    
    // Navigate to payments page
    await page.getByText('Pagamentos').click();
    await expect(page).toHaveURL('/pagamentos');
    
    // Navigate to reports page
    await page.getByText('Relatórios').click();
    await expect(page).toHaveURL('/relatorios');
    
    // Navigate back to dashboard
    await page.getByText('Dashboard').click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display logout confirmation dialog', async ({ page }) => {
    await page.getByText('Sair').click();
    
    await expect(page.getByText('Confirmar Logout')).toBeVisible();
    await expect(page.getByText('Tem certeza que deseja sair da sua conta?')).toBeVisible();
    
    // Cancel logout
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText('Confirmar Logout')).not.toBeVisible();
  });

  test('should logout when confirmed', async ({ page }) => {
    // Mock logout
    await page.route('**/signOut', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.getByText('Sair').click();
    await page.getByRole('button', { name: /confirmar/i }).click();
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Sidebar should be hidden on mobile
    await expect(page.getByText('Gestão de Funcionários')).not.toBeVisible();
    
    // Hamburger menu should be visible
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    
    // Click hamburger menu to open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Sidebar should now be visible
    await expect(page.getByText('Gestão de Funcionários')).toBeVisible();
    
    // Click overlay to close sidebar
    await page.click('body', { position: { x: 300, y: 100 } });
    
    // Sidebar should be hidden again
    await expect(page.getByText('Gestão de Funcionários')).not.toBeVisible();
  });

  test('should display admin panel for admin users', async ({ page }) => {
    // Mock admin user
    await page.route('**/onAuthStateChanged', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            uid: 'admin-user-id',
            email: 'admin@example.com',
            displayName: 'Admin User',
          },
          isAdmin: true,
        }),
      });
    });

    await page.goto('/dashboard');
    
    // Admin panel should be visible
    await expect(page.getByText('Painel Admin')).toBeVisible();
    
    // Click on admin panel
    await page.getByText('Painel Admin').click();
    await expect(page).toHaveURL('/admin');
  });

  test('should not display admin panel for regular users', async ({ page }) => {
    // Admin panel should not be visible for regular users
    await expect(page.getByText('Painel Admin')).not.toBeVisible();
  });
});
