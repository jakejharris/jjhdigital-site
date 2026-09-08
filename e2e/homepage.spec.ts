import { expect, test, type Page } from '@playwright/test';

const fonts = ['Work Sans', 'Gloock', 'Unbounded', 'Monoton', 'Bebas Neue'];
const moodColors = ['#1738cd', '#f1e6dc', '#e8ece3', '#252522', '#f3cf61'];
const type = (page: Page) => page.locator('.wordmark-type');
const shuffle = (page: Page) => page.getByRole('button', { name: 'Shuffle the style' });

async function paper(page: Page) {
  return page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--homepage-background').trim());
}
async function warmFonts(page: Page) {
  await page.waitForFunction((families) => families.every((font) =>
    [...document.fonts].some((face) => face.family.replaceAll('"', '') === font && face.status === 'loaded')
  ), fonts);
}
async function expectFits(page: Page) {
  const sizes = await type(page).evaluate((el) => ({
    type: el.scrollWidth,
    glyphLine: Math.max(...Array.from(el.children, (child) => child.getBoundingClientRect().width)),
    available: el.parentElement!.clientWidth,
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(sizes.type).toBeLessThanOrEqual(sizes.available);
  expect(sizes.glyphLine).toBeLessThanOrEqual(sizes.available);
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
}
async function noteBox(page: Page) {
  return page.locator('.letterhead-note').boundingBox();
}

for (const width of [320, 321, 390, 639, 640, 768, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1000 });

    test('all moods fit and leave the reading layout still; touch and keyboard undo restore the original', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
      await expect(page).toHaveTitle('JJH DIGITAL LLC');
      await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
      await expect(page.getByText('Local style lab')).toHaveCount(0);
      await warmFonts(page);
      await page.evaluate(() => { Math.random = () => 0; });
      await expectFits(page);
      const initialPaper = await paper(page);
      const initialType = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
      const originalBox = await noteBox(page);

      for (const [index, font] of fonts.entries()) {
        if (width < 1000) await shuffle(page).tap();
        else await shuffle(page).click();
        await expect(type(page)).toHaveCSS('font-family', new RegExp(font));
        expect(await paper(page)).toBe(moodColors[index]);
        await expectFits(page);
        expect(await noteBox(page)).toEqual(originalBox);
      }

      const previous = page.getByRole('button', { name: 'Previous style' });
      if (width < 1000) await previous.tap();
      else await previous.click();
      await expect(type(page)).toHaveCSS('font-family', /Monoton/);
      for (let i = 0; i < fonts.length - 1; i++) await shuffle(page).press('Shift+Space');
      expect(await paper(page)).toBe(initialPaper);
      await expect(type(page)).toHaveCSS('font-family', initialType);
      await expect(previous).toHaveCount(0);
      await expectFits(page);
      expect(await noteBox(page)).toEqual(originalBox);
      expect(errors).toEqual([]);
    });
  });
}

test('contact copies, announces success, and leaves the letterhead in place', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await warmFonts(page);
  const box = await noteBox(page);
  await page.getByRole('button', { name: 'Copy jake@jjhdigital.com to clipboard' }).click();
  await expect(page.getByRole('status', { name: 'Contact' })).toHaveText('Copied to clipboard');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('jake@jjhdigital.com');
  expect(await noteBox(page)).toEqual(box);
});

test('clipboard failure offers a 44px email link without moving the letterhead', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Unavailable')) } });
  });
  await page.goto('/');
  await warmFonts(page);
  const box = await noteBox(page);
  await page.getByRole('button', { name: /Copy jake/ }).click();
  const fallback = page.getByRole('link', { name: 'Open your email app instead' });
  await expect(fallback).toHaveAttribute('href', 'mailto:jake@jjhdigital.com');
  expect((await fallback.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await noteBox(page)).toEqual(box);
});

test('first visit is legible and contact works without JavaScript or loaded fonts', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  await page.route('**/*.woff2', (route) => route.abort());
  await page.goto('http://127.0.0.1:3100/');
  await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Send an email' })).toHaveAttribute('href', 'mailto:jake@jjhdigital.com');
  await expect(page.getByRole('button', { name: /Copy jake/ })).toHaveCount(0);
  await expectFits(page);
  await context.close();
});

