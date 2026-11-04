# NHS App page – basic test plan

**Page under test:** https://www.nhs.uk/nhs-app/
**Tests:** `tests/basic/`
**Starting state for every scenario:** a fresh browser (no cookies, nothing stored). Each scenario can run on its own and in any order.

The header, footer, page content, accessibility, visual and App Store checks already live in other files in `tests/`. This plan covers the basic journeys around them.

---

## 1. Page basics (`page-basics.spec.ts`)

### 1.1 Page loads with the right title and metadata
1. Open `/nhs-app/`.
2. Check the browser tab title.
3. Check the `lang` attribute on `<html>`.
4. Check the meta description and the canonical link.

**Expected:** the title is `NHS App - NHS`, `lang` is `en`, the meta description starts "Use the NHS App", and the canonical link is `https://www.nhs.uk/nhs-app/`.
**Fails if:** any of these are missing or different.

### 1.2 Skip link is the first thing keyboard users reach
1. Open `/nhs-app/` and dismiss the cookie banner if it's shown.
2. Press Tab once.
3. Press Enter.

**Expected:** "Skip to main content" has focus after the first Tab. Pressing Enter moves to `#maincontent`.

### 1.3 Breadcrumb links back to the NHS homepage
1. Open `/nhs-app/`.
2. Look at the Breadcrumb navigation.

**Expected:** it has one link, "Home", pointing to `/`.

### 1.4 NHS logo returns to the homepage
1. Open `/nhs-app/`.
2. Click the "NHS homepage" logo.

**Expected:** the URL is `https://www.nhs.uk/`.

### 1.5 Unknown NHS App page shows "Page not found" (negative)
1. Open `/nhs-app/does-not-exist/`.

**Expected:** the response status is 404 and the heading is "Page not found".

---

## 2. Cookie banner (`cookie-banner.spec.ts`)

### 2.1 Banner shows on a first visit
1. Open `/nhs-app/` in a fresh browser.

**Expected:** the "Cookies on the NHS website" banner shows. It has "Accept analytics cookies", "Reject analytics cookies" and "Choose your cookie settings".

### 2.2 Accepting hides the banner and remembers the choice
1. Click "Accept analytics cookies".
2. Reload the page.

**Expected:** the banner is hidden, and is still hidden after the reload. The `nhsuk-cookie-consent` cookie is set with `statistics` true.

### 2.3 Rejecting hides the banner and remembers the choice
1. Click "Reject analytics cookies".
2. Reload the page.

**Expected:** the same as 2.2, except `statistics` is false.

### 2.4 "Choose your cookie settings" opens the cookie policy page
1. Click "Choose your cookie settings".

**Expected:** the URL ends `/our-policies/choose-your-cookie-settings/`.

The banner isn't always shown, for example after a site change or in some regions. If it's missing, scenarios 2.1–2.4 are skipped rather than failed.

---

## 3. Search from the NHS App page (`search.spec.ts`)

### 3.1 Searching for a real term shows results
1. Type `asthma` into "Search the NHS website".
2. Click Search.

**Expected:** the URL is `/search/results?q=asthma` and the heading is "Search results for asthma".

### 3.2 Pressing Enter also searches
1. Type `diabetes` and press Enter.

**Expected:** the heading is "Search results for diabetes".

### 3.3 Nonsense term shows no results (negative)
1. Search for `zzqxjvw`.

**Expected:** the heading is "No results for zzqxjvw".

### 3.4 Empty search does not error (edge case)
1. Click Search with the box empty.

**Expected:** the URL is `/search/results` and the heading is "No results". There is no error page.

---

## 4. Section journeys (`section-journeys.spec.ts`)

### 4.1 Each section card opens its page
For "Setting up the NHS App", "Help with using the NHS App" and "About the NHS App":
1. Open `/nhs-app/` and click the card's link.

**Expected:** the URL matches the card, and the page's main heading matches the card title.

### 4.2 Section pages list their sub-pages
1. Open each section page.

**Expected:**
- Setting up includes "Who can use the NHS App" and "Downloading the NHS App".
- Help includes "How to log in" and "Prescriptions".
- About includes "Release notes".

### 4.3 "Log in to use NHS App services" opens the account page
1. Click "Log in to use NHS App services".

**Expected:** the URL ends `/nhs-app/account/`, the heading is "Access your NHS account", and "Continue" links to `/auth/redirect`.

This doesn't log in. That's covered by `tests/login/`.

---

## 5. Mobile layout (`mobile.spec.ts`)

The viewport is 393×851, phone sized.

### 5.1 Page fits the screen
**Expected:** the page doesn't scroll sideways, because the scroll width equals the viewport width.

### 5.2 Header collapses into "Browse More"
**Expected:** "Health A to Z" and "NHS services" show, "Care and support" is hidden, and a "Browse More" button shows.

### 5.3 Main content is still usable
**Expected:** the "NHS App" heading, all three section cards and both app store badges show.
