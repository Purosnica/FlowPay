import { expect, test } from '@playwright/test';

const email =
  process.env.E2E_COBRADOR_EMAIL ?? 'cobrador@flowpay.com';
const password = process.env.E2E_COBRADOR_PASSWORD ?? 'cobrador123';
const skipAuth = process.env.E2E_SKIP_AUTH === '1';

test.describe('Login autenticado (T-01)', () => {
  test('cobrador inicia sesión y llega al dashboard', async ({ page }) => {
    test.skip(
      skipAuth,
      'E2E_SKIP_AUTH=1 — omitir login real (CI sin BD seed)',
    );

    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 30_000 });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Cobrador no exige MFA; si falla auth (BD vacía), el test falla localmente.
    await expect(page).toHaveURL(/\/(dashboard|perfil|cobranza)/, {
      timeout: 45_000,
    });
    await expect(page.getByText(/FlowPay|Mi día|Dashboard|Bandeja/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
