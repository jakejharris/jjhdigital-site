import { expect, test, type Page } from '@playwright/test';
import {
  allPalettes, describeMood, foilPalette, homepageMoods, homepagePalettes, homepageTypefaces,
  moodForNumber, moodNumber, nextHomepageMood, secretNumber, surfaceTreatments,
} from '../lib/homepage-design/choices';

const fonts = ['Work Sans', 'Gloock', 'Unbounded', 'Monoton', 'Bebas Neue'];
const type = (page: Page) => page.locator('.wordmark-type');
const name = (page: Page) => page.getByRole('button', { name: 'Change the mood' });
const die = (page: Page) => page.getByRole('button', { name: 'Roll the die' });
const status = (page: Page) => page.getByRole('status', { name: 'Mood' });

async function paper(page: Page) {
  return page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--homepage-background').trim());
}
async function warmFonts(page: Page) {
  await page.waitForFunction((families) => families.every((font) =>
    [...document.fonts].some((face) => face.family.replaceAll('"', '') === font && face.status === 'loaded')
  ), fonts);
}
// The mood on screen, read from what a visitor sees or shares: the address,
// the die, the paper, and the face.
async function expectMood(page: Page, number: number) {
  const mood = moodForNumber(number)!;
  if (number === 1) await expect(page).not.toHaveURL(/#/);
  else await expect(page).toHaveURL(new RegExp(`#${number}$`));
  const face = homepageTypefaces.findIndex((candidate) => candidate.fontName === mood.fontName) + 1;
  await expect(page.locator('.die')).toHaveAttribute('data-pips', String(number === secretNumber ? 7 : face));
  await expect.poll(() => paper(page)).toBe(allPalettes[mood.style.palette].background);
  // Next gives the default local font a generated family name.
  if (mood.fontName !== 'Cormorant Garamond') await expect(type(page)).toHaveCSS('font-family', new RegExp(mood.fontName));
}
// The print pass is done and no letter is mid-flight.
async function settled(page: Page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('intro') &&
    !document.querySelector('.masthead')?.hasAttribute('data-morphing'));
}
// Steers the deck: finds the random draws that deal these editions in order.
async function dealNext(page: Page, from: number, seen: number[], targets: number[]) {
  const dealt = new Set(seen);
  let current = moodForNumber(from)!;
  const draws = targets.map((target) => {
    const draw = Array.from({ length: 512 }, (_, k) => (k + .5) / 512)
      .find((value) => moodNumber(nextHomepageMood(current, dealt, () => value)) === target);
    if (draw === undefined) throw new Error(`No draw deals No. ${target}`);
    current = moodForNumber(target)!;
    dealt.add(target);
    return draw;
  });
  await page.evaluate((values) => { Math.random = () => values.shift() ?? 0; }, draws);
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
  if (await die(page).isVisible()) {
    const control = (await die(page).boundingBox())!;
    const masthead = (await page.locator('.masthead').boundingBox())!;
    const firstLine = (await page.locator('.wordmark-type > span').first().boundingBox())!;
    expect(Math.abs(control.x + control.width - (masthead.x + masthead.width))).toBeLessThan(1);
    // On desktop the die sits above the name; on phones it sits beside JJH.
    const clear = control.x >= firstLine.x + firstLine.width || control.y + control.height <= firstLine.y;
    expect(clear, 'the die stays clear of the name').toBe(true);
  }
}
// The paragraph and the contact never move when the mood changes.
async function readingLayout(page: Page) {
  return Promise.all([
    page.locator('.letterhead-note').boundingBox(),
    page.locator('.letterhead-contact').boundingBox(),
  ]);
}
// Phones: the whole letterhead is one screen. Nothing scrolls, nothing is cut
// off, the type stays readable, and the die keeps its touch target.
async function expectOneScreen(page: Page) {
  const fit = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const parts = ['.wordmark-type', '.mood-die', '.letterhead-note p', '.homepage-email-button', '.email-feedback'];
    return {
      scroll: document.documentElement.scrollHeight - innerHeight,
      sideways: document.documentElement.scrollWidth - innerWidth,
      offscreen: parts.filter((selector) => {
        const r = box(selector);
        return r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth;
      }),
      body: parseFloat(getComputedStyle(document.querySelector('.letterhead-note p')!).fontSize),
      die: box('.mood-die').height,
    };
  });
  expect(fit.scroll).toBeLessThanOrEqual(0);
  expect(fit.sideways).toBeLessThanOrEqual(0);
  expect(fit.offscreen).toEqual([]);
  expect(fit.body).toBeGreaterThanOrEqual(15);
  expect(fit.die).toBeGreaterThanOrEqual(44);
  await expectFits(page);
}

