import { expect, test } from '@playwright/test';

test.describe('Login', () => {
  test('muestra formulario de acceso FlowPay', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('FlowPay')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /iniciar sesión/i }),
    ).toBeVisible();
  });
});
