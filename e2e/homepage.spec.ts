import { expect, test, type Page } from '@playwright/test';
import { homepageMoods, homepagePalettes, surfaceTreatments } from '../lib/homepage-design/choices';

const fonts = ['Work Sans', 'Gloock', 'Unbounded', 'Monoton', 'Bebas Neue'];
const moodColors = ['#1738cd', '#f1e6dc', '#e8ece3', '#252522', '#f3cf61'];
const type = (page: Page) => page.locator('.wordmark-type');
const shuffle = (page: Page) => page.getByRole('button', { name: 'Shuffle the style' });
const rotate = (page: Page) => page.getByRole('button', { name: 'Next style' });

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
  const digital = (await page.locator('.wordmark-digital').boundingBox())!;
  const llc = (await page.locator('.wordmark-llc').boundingBox())!;
  expect(llc.x).toBeGreaterThanOrEqual(digital.x + digital.width);
  expect(llc.y).toBeGreaterThan(digital.y);
  expect(llc.y + llc.height).toBeLessThanOrEqual(digital.y + digital.height + 1);
  if (await rotate(page).isVisible()) {
    const control = (await rotate(page).boundingBox())!;
    const masthead = (await page.locator('.masthead').boundingBox())!;
    expect(control.x + control.width).toBe(masthead.x + masthead.width);
    expect(control.y + control.height).toBeLessThan((await shuffle(page).boundingBox())!.y);
  }
}
async function noteBox(page: Page) {
  return page.locator('.letterhead-note').boundingBox();
}

async function drawOriginalMoods(page: Page) {
  let previous = 0;
  const draws = fonts.map((fontName, index) => {
    const next = homepageMoods.findIndex((mood) => mood.fontName === fontName &&
      mood.style.palette === index + 1 && mood.style.surface === (index === 0 ? 1 : 0));
    const draw = (next - previous - .5) / (homepageMoods.length - 1);
    previous = next;
    return draw;
  });
  await page.evaluate((values) => { Math.random = () => values.shift() ?? 0; }, draws);
}

for (const width of [320, 1440]) {
  test(`all 216 combinations render distinctly at ${width}px and undo restores a same-font variation`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await warmFonts(page);
    await page.evaluate(() => { Math.random = () => 0; });
    const originalBox = await noteBox(page);
    const rendered = new Set<string>();

    // The smallest draw steps through the entire catalog, then returns home.
    for (const [index, mood] of homepageMoods.entries()) {
      const palette = homepagePalettes[mood.style.palette];
      const surface = surfaceTreatments[mood.style.surface];
      const css = await type(page).evaluate((el) => {
        const root = getComputedStyle(document.documentElement);
        return {
          font: getComputedStyle(el).fontFamily,
          paper: root.getPropertyValue('--homepage-background').trim(),
          surface: root.getPropertyValue('--homepage-surface-image').trim(),
          paintedSurface: getComputedStyle(document.querySelector('.letterhead')!).backgroundImage,
        };
      });
      // Next gives the default local font a generated family name.
      if (mood.fontName !== 'Cormorant Garamond') expect(css.font).toContain(mood.fontName);
      expect(css.paper).toBe(palette.background);
      expect(css.surface).toBe(surface.image.replaceAll('var(--homepage-grid)', palette.grid));
      expect(css.paintedSurface === 'none').toBe(surface.image === 'none');
      rendered.add(JSON.stringify(css));
      await expectFits(page);
      expect(await noteBox(page)).toEqual(originalBox);
      await rotate(page).evaluate((button: HTMLButtonElement) => button.click());
      const next = homepageMoods[(index + 1) % homepageMoods.length];
      await expect(page.getByRole('status', { name: 'Style' })).toHaveText(
        `${homepagePalettes[next.style.palette].name}, ${next.fontName}, ${surfaceTreatments[next.style.surface].name}.`
      );
    }
    expect(rendered.size).toBe(216);
    expect(await paper(page)).toBe('#f6f4ee');

    // Select a different paper while keeping the same face. Undo must use
    // the full snapshot, not just a font name.
    const targetIndex = homepageMoods.findIndex((mood) =>
      mood.fontName === 'Cormorant Garamond' && mood.style.palette === 10 && mood.style.surface === 2
    );
    const draw = (targetIndex - .5) / (homepageMoods.length - 1);
    const originalType = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
    await page.evaluate((value) => { Math.random = () => value; }, draw);
    await rotate(page).click();
    expect(await paper(page)).toBe('#dceeed');
    await expect(type(page)).toHaveCSS('font-family', originalType);
    await expect(page.getByRole('status', { name: 'Style' })).toHaveText('Glacier, Cormorant Garamond, Dot paper.');
    await rotate(page).press('Shift+Space');
    expect(await paper(page)).toBe('#f6f4ee');
    await expect(page.locator('.letterhead')).toHaveCSS('background-image', 'none');
    await expect(type(page)).toHaveCSS('font-family', originalType);
    await expect(page.getByRole('status', { name: 'Style' })).toHaveText('Ivory, Cormorant Garamond, Plain restored.');
  });
}

