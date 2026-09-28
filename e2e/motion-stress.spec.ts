import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) {
  test(`rapid name, die and keyboard shuffles stay bounded on ${mobile ? 'a throttled phone' : 'desktop'}`, async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({
      baseURL, viewport: mobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
      deviceScaleFactor: mobile ? 3 : 2, isMobile: mobile, hasTouch: mobile,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('crash', () => errors.push('Renderer crashed'));
    await page.addInitScript(() => {
      const state = { active: 0, peak: 0 };
      Object.assign(window, { transitionLoad: state });
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        state.active++;
        state.peak = Math.max(state.peak, state.active);
        const transition = start(update);
        const done = () => { state.active--; };
        transition.finished.then(done, done);
        return transition;
      };
    });
    await page.goto('/');
    await page.waitForFunction(() => !document.documentElement.classList.contains('intro') &&
      !document.querySelector('.masthead')?.hasAttribute('data-morphing') &&
      ['Work Sans', 'Gloock', 'Unbounded', 'Monoton', 'Bebas Neue'].every((name) =>
        [...document.fonts].some((face) => face.family.replaceAll('"', '') === name && face.status === 'loaded')));
    // Initialize Playwright's locator helpers before counting page listeners.
    await expect(page.locator('.wordmark-type')).toHaveCSS('opacity', '1');
    await cdp.send('HeapProfiler.collectGarbage');
    const baseline = await cdp.send('Runtime.getHeapUsage');
    const initialDOM = await cdp.send('Memory.getDOMCounters');
    const fonts = await page.evaluate(() => document.fonts.size);
    await page.evaluate(() => { Math.random = () => 0; });

    for (let round = 0; round < 3; round++) {
      // All three entry points use the same selection path. Let the browser
      // render between clicks while repeatedly interrupting unfinished motion.
      await page.evaluate(async (round) => {
        for (let i = 0; i < 100; i++) {
          if (round === 2) document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
          else (document.querySelector(round === 0 ? '.wordmark' : '.mood-die') as HTMLButtonElement).click();
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }, round);
      await page.waitForFunction(() => !document.querySelector('.masthead')?.hasAttribute('data-morphing') &&
        document.getAnimations().length === 0);
      // No late capture callback may replace the last selected mood. After
      // edition 217, the next click starts the deck at edition 1 again.
      await expect(page).toHaveURL(new RegExp(`#${(round + 1) * 100 % 217 + 1}$`));
      await expect(page.locator('.wordmark-type')).toHaveCSS('opacity', '1');
      await cdp.send('HeapProfiler.collectGarbage');
      const heap = await cdp.send('Runtime.getHeapUsage');
      const dom = await cdp.send('Memory.getDOMCounters');
      // Allow JIT/React warmup, but not a retained bitmap or listener per click.
      expect(heap.usedSize - baseline.usedSize).toBeLessThan(8 * 1024 * 1024);
      expect(heap.backingStorageSize - baseline.backingStorageSize).toBeLessThan(2 * 1024 * 1024);
      expect(dom.nodes - initialDOM.nodes).toBeLessThan(100);
      expect(dom.jsEventListeners - initialDOM.jsEventListeners).toBeLessThan(10);
      expect(await page.evaluate(() => document.fonts.size)).toBe(fonts);
    }
    const load = await page.evaluate(() => (window as unknown as {
      transitionLoad: { active: number; peak: number };
    }).transitionLoad);
    // Root snapshots can consume GPU memory outside the JavaScript heap.
    expect(load.peak).toBe(1);
    expect(load.active).toBe(0);
    expect(errors).toEqual([]);
    await context.close();
  });
}
