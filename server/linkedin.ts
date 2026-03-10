/**
 * Fetches a LinkedIn public profile and extracts useful text.
 * LinkedIn heavily blocks scraping, so this is best-effort.
 * Falls back gracefully if blocked.
 */
export async function fetchLinkedInProfile(url: string): Promise<string> {
  // Normalize URL
  const cleanUrl = url.trim().replace(/\/$/, "");
  if (!cleanUrl.includes("linkedin.com/in/")) {
    throw new Error("Invalid LinkedIn profile URL. Expected format: https://linkedin.com/in/username");
  }

  const res = await fetch(cleanUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`LinkedIn returned ${res.status}. Profile may be private or URL is wrong.`);
  }

  const html = await res.text();

  // Extract text from meta tags and JSON-LD (works even on login-walled pages)
  const extracted: string[] = [];

  // og:title — usually "Name - Title - Company"
  const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
  if (ogTitle) extracted.push(`Name/Title: ${decodeEntities(ogTitle[1])}`);

  // og:description — usually the summary/about
  const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/);
  if (ogDesc) extracted.push(`About: ${decodeEntities(ogDesc[1])}`);

  // description meta tag
  const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  if (metaDesc && !ogDesc) extracted.push(`Summary: ${decodeEntities(metaDesc[1])}`);

  // JSON-LD structured data (sometimes contains detailed profile info)
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld.name) extracted.push(`Full Name: ${ld.name}`);
      if (ld.jobTitle) extracted.push(`Job Title: ${ld.jobTitle}`);
      if (ld.worksFor?.name) extracted.push(`Company: ${ld.worksFor.name}`);
      if (ld.description) extracted.push(`Description: ${ld.description}`);
      if (ld.alumniOf) {
        const schools = Array.isArray(ld.alumniOf) ? ld.alumniOf : [ld.alumniOf];
        extracted.push(`Education: ${schools.map((s: any) => s.name || s).join(", ")}`);
      }
    } catch {}
  }

  // Extract visible text sections from profile sections
  const sectionPattern = /<section[^>]*>([\s\S]*?)<\/section>/g;
  let match;
  while ((match = sectionPattern.exec(html)) !== null) {
    const sectionText = stripHtml(match[1]).trim();
    if (sectionText.length > 30 && sectionText.length < 5000) {
      extracted.push(sectionText);
    }
  }

  if (extracted.length === 0) {
    throw new Error(
      "Could not extract profile data. LinkedIn may have blocked the request. Try uploading your LinkedIn PDF export instead (LinkedIn > Profile > More > Save to PDF)."
    );
  }

  return extracted.join("\n\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
