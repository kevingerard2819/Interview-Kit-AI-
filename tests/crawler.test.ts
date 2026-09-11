import { isUrlAllowed, cleanHtml } from '../server/src/crawler/crawler';

describe('Crawler & Security Guard (Section 2 & 11)', () => {
  test('rejects loopback and private IP addresses in production mode', () => {
    expect(isUrlAllowed('http://localhost:3000', true)).toBe(false);
    expect(isUrlAllowed('http://127.0.0.1:8080', true)).toBe(false);
    expect(isUrlAllowed('http://10.0.0.1', true)).toBe(false);
    expect(isUrlAllowed('http://192.168.1.1', true)).toBe(false);
    expect(isUrlAllowed('http://169.254.169.254', true)).toBe(false); // Cloud metadata
  });

  test('permits standard external HTTPS websites in production mode', () => {
    expect(isUrlAllowed('https://trao.ai', true)).toBe(true);
    expect(isUrlAllowed('https://github.com/careers', true)).toBe(true);
  });

  test('permits localhost when not in production mode (for local evaluation harnesses)', () => {
    expect(isUrlAllowed('http://localhost:8099/acme/', false)).toBe(true);
  });

  test('cleans raw HTML and extracts links properly', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Acme Corp - Careers</title></head>
        <body>
          <nav><a href="/home">Home</a></nav>
          <h1>Join Our Team</h1>
          <p>We are building the future of distributed systems.</p>
          <script>console.log("malicious or irrelevant script");</script>
          <a href="/careers/engineering">Engineering Jobs</a>
          <a href="/about">About Us</a>
        </body>
      </html>
    `;

    const cleaned = cleanHtml(rawHtml);
    expect(cleaned.title).toContain('Acme Corp - Careers');
    expect(cleaned.text).toContain('We are building the future of distributed systems');
    expect(cleaned.text).not.toContain('malicious');
    expect(cleaned.links).toContain('/careers/engineering');
    expect(cleaned.links).toContain('/about');
  });
});
