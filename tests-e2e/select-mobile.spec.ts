import { test, expect, request } from '@playwright/test';
import { createLoja, createProduct } from './helpers';

test.describe('Combobox in Drawer Mobile & Desktop Tests', () => {
  let credentials: { email: string; password: string };
  let token: string;

  test.beforeAll(async () => {
    const prefix = `combo_${Date.now()}`;
    const setup = await createLoja(prefix);
    token = setup.token!;
    credentials = setup.ownerCredentials;

    // Enable trackStock in settings
    const reqContext = await request.newContext();
    await reqContext.put(`http://localhost:3000/api/settings`, {
      data: {
        products: {
          trackStock: true,
          lowStockAlert: true,
          defaultLowStockThreshold: 5,
        },
      },
      headers: {
        "Content-Type": "application/json",
        "Cookie": `token=${token}`,
      },
    });

    // Create 10 products
    for (let i = 1; i <= 10; i++) {
      await createProduct(token, {
        name: `Produto Especial Modelo ${i}`,
        salePrice: 50 + i * 5,
        costPrice: 20 + i,
        stock: 20,
      });
    }
  });

  test('1. Posicionamento, busca e dimensionamento correto no mobile (conectado ao trigger e sem overflow)', async ({ page, request }) => {
    // Mobile Viewport (iPhone standard)
    await page.setViewportSize({ width: 390, height: 844 });

    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { email: credentials.email, password: credentials.password },
    });
    const cookiesHeader = loginRes.headers()['set-cookie'] || '';
    const tokenVal = cookiesHeader.match(/token=([^;]+)/)?.[1];
    const userContextVal = cookiesHeader.match(/user_context=([^;]+)/)?.[1];

    await page.context().addCookies([
      { name: 'token', value: tokenVal || token, domain: 'localhost', path: '/' },
      ...(userContextVal ? [{ name: 'user_context', value: userContextVal, domain: 'localhost', path: '/' }] : []),
    ]);

    await page.goto('http://localhost:3000/estoque');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=controle de estoque está desativado')).not.toBeVisible({ timeout: 15000 });

    const openBtn = page.getByRole('button', { name: 'Registrar primeira movimentação' });
    await openBtn.waitFor({ state: 'visible', timeout: 10000 });
    await openBtn.click();

    const drawerTitle = page.locator('text=Nova Movimentação de Estoque').first();
    await expect(drawerTitle).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const comboboxTrigger = page.locator('[data-slot="combobox-trigger"]').first();
    await expect(comboboxTrigger).toBeVisible();

    const triggerBox = (await comboboxTrigger.boundingBox())!;
    console.log('Trigger box:', triggerBox);

    // Open combobox
    await comboboxTrigger.click();

    const popup = page.locator('[data-slot="popover-content"]').first();
    await expect(popup).toBeVisible();
    await page.waitForTimeout(200);

    const popupBox = (await popup.boundingBox())!;
    console.log('Popup box:', popupBox);

    // 1. Verify alignment: horizontal position matches trigger closely
    expect(Math.abs(popupBox.x - triggerBox.x)).toBeLessThanOrEqual(2);
    // 2. Verify width: popup width matches trigger width closely
    expect(Math.abs(popupBox.width - triggerBox.width)).toBeLessThanOrEqual(2);
    // 3. Verify positioning: popup is below trigger (top >= trigger.bottom)
    expect(popupBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1);
    // 4. Verify max height: popup height is bounded
    expect(popupBox.height).toBeLessThanOrEqual(300);

    // 5. Verify search functionality in Combobox
    const searchInput = page.locator('[data-slot="command-input"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Modelo 5');
    await page.waitForTimeout(150);

    // 6. Verify selection works: click filtered option
    const option5 = page.locator('[data-slot="command-item"]:has-text("Produto Especial Modelo 5")').first();
    await expect(option5).toBeVisible();
    await option5.click();

    // Verify popup closes after selection
    await expect(popup).not.toBeVisible();

    // Verify trigger value updated
    await expect(comboboxTrigger).toContainText('Produto Especial Modelo 5');

    // Verify drawer is still open
    await expect(drawerTitle).toBeVisible();
  });

  test('2. Comportamento com viewport baixo (flip para cima)', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 480 });

    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { email: credentials.email, password: credentials.password },
    });
    const cookiesHeader = loginRes.headers()['set-cookie'] || '';
    const tokenVal = cookiesHeader.match(/token=([^;]+)/)?.[1];
    const userContextVal = cookiesHeader.match(/user_context=([^;]+)/)?.[1];

    await page.context().addCookies([
      { name: 'token', value: tokenVal || token, domain: 'localhost', path: '/' },
      ...(userContextVal ? [{ name: 'user_context', value: userContextVal, domain: 'localhost', path: '/' }] : []),
    ]);

    await page.goto('http://localhost:3000/estoque');
    await page.waitForLoadState('networkidle');

    const openBtn = page.getByRole('button', { name: 'Registrar primeira movimentação' });
    await openBtn.waitFor({ state: 'visible', timeout: 10000 });
    await openBtn.click();

    const drawerTitle = page.locator('text=Nova Movimentação de Estoque').first();
    await expect(drawerTitle).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const comboboxTrigger = page.locator('[data-slot="combobox-trigger"]').first();
    await expect(comboboxTrigger).toBeVisible();

    const triggerBox = (await comboboxTrigger.boundingBox())!;

    // Open combobox
    await comboboxTrigger.click();

    const popup = page.locator('[data-slot="popover-content"]').first();
    await expect(popup).toBeVisible();
    await page.waitForTimeout(200);

    const popupBox = (await popup.boundingBox())!;
    console.log('Low viewport - Trigger box:', triggerBox);
    console.log('Low viewport - Popup box:', popupBox);

    // Verify popup remains within viewport bounds
    expect(popupBox.y).toBeGreaterThanOrEqual(0);
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(480);

    // Verify it flipped to top (above the trigger)
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(triggerBox.y + 2);

    // Close combobox by pressing Escape or clicking outside
    await page.keyboard.press('Escape');
    await expect(popup).not.toBeVisible();

    // Drawer should still be open
    await expect(drawerTitle).toBeVisible();
  });

  test('3. Comportamento no Desktop (sem regressão)', async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { email: credentials.email, password: credentials.password },
    });
    const cookiesHeader = loginRes.headers()['set-cookie'] || '';
    const tokenVal = cookiesHeader.match(/token=([^;]+)/)?.[1];
    const userContextVal = cookiesHeader.match(/user_context=([^;]+)/)?.[1];

    await page.context().addCookies([
      { name: 'token', value: tokenVal || token, domain: 'localhost', path: '/' },
      ...(userContextVal ? [{ name: 'user_context', value: userContextVal, domain: 'localhost', path: '/' }] : []),
    ]);

    await page.goto('http://localhost:3000/estoque');
    await page.waitForLoadState('networkidle');

    // In desktop, it opens Dialog
    const openBtn = page.getByRole('button', { name: 'Registrar primeira movimentação' });
    await openBtn.waitFor({ state: 'visible', timeout: 10000 });
    await openBtn.click();

    // Verify Dialog is open
    const dialogTitle = page.locator('text=Nova Movimentação de Estoque').first();
    await expect(dialogTitle).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const comboboxTrigger = page.locator('[data-slot="combobox-trigger"]').first();
    await expect(comboboxTrigger).toBeVisible();

    const triggerBox = (await comboboxTrigger.boundingBox())!;

    // Open combobox
    await comboboxTrigger.click();

    const popup = page.locator('[data-slot="popover-content"]').first();
    await expect(popup).toBeVisible();
    await page.waitForTimeout(200);

    const popupBox = (await popup.boundingBox())!;
    console.log('Desktop - Trigger box:', triggerBox);
    console.log('Desktop - Popup box:', popupBox);

    // Verify alignment
    expect(Math.abs(popupBox.x - triggerBox.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(popupBox.width - triggerBox.width)).toBeLessThanOrEqual(2);
    expect(popupBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1);

    // Select an option
    const option3 = page.locator('[data-slot="command-item"]:has-text("Produto Especial Modelo 3")').first();
    await option3.click();

    await expect(popup).not.toBeVisible();
    await expect(comboboxTrigger).toContainText('Produto Especial Modelo 3');
    await expect(dialogTitle).toBeVisible();
  });
});
