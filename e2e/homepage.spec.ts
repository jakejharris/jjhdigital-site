import { expect, test, type Page } from '@playwright/test';

const fonts = ['Rubik', 'Work Sans', 'Bebas Neue', 'Unbounded', 'Monoton', 'Gloock'];

async function paper(page: Page) {
  return page.locator('html').evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--homepage-background').trim()
  );
}

async function expectFits(page: Page) {
  const sizes = await page.getByRole('button', { name: 'Shuffle the style' }).evaluate((el) => ({
    wordmark: el.scrollWidth,
    available: el.parentElement!.clientWidth,
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(sizes.wordmark).toBeLessThanOrEqual(sizes.available);
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
}

for (const width of [320, 375, 768, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1000 });

    test('public page, shuffle, undo, and every curated font fit', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      // A fixed draw walks the curated fonts in order rather than hoping a
      // random run happens to visit the widest faces.
      await page.addInitScript(() => { Math.random = () => 0; });
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
      await expect(page).toHaveTitle('JJH DIGITAL LLC');
      await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
      await expect(page.getByText('Local style lab')).toHaveCount(0);
      await expectFits(page);

      await page.waitForFunction(async (families) => {
        const faces = await Promise.all(families.map((font) =>
          document.fonts.load(`400 108px "${font}"`, 'JJH DIGITAL LLC')
        ));
        return faces.every((list) => list.length > 0 && list.every((face) => face.status === 'loaded'));
      }, fonts, { timeout: 30_000 });

      const initial = await paper(page);
      const shuffle = page.getByRole('button', { name: 'Shuffle the style' });
      for (const font of fonts) {
        if (width < 1000) await shuffle.tap();
        else await shuffle.click();
        await expect(shuffle).toHaveCSS('font-family', new RegExp(font));
        await expectFits(page);
      }

      await shuffle.press('Shift+Space');
      await expect(shuffle).toHaveCSS('font-family', /Monoton/);
      // Move through undo to the original paper and default face.
      for (let i = 0; i < fonts.length - 1; i++) await shuffle.press('Shift+Space');
      expect(await paper(page)).toBe(initial);
      await expectFits(page);
      expect(errors).toEqual([]);
    });
  });
}

test('contact copies the address and announces success', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy jake@jjhdigital.com to clipboard' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied to clipboard');
  await expect(page.getByRole('status')).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('jake@jjhdigital.com');
});

test('contact offers email when clipboard access fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('Clipboard unavailable')) },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy jake@jjhdigital.com to clipboard' }).click();
  await expect(page.getByRole('link', { name: 'Open your email app instead' }))
    .toHaveAttribute('href', 'mailto:jake@jjhdigital.com');
});

test('first visit still identifies the company and provides contact without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3100/');
  await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Send an email' })).toHaveAttribute('href', 'mailto:jake@jjhdigital.com');
  await context.close();
});

test('font failure preserves a readable wordmark and working contact', async ({ page }) => {
  await page.route('**/api/font-lab?**', (route) => route.fulfill({ status: 502, body: 'Unavailable' }));
  await page.goto('/');
  const shuffle = page.getByRole('button', { name: 'Shuffle the style' });
  const before = await shuffle.evaluate((el) => getComputedStyle(el).fontFamily);
  await shuffle.click();
  await expect(shuffle).toHaveCSS('font-family', before);
  await expectFits(page);
  await expect(page.getByRole('button', { name: /Copy jake/ })).toBeVisible();
});

test('only the public surface and curated font API ship', async ({ request }) => {
  for (const path of ['/dashboard', '/sign-in', '/pricing', '/testPages']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  for (const family of ['not-a-font', 'Roboto']) {
    expect((await request.get('/api/font-lab', { params: { family, asset: 'css' } })).status()).toBe(400);
  }
  const css = await request.get('/api/font-lab', { params: { family: 'Rubik', asset: 'css' } });
  expect(css.status()).toBe(200);
  expect(css.headers()['cache-control']).toContain('public');
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  const social = await request.get('/opengraph-image');
  expect(social.status()).toBe(200);
  expect(social.headers()['content-type']).toContain('image/png');
});
