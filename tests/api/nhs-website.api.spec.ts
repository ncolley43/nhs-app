import { test, expect, type APIRequestContext } from '@playwright/test';

// These endpoints are used internally by the NHS website, not a published API,
// so tests check status, content type and shape rather than exact data where possible.
// Keep the number of requests low - the site's firewall blocks suspicious traffic.

// Longer non-JSON bodies (e.g. HTML pages) are cut to this many characters in the log
const maxTextLength = 500;

// Sends a GET request, prints the request and response as JSON to the console
// and attaches them to the HTML report, then returns the response as normal.
// The description explains in plain English what the call is checking - it appears
// at the top of each call in the console, the HTML report and api-results/api-log.json
async function get(request: APIRequestContext, url: string, description: string, options?: Parameters<APIRequestContext['get']>[1]) {
  const response = await request.get(url, options);

  const contentType = response.headers()['content-type'] ?? '';
  let body: unknown;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = text.length > maxTextLength ? `${text.slice(0, maxTextLength)}... (${text.length} characters in total)` : text;
  }

  const log = {
    description,
    request: { method: 'GET', url: response.url(), options: options ?? {} },
    response: { status: response.status(), statusText: response.statusText(), headers: response.headers(), body },
  };

  const json = JSON.stringify(log, null, 2);
  console.log(`\n=== ${test.info().title} ===\n${json}`);
  await test.info().attach(`GET ${url}`, { body: json, contentType: 'application/json' });

  return response;
}

test.describe('Search autocomplete API', () => {
  const autocomplete = (q: string) => `/search/autocomplete?v=2&q=${encodeURIComponent(q)}`;

  test('returns JSON suggestions for a partial word', async ({ request }) => {
    const response = await get(request, autocomplete('diab'),
      'Types "diab" into the search box and checks the suggestions come back as a JSON list of words that includes "diabetes"');

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
    const lower = await (await get(request, autocomplete('asth'),
      'Types "asth" (lowercase, part of a word) into the search box and checks "asthma" is suggested')).json();
    const upper = await (await get(request, autocomplete('ASTHMA'),
      'Types "ASTHMA" (all capitals) into the search box and checks "asthma" is still suggested - search should ignore capital letters')).json();

    expect(lower).toContain('asthma');
    expect(upper).toContain('asthma');
  });

  for (const q of ['zzzxqv', '', 'a']) {
    test(`returns an empty list for "${q}"`, async ({ request }) => {
      const response = await get(request, autocomplete(q),
        q === '' ? 'Leaves the search box empty and checks no suggestions are returned'
          : q.length === 1 ? `Types a single letter ("${q}") into the search box and checks no suggestions are returned - too short to search`
          : `Types a made-up word ("${q}") into the search box and checks no suggestions are returned`);

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual([]);
    });
  }

  test('blocks script-style input', async ({ request }) => {
    const response = await get(request, autocomplete('<script>'),
      'Types "<script>" (a basic script injection attempt) into the search box and checks the site firewall blocks it with 403 Forbidden');

    expect(response.status()).toBe(403);
  });
});

test.describe('Emergency banners API', () => {
  test('returns a JSON list', async ({ request }) => {
    const response = await get(request, '/externalservices/surveyfeedapi/api/emergency-banners',
      'Requests the emergency banner feed the site uses for national alerts and checks it returns a JSON list (usually empty)');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    // Usually empty - only contains items during a national emergency
    expect(Array.isArray(await response.json())).toBe(true);
  });
});

test.describe('Website HTTP behaviour', () => {
  test('HTTP redirects to HTTPS', async ({ request, baseURL }) => {
    const httpUrl = new URL('/nhs-app/', baseURL).toString().replace(/^https:/, 'http:');
    const response = await get(request, httpUrl,
      'Requests the NHS App page over insecure http:// and checks it permanently redirects (301) to the secure https:// address',
      { maxRedirects: 0 });

    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe(new URL('/nhs-app/', baseURL).toString());
  });

  test('security headers are present', async ({ request }) => {
    const response = await get(request, '/nhs-app/',
      'Requests the NHS App page and checks the security headers are set: HSTS (forces HTTPS), X-Frame-Options (stops clickjacking) and X-Content-Type-Options (stops content sniffing)');
    const headers = response.headers();

    expect(response.status()).toBe(200);
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('missing pages return a 404 page', async ({ request }) => {
    const response = await get(request, '/this-page-does-not-exist-playwright/',
      'Requests a page that does not exist and checks the site returns a proper 404 Not Found with the "Page not found" page');

    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('<title>Page not found - NHS');
  });

  test('search redirects to the results page', async ({ request }) => {
    const response = await get(request, '/search/?q=asthma',
      'Submits a search for "asthma" and checks it redirects (302) to the search results page',
      { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe('/search/results?q=asthma');
  });

  test('robots.txt and sitemap.xml are available', async ({ request }) => {
    const robots = await get(request, '/robots.txt',
      'Requests robots.txt (the instructions for search engine crawlers) and checks it is plain text with rules for all crawlers');
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).toContain('User-agent: *');

    const sitemap = await get(request, '/sitemap.xml',
      'Requests sitemap.xml (the list of site pages for search engines) and checks it is a valid XML sitemap index');
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
    expect(await sitemap.text()).toContain('<sitemapindex');
  });
});
