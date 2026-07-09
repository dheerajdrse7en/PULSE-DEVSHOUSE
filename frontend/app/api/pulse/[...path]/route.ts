/**
 * app/api/pulse/[...path]/route.ts
 *
 * Server-side proxy: routes /api/pulse/* → PULSE backend
 * Bypasses self-signed cert rejection (runs on Node.js, not browser).
 */

// Set this BEFORE any fetch() calls — allows self-signed certs on Node.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { NextRequest, NextResponse } from 'next/server';

const PULSE_ORIGIN =
    process.env.PULSE_API_URL ??
    process.env.NEXT_PUBLIC_PULSE_API_URL ??
    'http://127.0.0.1:8000';

export async function GET(
    _request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = (params.path ?? []).join('/');
    const targetUrl = `${PULSE_ORIGIN}/${path}`;

    try {
        const resp = await fetch(targetUrl, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });

        if (!resp.ok) {
            return NextResponse.json(
                { error: `PULSE backend returned ${resp.status}` },
                { status: resp.status }
            );
        }

        const contentType = resp.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const data = await resp.json();
            return NextResponse.json(data, {
                headers: { 'Cache-Control': 'no-store' },
            });
        } else {
            // Forward binary data (like images from /debug-files)
            const buffer = await resp.arrayBuffer();
            const isSuccess = resp.status >= 200 && resp.status < 300;
            return new NextResponse(buffer, {
                status: resp.status,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': isSuccess ? 'public, max-age=86400' : 'no-store',
                },
            });
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[pulse-proxy] Error:', msg, '→', targetUrl);
        return NextResponse.json({ error: `Proxy error: ${msg}` }, { status: 502 });
    }
}
