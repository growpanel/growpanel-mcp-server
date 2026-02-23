const DEFAULT_API_URL = 'https://api.growpanel.io';

export async function callApi(options: {
    method: string;
    path: string;
    params?: Record<string, string>;
    body?: unknown;
}): Promise<unknown> {
    const baseUrl = (process.env.GROWPANEL_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
    const apiKey = process.env.GROWPANEL_API_KEY || process.env.GROWPANEL_API_TOKEN;

    if (!apiKey) {
        throw new Error(
            'API key not configured. Set GROWPANEL_API_KEY environment variable. ' +
            'Get your key at https://app.growpanel.io → Settings → API Keys.'
        );
    }

    const url = new URL(options.path, baseUrl);
    if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
            if (value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            }
        }
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };

    const res = await fetch(url.toString(), {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
    }

    if (res.status === 204) {
        return { success: true };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
        return await res.text();
    }

    return await res.json();
}

export function unwrap(data: unknown): unknown {
    if (data && typeof data === 'object' && 'result' in (data as Record<string, unknown>)) {
        return (data as Record<string, unknown>).result;
    }
    return data;
}

function filterParams(obj: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null && value !== '') {
            result[key] = String(value);
        }
    }
    return result;
}

export { filterParams };