test('failed font keeps the complete current mood; another choice still works', async ({ page }) => {
  await page.route('**/fonts/work-sans-wordmark.woff2', (route) => route.abort());
  await page.goto('/');
  await page.waitForFunction(() => [...document.fonts].some((face) => face.family === 'Gloock' && face.status === 'loaded'));
  await page.evaluate(() => { Math.random = () => 0; });
  const before = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
  const initialPaper = await paper(page);
  await shuffle(page).click();
  await expect(page.getByText('Try another mood', { exact: true })).toBeVisible();
  await expect(type(page)).toHaveCSS('font-family', before);
  expect(await paper(page)).toBe(initialPaper);
  await shuffle(page).click();
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  await page.getByRole('button', { name: 'Previous style' }).click();
  expect(await paper(page)).toBe(initialPaper);
  await expectFits(page);
});

test('a slow font never paints half a mood or overwrites a newer choice', async ({ page }) => {
  let releaseFont!: () => void;
  const gate = new Promise<void>((resolve) => { releaseFont = resolve; });
  await page.route('**/fonts/work-sans-wordmark.woff2', async (route) => { await gate; await route.continue(); });
  await page.goto('/');
  await page.waitForFunction(() => [...document.fonts].some((face) => face.family === 'Gloock' && face.status === 'loaded'));
  await page.evaluate(() => { Math.random = () => 0; });
  const initialPaper = await paper(page);
  const originalType = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
  await shuffle(page).click();
  await expect(shuffle(page)).toHaveAttribute('aria-busy', 'true');
  expect(await paper(page)).toBe(initialPaper);
  await expect(type(page)).toHaveCSS('font-family', originalType);
  await shuffle(page).click();
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  releaseFont();
  await warmFonts(page);
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  expect(await paper(page)).toBe('#f1e6dc');
  await shuffle(page).press('Shift+Space');
  await expect(type(page)).toHaveCSS('font-family', originalType);
});

test('Space shortcuts respect focus and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await warmFonts(page);
  await page.evaluate(() => { Math.random = () => 0; });
  const initialPaper = await paper(page);
  await page.keyboard.press('Space');
  await expect(type(page)).toHaveCSS('font-family', /Work Sans/);
  await expect(type(page)).toHaveCSS('transition-property', 'none');
  expect(await type(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.keyboard.press('Shift+Space');
  expect(await paper(page)).toBe(initialPaper);
  await page.keyboard.press('Tab');
  await expect(shuffle(page)).toBeFocused();
  await expect(shuffle(page)).toHaveCSS('outline-style', 'solid');
  await shuffle(page).press('Space');
  await expect(type(page)).toHaveCSS('font-family', /Work Sans/);
  await shuffle(page).press('Shift+Space');
  expect(await paper(page)).toBe(initialPaper);
  const change = page.getByRole('button', { name: 'Change the mood', exact: true });
  await change.press('Space');
  await expect(type(page)).toHaveCSS('font-family', /Work Sans/);
  await page.keyboard.down('Shift');
  await page.keyboard.down('Space');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Space');
  expect(await paper(page)).toBe(initialPaper);
  const copy = page.getByRole('button', { name: /Copy jake/ });
  await copy.focus();
  await copy.press('Space');
  expect(await paper(page)).toBe(initialPaper);
  await page.setViewportSize({ width: 320, height: 400 });
  await page.evaluate(() => { (document.activeElement as HTMLElement).blur(); scrollTo(0, 0); });
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(type(page)).toHaveCSS('font-family', /Work Sans/);
  expect(await page.evaluate(() => scrollY)).toBe(0);

});

test('production serves bundled fonts and leaves the lab private to development', async ({ request }) => {
  for (const path of ['/dashboard', '/sign-in', '/pricing', '/testPages', '/api/font-lab?family=Roboto&asset=css', '/api/font-lab?family=Work+Sans&asset=font']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.get('/fonts/work-sans-wordmark.woff2')).status()).toBe(200);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  const social = await request.get('/opengraph-image');
  expect(social.status()).toBe(200);
  expect(social.headers()['content-type']).toContain('image/png');
});
