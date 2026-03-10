import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLinkedInProfile } from "./linkedin.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchLinkedInProfile", () => {
  it("rejects invalid URLs", async () => {
    await expect(fetchLinkedInProfile("https://google.com")).rejects.toThrow(
      "Invalid LinkedIn profile URL"
    );
  });

  it("rejects empty URLs", async () => {
    await expect(fetchLinkedInProfile("")).rejects.toThrow(
      "Invalid LinkedIn profile URL"
    );
  });

  it("extracts data from og:title and og:description", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <head>
              <meta property="og:title" content="John Doe - Senior Engineer - Acme Corp" />
              <meta property="og:description" content="10 years of experience building distributed systems. Expert in Ruby, Go, and Python." />
            </head>
            <body></body>
          </html>
        `),
      })
    );

    const result = await fetchLinkedInProfile("https://linkedin.com/in/johndoe");
    expect(result).toContain("John Doe - Senior Engineer - Acme Corp");
    expect(result).toContain("10 years of experience");
  });

  it("extracts JSON-LD structured data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <head>
              <script type="application/ld+json">
                {
                  "name": "Jane Smith",
                  "jobTitle": "Staff Engineer",
                  "worksFor": { "name": "BigTech Inc" },
                  "alumniOf": [{ "name": "MIT" }]
                }
              </script>
            </head>
            <body></body>
          </html>
        `),
      })
    );

    const result = await fetchLinkedInProfile("https://linkedin.com/in/janesmith");
    expect(result).toContain("Jane Smith");
    expect(result).toContain("Staff Engineer");
    expect(result).toContain("BigTech Inc");
    expect(result).toContain("MIT");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 })
    );

    await expect(
      fetchLinkedInProfile("https://linkedin.com/in/blocked")
    ).rejects.toThrow("LinkedIn returned 403");
  });

  it("throws when no data can be extracted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("<html><body>Login required</body></html>"),
      })
    );

    await expect(
      fetchLinkedInProfile("https://linkedin.com/in/private")
    ).rejects.toThrow("Could not extract profile data");
  });

  it("decodes HTML entities in extracted text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <head>
              <meta property="og:title" content="John &amp; Jane&#39;s Company" />
              <meta property="og:description" content="We build &quot;great&quot; things" />
            </head>
          </html>
        `),
      })
    );

    const result = await fetchLinkedInProfile("https://linkedin.com/in/test");
    expect(result).toContain("John & Jane's Company");
    expect(result).toContain('"great"');
  });

  it("strips trailing slash from URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html><head>
          <meta property="og:title" content="Test User" />
        </head></html>
      `),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchLinkedInProfile("https://linkedin.com/in/testuser/");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://linkedin.com/in/testuser",
      expect.any(Object)
    );
  });
});