for (const width of [320, 1440]) {
  test(`all 216 moods and the one extra render at ${width}px, and undo restores an exact mood`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await warmFonts(page);
    await settled(page);
    await page.evaluate(() => { Math.random = () => 0; });
    const layout = await readingLayout(page);
    const rendered = new Set<string>();

    // The smallest draw deals the whole deck in number order.
    for (const [index, mood] of homepageMoods.entries()) {
      await expectMood(page, index + 1);
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
      expect(await readingLayout(page)).toEqual(layout);
      await die(page).evaluate((button: HTMLButtonElement) => button.click());
    }
    expect(rendered.size).toBe(216);

    // With every mood seen, the deck deals the one that is not on the list.
    await expectMood(page, 217);
    await expect(status(page)).toHaveText('No. 217 of 216. Gold foil.');
    expect(await paper(page)).toBe(foilPalette.background);
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('JJH DIGITAL LLC');
    await expectFits(page);
    expect(await readingLayout(page)).toEqual(layout);

    await die(page).press('Shift+Space');
    await expectMood(page, 216);
    await expect(status(page)).toHaveText(`No. 216: ${describeMood(homepageMoods[215])}, restored.`);
    // A new round starts after the foil edition.
    await die(page).evaluate((button: HTMLButtonElement) => button.click());
    await expectMood(page, 1);
  });
}

