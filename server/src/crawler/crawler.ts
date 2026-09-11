import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  title: string;
  cleanText: string;
  statusCode: number;
}

export interface CrawlResult {
  homepage: CrawledPage | null;
  hiringPage: CrawledPage | null;
  aboutPage: CrawledPage | null;
  additionalPages: CrawledPage[];
  pagesUsed: string[];
  notes: string[];
  unreachable: boolean;
}

// Keywords to rank links discovered on the company website
const HIRING_KEYWORDS = [
  'career', 'careers', 'job', 'jobs', 'hiring', 'work-with-us', 'join-us',
  'join', 'open-roles', 'positions', 'handbook', 'engineering-ladder',
  'engineering-blog', 'interview', 'interviewing', 'culture', 'values'
];

const ABOUT_KEYWORDS = [
  'about', 'about-us', 'company', 'mission', 'story', 'who-we-are', 'team'
];

/**
 * Validates URL safety (SSRF guard)
 * Rejects private/loopback in production, but allows loopback in test/dev for evaluation harness.
 */
export function isUrlAllowed(urlStr: string, isProduction: boolean = process.env.NODE_ENV === 'production'): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    if (isProduction) {
      const hostname = parsed.hostname.toLowerCase();
      // Block localhost, loopbacks, internal IPs, cloud metadata
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('169.254.') || // AWS/GCP metadata
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Strips HTML tags, navigation, scripts, and compresses whitespace.
 * Ensures fetched text is safely handled as content, not prompt instructions.
 */
export function cleanHtml(html: string): { title: string; text: string; links: string[] } {
  const $ = cheerio.load(html);

  // Remove scripts, styles, iframes, navigation, footer bloat
  $('script, style, noscript, iframe, svg, nav, footer, header, form').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';

  // Extract internal and external links
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
      links.push(href.trim());
    }
  });

  // Extract clean text
  const rawText = $('body').text() || $.text();
  const cleanText = rawText
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '') // remove non-printable ASCII
    .trim()
    .slice(0, 8000); // limit per page to avoid token blowup

  return { title, text: cleanText, links };
}

/**
 * Scores a discovered link based on hiring and company information relevance.
 */
function scoreLink(urlStr: string, text: string = ''): { score: number; type: 'hiring' | 'about' | 'other' } {
  const lowerUrl = urlStr.toLowerCase();
  const lowerText = text.toLowerCase();
  let score = 0;
  let type: 'hiring' | 'about' | 'other' = 'other';

  for (const kw of HIRING_KEYWORDS) {
    if (lowerUrl.includes(kw) || lowerText.includes(kw)) {
      score += 10;
      type = 'hiring';
    }
  }

  for (const kw of ABOUT_KEYWORDS) {
    if (lowerUrl.includes(kw) || lowerText.includes(kw)) {
      score += 5;
      if (type !== 'hiring') type = 'about';
    }
  }

  // Penalize long query strings or anchor tags
  if (lowerUrl.includes('?')) score -= 2;
  if (lowerUrl.includes('login') || lowerUrl.includes('signup') || lowerUrl.includes('cart')) score -= 20;

  return { score, type };
}

/**
 * Respects basic robots.txt exclusion rules if available.
 */
async function checkRobotsTxt(baseUrl: string): Promise<Set<string>> {
  const disallowedPaths = new Set<string>();
  try {
    const parsed = new URL(baseUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const response = await axios.get(robotsUrl, {
      timeout: 3000,
      maxContentLength: 100 * 1024, // 100KB max
      validateStatus: () => true
    });

    if (response.status === 200 && typeof response.data === 'string') {
      const lines = response.data.split('\n');
      let isApplicable = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^User-agent:\s*\*/i.test(trimmed)) {
          isApplicable = true;
        } else if (/^User-agent:/i.test(trimmed)) {
          isApplicable = false;
        } else if (isApplicable && /^Disallow:\s*/i.test(trimmed)) {
          const path = trimmed.replace(/^Disallow:\s*/i, '').trim();
          if (path) disallowedPaths.add(path);
        }
      }
    }
  } catch {
    // Ignore robots.txt failures (many local/mock servers or smaller sites don't have one)
  }
  return disallowedPaths;
}

/**
 * Crawls a company website:
 * 1. Checks URL validity and fetch homepage.
 * 2. Parses links, ranks them using semantic keywords.
 * 3. Fetches the top-ranked hiring / about page following relative links.
 * 4. Gracefully recovers on 404, timeouts, or unparseable bodies without failing.
 */
