import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('company and founder identity are crawlable with consistent search and share metadata', async ({ page, request }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag'] ?? '').not.toMatch(/noindex/i);
  for (const directive of await page.locator('meta[name="robots"], meta[name="googlebot"]').all()) {
    expect(await directive.getAttribute('content')).not.toMatch(/noindex/i);
  }
  await expect(page).toHaveTitle('JJH DIGITAL LLC | Jake Harris');
  await expect(page.locator('head > title')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://jjhdigital.com');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('JJH DIGITAL LLC');
  await expect(page.getByRole('link', { name: 'Jake Harris', exact: true })).toHaveAttribute('href', 'https://www.jakejh.com/');
  await expect(page.locator('.letterhead-note p')).toContainText('Founded by Jake Harris, JJH DIGITAL LLC');

  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toContain('Jake Harris');
  expect(description).toContain('JJH DIGITAL LLC');
  expect(description).toContain('websites, and software');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title());
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', await page.title());
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description!);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description!);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'JJH DIGITAL');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://jjhdigital.com');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toMatch(/^https:\/\/jjhdigital\.com\/opengraph-image/);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', image!);

  const schema = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(schema['@context']).toBe('https://schema.org');
  const organization = schema['@graph'].find((node: { '@type': string }) => node['@type'] === 'Organization');
  const website = schema['@graph'].find((node: { '@type': string }) => node['@type'] === 'WebSite');
  expect(organization).toMatchObject({
    name: 'JJH DIGITAL', legalName: 'JJH DIGITAL LLC', alternateName: 'JJH DIGITAL LLC',
    url: 'https://jjhdigital.com', email: 'jake@jjhdigital.com',
    founder: { '@type': 'Person', name: 'Jake Harris', url: 'https://www.jakejh.com/' },
  });
  expect(website).toMatchObject({
    name: 'JJH DIGITAL', alternateName: 'JJH DIGITAL LLC', url: 'https://jjhdigital.com',
    publisher: { '@id': organization['@id'] },
  });
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Allow: /');
  expect(await robots.text()).toContain('Sitemap: https://jjhdigital.com/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<loc>https://jjhdigital.com</loc>');
  expect(await sitemap.text()).not.toContain('vercel.app');
});