for (const width of [320, 321, 390, 639, 640, 768, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1000 });

    test('the name and the die change the whole letterhead without moving the reading layout; undo walks back', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
      await expect(page).toHaveTitle('JJH DIGITAL LLC | Jake Harris');
      await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
      await expect(page.getByText('Local style lab')).toHaveCount(0);
      await warmFonts(page);
      await settled(page);
      await expectMood(page, 1);
      // The colophon footer is parked for now.
      await expect(page.locator('.colophon, .colophon-progress')).toHaveCount(0);
      await expect(page.locator('.letterhead-footer')).toBeHidden();
      await expectFits(page);
      if (width < 640) await expectOneScreen(page);
      const initialType = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
      const layout = await readingLayout(page);
      const llc = page.locator('.wordmark-llc');
      await expect(llc).toHaveCSS('font-family', initialType);
      expect(await llc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
      expect(await llc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(
        await type(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize) / 2)
      );
      await expect(page.locator('.mood-controls button')).toHaveCount(1);
      expect((await die(page).boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect((await die(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator('.die')).toHaveAttribute('data-pips', '1');

      // One mood for each other face, each on its own paper.
      const editions = [20, 39, 58, 77, 96];
      await dealNext(page, 1, [1], editions);
      for (const [index, number] of editions.entries()) {
        const control = index % 2 === 0 ? die(page) : name(page);
        if (width < 1000) await control.tap();
        else await control.click();
        const mood = moodForNumber(number)!;
        await expectMood(page, number);
        await expect(type(page)).toHaveCSS('font-family', new RegExp(mood.fontName));
        await expect(llc).toHaveCSS('font-family', new RegExp(mood.fontName));
        await expect(llc).toHaveCSS('color', await type(page).evaluate((el) => getComputedStyle(el).color));
        await expect(page.locator('.die')).toHaveAttribute('data-pips', String(index + 2));
        expect(await paper(page)).toBe(homepagePalettes[mood.style.palette].background);
        await expectFits(page);
        expect(await readingLayout(page)).toEqual(layout);
      }
      await expect(page).toHaveURL(/#96$/);

      await die(page).press('Shift+Space');
      await expect(type(page)).toHaveCSS('font-family', /Monoton/);
      for (let i = 0; i < editions.length - 1; i++) await name(page).press('Shift+Space');
      await expectMood(page, 1);
      await expect(type(page)).toHaveCSS('font-family', initialType);
      await expect(llc).toHaveCSS('font-family', initialType);
      await expectFits(page);
      expect(await readingLayout(page)).toEqual(layout);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('motion', () => {
  for (const width of [390, 1440]) {
    test(`at ${width}px the name prints on arrival and re-sets as pixels on a roll, then settles crisp`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(() => {
        const passes: string[] = [];
        Object.assign(window, { passes });
        new MutationObserver((records) => {
          for (const record of records) {
            if ((record.target as Element).hasAttribute('data-morphing')) passes.push('start');
          }
        }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-morphing'] });
      });
      await page.goto('/');
      await settled(page);
      // One print pass on arrival.
      expect(await page.evaluate(() => (window as unknown as { passes: string[] }).passes.length)).toBe(1);
      await expect(type(page)).toHaveCSS('opacity', '1');
      await expect(page.locator('.wordmark-pixels')).toHaveCSS('opacity', '0');

      await warmFonts(page);
      await dealNext(page, 1, [1], [21]);
      await die(page).click();
      await expect(page.locator('.masthead')).toHaveAttribute('data-morphing', 'true');
      const lit = await page.locator('.wordmark-pixels').evaluate((canvas: HTMLCanvasElement) => {
        const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
        return count;
      });
      expect(lit).toBeGreaterThan(500);
      await settled(page);
      await expectMood(page, 21);
      await expect(type(page)).toHaveCSS('font-family', /Gloock/);
      await expect(type(page)).toHaveCSS('opacity', '1');
      await expect(page.locator('.wordmark-pixels')).toHaveCSS('opacity', '0');
      await expectFits(page);
      expect(errors).toEqual([]);
    });
  }

  test('new paper spreads from the press, and fast rolls all count while it does', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await settled(page);
    await warmFonts(page);
    await dealNext(page, 1, [1], [20]);
    const spread = page.evaluate(() => new Promise<boolean>((resolve) => {
      const look = () => {
        const spreading = document.getAnimations().some((animation) =>
          (animation.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)');
        if (spreading) resolve(true);
        else requestAnimationFrame(look);
      };
      look();
      setTimeout(() => resolve(false), 3000);
    }));
    await die(page).click();
    expect(await spread).toBe(true);
    await settled(page);
    expect(await paper(page)).toBe('#1738cd');

    const box = (await die(page).boundingBox())!;
    for (let i = 0; i < 6; i++) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(60);
    }
    // After No. 20, the smallest draws deal 21 to 26: all six taps counted.
    await expect(page).toHaveURL(/#26$/);
    await settled(page);
    await expect(type(page)).toHaveCSS('opacity', '1');
    await expectFits(page);
    expect(errors).toEqual([]);
  });
});

test.describe('pointer and keyboard shuffle', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('repeated clicks and taps followed by Space leave no box around the wordmark', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await warmFonts(page);
    await settled(page);
    await page.evaluate(() => { Math.random = () => 0; });

    for (const input of ['mouse', 'touch']) {
      if (input === 'mouse') await name(page).click({ clickCount: 5, delay: 20 });
      else for (let i = 0; i < 5; i++) await name(page).tap();
      await expect(name(page)).not.toBeFocused();
      await expect(name(page)).toHaveCSS('outline-style', 'none');

      const before = page.url();
      await page.keyboard.press('Space');
      await expect(page).not.toHaveURL(before);
      await expect(name(page)).toHaveCSS('outline-style', 'none');
      await page.keyboard.press('Shift+Space');
      await expect(page).toHaveURL(before);
      await expect(name(page)).toHaveCSS('outline-style', 'none');
    }
  });
});

// Phones, held both ways, down to an iPhone SE with Safari's bars showing.
const phones = [
  [320, 460], [320, 568], [360, 640], [375, 553], [375, 667], [390, 664], [390, 844], [430, 932],
  [568, 276], [667, 331], [740, 300], [844, 346], [844, 390], [932, 430],
];

test.describe('phones', () => {
  test.use({ isMobile: true, hasTouch: true });

  for (const [width, height] of phones) {
    test(`${width}×${height} is one screen, like an app, in the widest faces and the foil`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await warmFonts(page);
      await settled(page);
      await expectMood(page, 1);
      await expectOneScreen(page);
      const layout = await readingLayout(page);
      // Unbounded and Monoton are the widest faces; foil adds its own box.
      for (const number of [4, 5, 217, 1]) {
        await page.evaluate((edition) => { location.hash = `#${edition}`; }, number);
        await expectMood(page, number);
        await expectOneScreen(page);
        expect(await readingLayout(page)).toEqual(layout);
      }
    });
  }

  test('taps never zoom and the page never bounces, while pinch zoom stays available', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await settled(page);
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/maximum-scale|user-scalable\s*=\s*(no|0)/);
    for (const selector of ['html', 'body']) {
      await expect(page.locator(selector)).toHaveCSS('touch-action', 'manipulation');
      await expect(page.locator(selector)).toHaveCSS('overscroll-behavior-y', 'none');
    }
    await expect(name(page)).toHaveCSS('touch-action', 'manipulation');
    await page.evaluate(() => { Math.random = () => 0; });
    await name(page).tap();
    await name(page).tap();
    await expectMood(page, 3);
    expect(await page.evaluate(() => visualViewport?.scale ?? 1)).toBe(1);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('on the smallest phone a failed copy still offers a full-size mail link on screen', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Unavailable')) } });
    });
    await page.setViewportSize({ width: 320, height: 460 });
    await page.goto('/');
    await settled(page);
    await page.getByRole('button', { name: /Copy jake/ }).tap();
    const fallback = page.getByRole('link', { name: 'Open your email app instead' });
    await expect(fallback).toBeVisible();
    const box = (await fallback.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(460);
    await expectOneScreen(page);
  });

  test('a screen too small to hold everything scrolls instead of cutting anything off', async ({ page }) => {
    // Page zoom and larger text shrink the space the same way.
    await page.setViewportSize({ width: 320, height: 300 });
    await page.goto('/');
    await settled(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(300);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const email = (await page.locator('.homepage-email-button').boundingBox())!;
    expect(email.y + email.height).toBeLessThanOrEqual(300);
  });
});

test('contact copies, announces success, and leaves the letterhead in place', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await settled(page);
  const layout = await readingLayout(page);
  await page.getByRole('button', { name: 'Copy jake@jjhdigital.com to clipboard' }).click();
  await expect(page.getByRole('status', { name: 'Contact' })).toHaveText('Copied to clipboard');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('jake@jjhdigital.com');
  expect(await readingLayout(page)).toEqual(layout);
});

test('clipboard failure offers a 44px email link without moving the letterhead', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Unavailable')) } });
  });
  await page.goto('/');
  await settled(page);
  const layout = await readingLayout(page);
  await page.getByRole('button', { name: /Copy jake/ }).click();
  const fallback = page.getByRole('link', { name: 'Open your email app instead' });
  await expect(fallback).toHaveAttribute('href', 'mailto:jake@jjhdigital.com');
  expect((await fallback.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await readingLayout(page)).toEqual(layout);
});