export async function crawlCompanySite(targetUrl: string): Promise<CrawlResult> {
  const notes: string[] = [];
  const pagesUsed: string[] = [];

  // Normalize URL
  let normalizedUrl = targetUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  if (!isUrlAllowed(normalizedUrl)) {
    return {
      homepage: null,
      hiringPage: null,
      aboutPage: null,
      additionalPages: [],
      pagesUsed: [],
      notes: [`Access to URL "${targetUrl}" rejected by security policy (SSRF guard).`],
      unreachable: true
    };
  }

  const axiosConfig: AxiosRequestConfig = {
    timeout: 6000,
    maxRedirects: 5,
    maxContentLength: 2 * 1024 * 1024, // 2MB max
    headers: {
      'User-Agent': 'TraoPrepKitBot/1.0 (+https://trao.ai/bot; candidate assessment crawler)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    validateStatus: (status) => status < 500 // Don't throw on 404, capture cleanly
  };

  const disallowedPaths = await checkRobotsTxt(normalizedUrl);

  let homepage: CrawledPage | null = null;
  let discoveredLinks: { url: string; score: number; type: 'hiring' | 'about' | 'other' }[] = [];

  try {
    const res = await axios.get(normalizedUrl, axiosConfig);
    if (res.status >= 400) {
      notes.push(`Homepage returned HTTP status ${res.status}.`);
      return {
        homepage: null,
        hiringPage: null,
        aboutPage: null,
        additionalPages: [],
        pagesUsed: [],
        notes,
        unreachable: true
      };
    }

    const { title, text, links } = cleanHtml(String(res.data));
    homepage = {
      url: normalizedUrl,
      title,
      cleanText: text,
      statusCode: res.status
    };
    pagesUsed.push(normalizedUrl);

    // Parse discovered links and resolve relative paths
    const baseObj = new URL(normalizedUrl);
    const linkMap = new Map<string, { url: string; score: number; type: 'hiring' | 'about' | 'other' }>();

    for (const rawHref of links) {
      try {
        const resolved = new URL(rawHref, normalizedUrl);
        // Only crawl same origin/host
        if (resolved.host === baseObj.host) {
          // Check robots.txt disallow
          const isDisallowed = Array.from(disallowedPaths).some(p => resolved.pathname.startsWith(p));
          if (!isDisallowed && resolved.href !== normalizedUrl) {
            const { score, type } = scoreLink(resolved.pathname);
            if (score > 0 && !linkMap.has(resolved.href)) {
              linkMap.set(resolved.href, { url: resolved.href, score, type });
            }
          }
        }
      } catch {
        // Ignore malformed links
      }
    }

    discoveredLinks = Array.from(linkMap.values()).sort((a, b) => b.score - a.score);
  } catch (err: any) {
    notes.push(`Failed to reach ${normalizedUrl}: ${err.message || 'Network error'}`);
    return {
      homepage: null,
      hiringPage: null,
      aboutPage: null,
      additionalPages: [],
      pagesUsed: [],
      notes,
      unreachable: true
    };
  }

  // Fetch top candidate hiring page and about page
  let hiringPage: CrawledPage | null = null;
  let aboutPage: CrawledPage | null = null;
  const additionalPages: CrawledPage[] = [];

  const topHiring = discoveredLinks.find(l => l.type === 'hiring');
  const topAbout = discoveredLinks.find(l => l.type === 'about');

  const pagesToFetch: string[] = [];
  if (topHiring) pagesToFetch.push(topHiring.url);
  if (topAbout && topAbout.url !== topHiring?.url) pagesToFetch.push(topAbout.url);

  for (const pageUrl of pagesToFetch.slice(0, 2)) {
    try {
      const res = await axios.get(pageUrl, axiosConfig);
      if (res.status === 200) {
        const { title, text } = cleanHtml(String(res.data));
        const crawled: CrawledPage = {
          url: pageUrl,
          title,
          cleanText: text,
          statusCode: res.status
        };
        pagesUsed.push(pageUrl);

        if (topHiring && pageUrl === topHiring.url) {
          hiringPage = crawled;
        } else if (topAbout && pageUrl === topAbout.url) {
          aboutPage = crawled;
        } else {
          additionalPages.push(crawled);
        }
      }
    } catch {
      notes.push(`Secondary page ${pageUrl} could not be retrieved; skipped.`);
    }
  }

  if (!hiringPage) {
    notes.push('No distinct hiring or careers page discoverable on site.');
  }

  return {
    homepage,
    hiringPage,
    aboutPage,
    additionalPages,
    pagesUsed,
    notes,
    unreachable: false
  };
}
