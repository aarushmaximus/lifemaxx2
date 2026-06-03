/**
 * Cloudflare Worker Entry Point
 * - Intercepts /api/sync requests and proxies them server-side to jsonbin-zeta (no CORS issues)
 * - All other requests are served as static assets from the "." directory
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── /api/sync proxy ──
    if (url.pathname === '/api/sync') {
      const CORS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
      }

      const key = url.searchParams.get('key');
      const targetUrl = key
        ? `https://jsonbin-zeta.vercel.app/api/bins/${key}`
        : `https://jsonbin-zeta.vercel.app/api/bins`;

      const init = {
        method: request.method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (request.method === 'POST' || request.method === 'PUT') {
        init.body = await request.text();
      }

      try {
        const res = await fetch(targetUrl, init);
        const body = await res.text();
        return new Response(body, { status: res.status, headers: CORS });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: CORS
        });
      }
    }

    // ── Everything else → serve static assets ──
    const response = await env.ASSETS.fetch(request);

    // Force no-cache headers for sw.js and index.html so CDN Edge and browsers grab updates immediately
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/sw.js') {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  }
};