test('first visit is legible and contact works without JavaScript or loaded fonts', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  await page.route('**/*.woff2', (route) => route.abort());
  await page.goto('http://127.0.0.1:3100/');
  await expect(page.getByRole('heading', { name: 'JJH DIGITAL LLC' })).toBeVisible();
  await expect(type(page)).toHaveCSS('opacity', '1');
  await expect(page.locator('.colophon')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Send an email' })).toHaveAttribute('href', 'mailto:jake@jjhdigital.com');
  await expect(page.getByRole('button', { name: /Copy jake/ })).toHaveCount(0);
  await expect(die(page)).toBeHidden();
  await expectFits(page);
  await context.close();
});

test('if the app scripts never arrive, a shared edition still paints and the name still shows', async ({ page }) => {
  await page.route(/\/_next\/static\/chunks\/.*\.js$/, (route) => route.abort());
  await page.goto('/#147');
  expect(await paper(page)).toBe('#f3a18b');
  await expect(page.locator('html')).toHaveClass(/intro/);
  await expect(type(page)).toHaveCSS('opacity', '1', { timeout: 3000 });
});

test('a link opens its edition, and the address follows the mood', async ({ page }) => {
  await page.goto('/#147');
  await settled(page);
  await expectMood(page, 147);
  expect(await paper(page)).toBe('#f3a18b');
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);

  await page.evaluate(() => { Math.random = () => 0; });
  await die(page).click();
  await expectMood(page, 148);

  await page.evaluate(() => { location.hash = '#217'; });
  await expectMood(page, 217);
  await expect(page.locator('.wordmark')).toHaveClass(/wordmark-foil/);
  await page.evaluate(() => { location.hash = '#1'; });
  await expectMood(page, 1);

  await page.goto('about:blank');
  await page.goto('/#999');
  await settled(page);
  await expectMood(page, 1);
});

test('failed font keeps the complete current mood; another choice still works', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/fonts/work-sans-wordmark.woff2', (route) => route.abort());
  await page.goto('/');
  await page.waitForFunction(() => [...document.fonts].some((face) => face.family === 'Gloock' && face.status === 'loaded'));
  await settled(page);
  const before = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
  const initialPaper = await paper(page);
  await dealNext(page, 1, [1], [20]);
  await name(page).click();
  await expect(page.getByText('That mood did not load. Try again.', { exact: true })).toBeVisible();
  const errorBox = (await page.locator('.mood-error').boundingBox())!;
  const llcBox = (await page.locator('.wordmark-llc').boundingBox())!;
  const controlBox = (await die(page).boundingBox())!;
  expect(errorBox.y + errorBox.height).toBeLessThan(llcBox.y);
  expect(errorBox.x + errorBox.width).toBeLessThan(controlBox.x);
  expect(errorBox.y + errorBox.height).toBeLessThan((await readingLayout(page))[0]!.y);
  await expect(type(page)).toHaveCSS('font-family', before);
  expect(await paper(page)).toBe(initialPaper);
  await expectMood(page, 1);

  await dealNext(page, 1, [1], [39]);
  await name(page).click();
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  await expectMood(page, 39);
  await die(page).press('Shift+Space');
  expect(await paper(page)).toBe(initialPaper);
  await expectFits(page);
});

