// fetchWithAuth.ts
import { getToken } from "./utils/storage";

export interface FetchWithAuthOptions extends globalThis.RequestInit {
    /**
     * When false, the `Content-Type: application/json` header is omitted.
     * Set this to false for multipart/form-data uploads so the browser
     * can set the boundary automatically.
     * @default true
     */
    setJsonContentType?: boolean;
}

/**
 * Wrapper around the native Fetch API that automatically attaches the JWT
 * Authorization header from sessionStorage.
 *
 * @param url     - The endpoint URL (absolute or relative)
 * @param options - Standard RequestInit options + `setJsonContentType`
 */
export async function fetchWithAuth(
    url: string,
    options: FetchWithAuthOptions = {}
): Promise<Response> {
    const { setJsonContentType = true, ...fetchOptions } = options;

    const token = getToken();

    const baseHeaders: Record<string, string> = {
        ...(fetchOptions.headers as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(setJsonContentType ? { "Content-Type": "application/json" } : {}),
    };

    return fetch(url, { ...fetchOptions, headers: baseHeaders });
}
