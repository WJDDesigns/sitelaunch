import { NextRequest, NextResponse } from "next/server";
import { getPartnerAI, aiComplete } from "@/lib/ai";

/**
 * POST /api/competitor-analyze
 * Body: { url: string; partnerId?: string }
 *
 * Fetches a competitor website, extracts key information, and generates
 * an AI-powered competitive snapshot when the partner has an AI provider connected.
 *
 * This endpoint is intentionally public (no auth) because it is called from
 * the public-facing submission form on client subdomains.
 */
export async function POST(req: NextRequest) {
  let body: { url: string; partnerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, partnerId } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url field" }, { status: 400 });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinqMe/1.0; +https://linqme.co)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch site (HTTP ${response.status})` },
        { status: 502 },
      );
    }

    const html = await response.text();

    // ── Extract metadata from HTML ──────────────────────────────

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
    ) ?? html.match(
      /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i,
    );
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i,
    ) ?? html.match(
      /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i,
    );

    // Extract headings for structure analysis
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 20) {
      const text = hMatch[1].replace(/<[^>]+>/g, "").trim();
      if (text) headings.push(text);
    }

    // Extract links for navigation analysis
    const navLinks: string[] = [];
    const linkRegex = /<a[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let lMatch;
    while ((lMatch = linkRegex.exec(html)) !== null && navLinks.length < 15) {
      const linkText = lMatch[2].replace(/<[^>]+>/g, "").trim();
      if (linkText && linkText.length < 50) navLinks.push(linkText);
    }

    // Extract visible text (strip tags, scripts, styles)
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " [NAV] ")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " [HEADER] ")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " [FOOTER] ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // ── Detect tech stack ───────────────────────────────────────

    const techStack: string[] = [];
    if (html.includes("wp-content") || html.includes("wp-includes")) techStack.push("WordPress");
    if (html.includes("Shopify.theme") || html.includes("cdn.shopify.com")) techStack.push("Shopify");
    if (html.includes("squarespace.com") || html.includes("squarespace-cdn")) techStack.push("Squarespace");
    if (html.includes("wix.com") || html.includes("parastorage.com")) techStack.push("Wix");
    if (html.includes("__next") || html.includes("_next/static")) techStack.push("Next.js");
    if (html.includes("__nuxt")) techStack.push("Nuxt");
    if (html.includes("gatsby")) techStack.push("Gatsby");
    if (html.includes("webflow.com")) techStack.push("Webflow");
    if (html.includes("react") || html.includes("__REACT")) techStack.push("React");
    if (html.includes("tailwindcss") || html.includes("tailwind")) techStack.push("Tailwind CSS");
    if (html.includes("bootstrap")) techStack.push("Bootstrap");
    if (html.includes("google-analytics.com") || html.includes("gtag(")) techStack.push("Google Analytics");
    if (html.includes("googletagmanager.com")) techStack.push("Google Tag Manager");
    if (html.includes("hotjar.com")) techStack.push("Hotjar");
    if (html.includes("intercom")) techStack.push("Intercom");
    if (html.includes("drift.com") || html.includes("driftt.com")) techStack.push("Drift");
    if (html.includes("hubspot")) techStack.push("HubSpot");

    // ── Detect social links ─────────────────────────────────────

    const socialPatterns: Record<string, RegExp> = {
      Facebook: /facebook\.com\/[^"'\s]+/i,
      Twitter: /(?:twitter|x)\.com\/[^"'\s]+/i,
      Instagram: /instagram\.com\/[^"'\s]+/i,
      LinkedIn: /linkedin\.com\/(?:company|in)\/[^"'\s]+/i,
      YouTube: /youtube\.com\/[^"'\s]+/i,
      TikTok: /tiktok\.com\/@[^"'\s]+/i,
    };
    const socialLinks: string[] = [];
    for (const [name, pattern] of Object.entries(socialPatterns)) {
      if (pattern.test(html)) socialLinks.push(name);
    }

    // ── Check for common features ───────────────────────────────

    const hasContactForm = /type=["']email["']|<form[^>]*contact/i.test(html);
    const hasCTA = /<(?:a|button)[^>]*(?:class|id)[^>]*(?:cta|hero|primary|get-started|sign-up|contact)[^>]*>/i.test(html);
    const hasChat = /intercom|drift|tawk|crisp|livechat|zendesk.*chat/i.test(html);
    const hasBlog = /\/blog|\/articles|\/news|\/posts/i.test(html);
    const hasTestimonials = /testimonial|review|what.*(?:clients|customers).*say/i.test(html);
    const hasVideo = /<video|youtube\.com\/embed|vimeo\.com/i.test(html);
    const hasViewport = /<meta[^>]*viewport/i.test(html);

    // ── Build base result ───────────────────────────────────────

    const result: Record<string, unknown> = {
      url: parsed.toString(),
      title: titleMatch?.[1]?.trim() ?? null,
      description: descMatch?.[1]?.trim() ?? null,
      ogImage: ogImageMatch?.[1]?.trim() ?? null,
      headings: headings.slice(0, 10),
      navLinks: [...new Set(navLinks)].slice(0, 10),
      textPreview: cleaned.slice(0, 500),
      techStack: [...new Set(techStack)],
      socialLinks,
      features: {
        contactForm: hasContactForm,
        callToAction: hasCTA,
        liveChat: hasChat,
        blog: hasBlog,
        testimonials: hasTestimonials,
        video: hasVideo,
        mobileResponsive: hasViewport,
      },
      fetchedAt: new Date().toISOString(),
    };

    // ── AI-powered competitive snapshot ─────────────────────────

    if (partnerId && typeof partnerId === "string") {
      const ai = await getPartnerAI(partnerId);
      if (ai) {
        const siteData = [
          `URL: ${parsed.toString()}`,
          `Title: ${result.title || "N/A"}`,
          `Description: ${result.description || "N/A"}`,
          `Tech Stack: ${(result.techStack as string[]).join(", ") || "Unknown"}`,
          `Social Presence: ${socialLinks.join(", ") || "None detected"}`,
          `Features: Contact form: ${hasContactForm}, CTA: ${hasCTA}, Live chat: ${hasChat}, Blog: ${hasBlog}, Testimonials: ${hasTestimonials}, Video: ${hasVideo}, Mobile: ${hasViewport}`,
          `Navigation: ${(result.navLinks as string[]).join(", ")}`,
          `Headings: ${headings.slice(0, 10).join(" | ")}`,
          `Content preview: ${cleaned.slice(0, 1500)}`,
        ].join("\n");

        const systemPrompt = `You are a senior web design strategist helping an agency analyze a competitor website for a client onboarding project. Be concise, specific, and actionable. Write in a professional but approachable tone.`;

        const userPrompt = `Analyze this competitor website and provide a quick competitive snapshot. Here's the extracted data:

${siteData}

Respond in this exact format (keep each section to 1-2 sentences):

**What they do well:** [Specific strengths you can identify from the site]
**Where they fall short:** [Gaps, missing features, or areas that could be improved]
**Design & UX:** [Quick assessment of their visual approach and user experience based on the tech, structure, and features detected]
**Opportunity for the client:** [One clear, actionable takeaway the agency can use — what the client's new site should do differently or better]`;

        const snapshot = await aiComplete(ai, systemPrompt, userPrompt);
        if (snapshot) {
          result.aiSnapshot = snapshot;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: `Fetch failed: ${message}` }, { status: 502 });
  }
}