test('a slow font never paints half a mood or overwrites a newer choice', async ({ page }) => {
  let releaseFont!: () => void;
  const gate = new Promise<void>((resolve) => { releaseFont = resolve; });
  await page.route('**/fonts/work-sans-wordmark.woff2', async (route) => { await gate; await route.continue(); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => [...document.fonts].some((face) => face.family === 'Gloock' && face.status === 'loaded'));
  await settled(page);
  const initialPaper = await paper(page);
  const originalType = await type(page).evaluate((el) => getComputedStyle(el).fontFamily);
  await dealNext(page, 1, [1], [20]);
  await name(page).click();
  await expect(name(page)).toHaveAttribute('aria-busy', 'true');
  expect(await paper(page)).toBe(initialPaper);
  await expect(type(page)).toHaveCSS('font-family', originalType);
  // The deck deals from the choice still in flight.
  await dealNext(page, 20, [1], [39]);
  await name(page).click();
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  releaseFont();
  await warmFonts(page);
  await expect(type(page)).toHaveCSS('font-family', /Gloock/);
  expect(await paper(page)).toBe('#f1e6dc');
  await name(page).press('Shift+Space');
  await expect(type(page)).toHaveCSS('font-family', originalType);
});

test('Space shortcuts respect focus and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await warmFonts(page);
  await settled(page);
  await page.evaluate(() => { Math.random = () => 0; });
  const initialPaper = await paper(page);
  await page.keyboard.press('Space');
  await expectMood(page, 2);
  await expect(type(page)).toHaveCSS('font-family', /Work Sans/);
  await expect(type(page)).toHaveCSS('transition-property', 'none');
  await expect(page.locator('.masthead')).not.toHaveAttribute('data-morphing');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.keyboard.press('Shift+Space');
  await expectMood(page, 1);
  expect(await paper(page)).toBe(initialPaper);

  await page.keyboard.press('Tab');
  await expect(name(page)).toBeFocused();
  await expect(name(page)).toHaveCSS('outline-style', 'solid');
  // No. 2 was already seen, so the deck deals No. 3.
  await name(page).press('Space');
  await expectMood(page, 3);
  await expect(name(page)).toBeFocused();
  await expect(name(page)).toHaveCSS('outline-style', 'solid');
  await name(page).press('Shift+Space');
  await expectMood(page, 1);
  await die(page).press('Space');
  await expectMood(page, 4);
  await expect(page.locator('.mood-die-glyph')).toHaveCSS('transform', 'none');
  expect(await page.locator('.masthead').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.down('Shift');
  await page.keyboard.down('Space');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Space');
  await expectMood(page, 1);
  expect(await paper(page)).toBe(initialPaper);

  const copy = page.getByRole('button', { name: /Copy jake/ });
  await copy.focus();
  await copy.press('Space');
  await expectMood(page, 1);
  await page.setViewportSize({ width: 320, height: 400 });
  await page.evaluate(() => { (document.activeElement as HTMLElement).blur(); scrollTo(0, 0); });
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expectMood(page, 5);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('printing the page gives you letterhead', async ({ page }) => {
  await page.goto('/#23');
  await settled(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.letterhead-note')).toBeHidden();
  await expect(die(page)).toBeHidden();
  await expect(type(page)).toBeVisible();
  await expect(page.locator('.print-only')).toHaveText('JJH DIGITAL LLC · jake@jjhdigital.com · jjhdigital.com');
  await expect(page.locator('.letterhead-footer')).toBeVisible();
  await expect(page.locator('.colophon')).toHaveCount(0);
  // Blueprint's white ink would vanish on white paper, so it prints in blue.
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--homepage-ink').trim()))
    .toBe('#1738cd');
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('.print-only')).toBeHidden();
});

test('a missing page is a blank sheet with a way home', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This sheet is blank.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to JJH DIGITAL' })).toHaveAttribute('href', '/');
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
