import { test, expect } from '@playwright/test';

// These endpoints are used internally by the NHS website, not a published API,
// so tests check status, content type and shape rather than exact data where possible.
// Keep the number of requests low - the site's firewall blocks suspicious traffic.

test.describe('Search autocomplete API', () => {
  const autocomplete = (q: string) => `/search/autocomplete?v=2&q=${encodeURIComponent(q)}`;

  test('returns JSON suggestions for a partial word', async ({ request }) => {
    const response = await request.get(autocomplete('diab'));

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const suggestions: string[] = await response.json();
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(typeof suggestion).toBe('string');
    }
    expect(suggestions).toContain('diabetes');
  });

  test('suggestions ignore capital letters', async ({ request }) => {
    const lower = await (await request.get(autocomplete('asth'))).json();
    const upper = await (await request.get(autocomplete('ASTHMA'))).json();

    expect(lower).toContain('asthma');
    expect(upper).toContain('asthma');
  });

  for (const q of ['zzzxqv', '', 'a']) {
    test(`returns an empty list for "${q}"`, async ({ request }) => {
      const response = await request.get(autocomplete(q));

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual([]);
    });
  }

  test('blocks script-style input', async ({ request }) => {
    const response = await request.get(autocomplete('<script>'));

    expect(response.status()).toBe(403);
  });
});

test.describe('Emergency banners API', () => {
  test('returns a JSON list', async ({ request }) => {
    const response = await request.get('/externalservices/surveyfeedapi/api/emergency-banners');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    // Usually empty - only contains items during a national emergency
    expect(Array.isArray(await response.json())).toBe(true);
  });
});

test.describe('Website HTTP behaviour', () => {
  test('HTTP redirects to HTTPS', async ({ request, baseURL }) => {
    const httpUrl = new URL('/nhs-app/', baseURL).toString().replace(/^https:/, 'http:');
    const response = await request.get(httpUrl, { maxRedirects: 0 });

    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe(new URL('/nhs-app/', baseURL).toString());
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get('/nhs-app/');
    const headers = response.headers();

    expect(response.status()).toBe(200);
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('missing pages return a 404 page', async ({ request }) => {
    const response = await request.get('/this-page-does-not-exist-playwright/');

    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('<title>Page not found - NHS');
  });

  test('search redirects to the results page', async ({ request }) => {
    const response = await request.get('/search/?q=asthma', { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe('/search/results?q=asthma');
  });

  test('robots.txt and sitemap.xml are available', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).toContain('User-agent: *');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
    expect(await sitemap.text()).toContain('<sitemapindex');
  });
});