for (const width of [320, 321, 390, 639, 640, 768, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1000 });

    test('wordmark and rotation control change the whole masthead without moving the reading layout; keyboard undo restores it', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
      await expect(page).toHaveTitle('JJH DIGITAL LLC | Jake Harris');
      await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
      await expect(page.getByText('Local style lab')).toHaveCount(0);
      await warmFonts(page);
      await drawOriginalMoods(page);
      await expectFits(page);
      const initialPaper = await paper(page);
      const initialType = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
      const originalBox = await noteBox(page);
      const llc = page.locator('.wordmark-llc');
      await expect(llc).toHaveCSS('font-family', initialType);
      expect(await llc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
      expect(await llc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(
        await type(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize) / 2)
      );
      await expect(page.locator('.mood-controls button')).toHaveCount(1);
      await expect(page.getByText('Change the mood', { exact: true })).toHaveCount(0);
      expect((await rotate(page).boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect((await rotate(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);

      for (const [index, font] of fonts.entries()) {
        const control = index % 2 === 0 ? rotate(page) : shuffle(page);
        if (width < 1000) await control.tap();
        else await control.click();
        await expect(type(page)).toHaveCSS('font-family', new RegExp(font));
        await expect(llc).toHaveCSS('font-family', new RegExp(font));
        await expect(llc).toHaveCSS('color', await type(page).evaluate((el) => getComputedStyle(el).color));
        expect(await paper(page)).toBe(moodColors[index]);
        await expectFits(page);
        expect(await noteBox(page)).toEqual(originalBox);
      }

      await rotate(page).press('Shift+Space');
      await expect(type(page)).toHaveCSS('font-family', /Monoton/);
      for (let i = 0; i < fonts.length - 1; i++) await shuffle(page).press('Shift+Space');
      expect(await paper(page)).toBe(initialPaper);
      await expect(type(page)).toHaveCSS('font-family', initialType);
      await expect(llc).toHaveCSS('font-family', initialType);
      await expectFits(page);
      expect(await noteBox(page)).toEqual(originalBox);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('pointer and keyboard shuffle', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('repeated clicks and taps followed by Space leave no box around the wordmark', async ({ page }) => {
    await page.goto('/');
    await warmFonts(page);
    await page.evaluate(() => { Math.random = () => 0; });

    for (const input of ['mouse', 'touch']) {
      if (input === 'mouse') await shuffle(page).click({ clickCount: 5, delay: 20 });
      else for (let i = 0; i < 5; i++) await shuffle(page).tap();
      await expect(shuffle(page)).not.toBeFocused();
      await expect(shuffle(page)).toHaveCSS('outline-style', 'none');

      const before = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
      await page.keyboard.press('Space');
      await expect(type(page)).not.toHaveCSS('font-family', before);
      await expect(shuffle(page)).toHaveCSS('outline-style', 'none');
      await page.keyboard.press('Shift+Space');
      await expect(type(page)).toHaveCSS('font-family', before);
      await expect(shuffle(page)).toHaveCSS('outline-style', 'none');
    }
  });
});

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
  await page.setViewportSize({ width: 320, height: 812 });
  await page.route('**/fonts/work-sans-wordmark.woff2', (route) => route.abort());
  await page.goto('/');
  await page.waitForFunction(() => [...document.fonts].some((face) => face.family === 'Gloock' && face.status === 'loaded'));
  await drawOriginalMoods(page);
  const before = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
  const initialPaper = await paper(page);
  await shuffle(page).click();
  await expect(page.getByText('Style unavailable. Try again.', { exact: true })).toBeVisible();
  const errorBox = (await page.locator('.mood-error').boundingBox())!;
  const llcBox = (await page.locator('.wordmark-llc').boundingBox())!;
  const controlBox = (await rotate(page).boundingBox())!;
  expect(errorBox.y + errorBox.height).toBeLessThan(llcBox.y);
  expect(errorBox.x + errorBox.width).toBeLessThan(controlBox.x);
  expect(errorBox.y + errorBox.height).toBeLessThan((await noteBox(page))!.y);
  await expect(type(page)).toHaveCSS('font-family', before);
  expect(await paper(page)).toBe(initialPaper);
  await shuffle(page).click();
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  await rotate(page).press('Shift+Space');
  expect(await paper(page)).toBe(initialPaper);
  await expectFits(page);
});

test('a slow font never paints half a mood or overwrites a newer choice', async ({ page }) => {
  let releaseFont!: () => void;
  const gate = new Promise<void>((resolve) => { releaseFont = resolve; });
  await page.route('**/fonts/work-sans-wordmark.woff2', async (route) => { await gate; await route.continue(); });
  await page.goto('/');
  await page.waitForFunction(() => [...document.fonts].some((face) => face.family === 'Gloock' && face.status === 'loaded'));
  await drawOriginalMoods(page);
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
  await expect(shuffle(page)).toBeFocused();
  await expect(shuffle(page)).toHaveCSS('outline-style', 'solid');
  await shuffle(page).press('Shift+Space');
  expect(await paper(page)).toBe(initialPaper);
  const change = rotate(page);
  await change.press('Space');
  await expect(type(page)).toHaveCSS('font-family', /Work Sans/);
  await expect(page.locator('.mood-rotate-glyph')).toHaveCSS('transform', 'none');
  expect(await page.locator('.masthead').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
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
