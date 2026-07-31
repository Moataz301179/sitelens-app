export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ items: [], note: "No query provided." });

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=6`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "SiteLens" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return Response.json(
      { items: [], note: res.status === 403 || res.status === 429 ? "GitHub rate limit hit." : `GitHub returned ${res.status}.` },
      { status: 200 },
    );
  }

  const data = await res.json() as { items?: { full_name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null; updated_at: string; topics?: string[] }[] };
  return Response.json({
    items: (data.items ?? []).map((r) => ({
      name: r.full_name, url: r.html_url, description: r.description ?? "",
      stars: r.stargazers_count, language: r.language, updated: r.updated_at,
      topics: (r.topics ?? []).slice(0, 5),
    })),
  });
}
