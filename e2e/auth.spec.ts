import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveTitle(/Optify/);
    await expect(page.getByRole('heading', { name: /entrar/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('should display signup page', async ({ page }) => {
    await page.goto('/signup');
    
    await expect(page).toHaveTitle(/Optify/);
    await expect(page.getByRole('heading', { name: /criar conta/i })).toBeVisible();
    await expect(page.getByPlaceholder(/nome/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /criar conta/i })).toBeVisible();
  });

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login');
    
    // Click on signup link
    await page.getByText(/criar conta/i).click();
    await expect(page).toHaveURL('/signup');
    
    // Click on login link
    await page.getByText(/já tem uma conta/i).click();
    await expect(page).toHaveURL('/login');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/email é obrigatório/i)).toBeVisible();
    await expect(page.getByText(/senha é obrigatória/i)).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    // Enter invalid email
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/senha/i).fill('password123');
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/email inválido/i)).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock successful login
    await page.route('**/signInWithEmailAndPassword', (route) => {
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

    await page.goto('/login');
    
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/senha/i).fill('password123');
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle login errors', async ({ page }) => {
    // Mock login error
    await page.route('**/signInWithEmailAndPassword', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'auth/user-not-found',
          },
        }),
      });
    });

    await page.goto('/login');
    
    await page.getByPlaceholder(/email/i).fill('nonexistent@example.com');
    await page.getByPlaceholder(/senha/i).fill('password123');
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Should show error message
    await expect(page.getByText(/usuário não encontrado/i)).toBeVisible();
  });
});
