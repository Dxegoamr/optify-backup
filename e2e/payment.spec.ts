import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
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
          plano: 'free',
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
    });
  });

  test('should display plans page', async ({ page }) => {
    await page.goto('/planos');
    
    await expect(page.getByText('Escolha o Plano Ideal')).toBeVisible();
    await expect(page.getByText('Free')).toBeVisible();
    await expect(page.getByText('Standard')).toBeVisible();
    await expect(page.getByText('Medium')).toBeVisible();
    await expect(page.getByText('Ultimate')).toBeVisible();
  });

  test('should switch between monthly and annual billing', async ({ page }) => {
    await page.goto('/planos');
    
    // Verificar que está em mensal por padrão
    await expect(page.getByText('Mensal')).toBeVisible();
    
    // Clicar no switch para anual
    await page.getByRole('switch').click();
    
    // Verificar que mudou para anual
    await expect(page.getByText('Anual')).toBeVisible();
    
    // Verificar que exibe economia
    await expect(page.getByText(/economia/i)).toBeVisible();
  });

  test('should display plan features', async ({ page }) => {
    await page.goto('/planos');
    
    // Verificar que exibe features dos planos
    await expect(page.getByText(/funcionário/i)).toBeVisible();
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    await expect(page.getByText(/suporte/i)).toBeVisible();
  });

  test('should initiate payment process', async ({ page }) => {
    // Mock da criação de preference
    await page.route('**/createPaymentPreference', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          init_point: 'https://mercadopago.com/checkout/test',
          id: 'pref-123',
        }),
      });
    });

    await page.goto('/planos');
    
    // Clicar no botão de upgrade do plano Standard
    const upgradeButtons = await page.getByRole('button', { name: /escolher/i }).all();
    if (upgradeButtons.length > 1) {
      await upgradeButtons[1].click();
    }
    
    // Verificar que inicia o processo de pagamento
    // (pode redirecionar ou abrir modal)
  });

  test('should display payment result - success', async ({ page }) => {
    await page.goto('/payment/success?payment_id=12345&status=approved');
    
    await expect(page.getByText(/sucesso/i)).toBeVisible();
    await expect(page.getByText(/pagamento aprovado/i)).toBeVisible();
  });

  test('should display payment result - failure', async ({ page }) => {
    await page.goto('/payment/failure?payment_id=12345&status=rejected');
    
    await expect(page.getByText(/erro/i)).toBeVisible();
    await expect(page.getByText(/pagamento não foi aprovado/i)).toBeVisible();
  });

  test('should display payment result - pending', async ({ page }) => {
    await page.goto('/payment/pending?payment_id=12345&status=pending');
    
    await expect(page.getByText(/pendente/i)).toBeVisible();
    await expect(page.getByText(/aguardando/i)).toBeVisible();
  });

  test('should navigate back to dashboard from payment result', async ({ page }) => {
    await page.goto('/payment/success?payment_id=12345&status=approved');
    
    // Clicar no botão de voltar ao dashboard
    await page.getByRole('button', { name: /dashboard/i }).click();
    
    await expect(page).toHaveURL('/dashboard');
  });
});
