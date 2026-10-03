// Optional Vercel Function: forwards LanguageTool checks to the public API so the browser
// never depends on CORS. Only used when the user switches LanguageTool on in settings.
// Deployed automatically by Vercel from the /api folder; not used by `npm run dev`.

const UPSTREAM = 'https://api.languagetool.org/v2/check'
const MAX_BYTES = 20_000 // the public API's per-request limit

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  if (new TextEncoder().encode(body).length > MAX_BYTES + 2_000) {
    return Response.json({ error: 'Text too long for one request' }, { status: 413 })
  }
  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', 'Cache-Control': 'no-store' },
  })
}
