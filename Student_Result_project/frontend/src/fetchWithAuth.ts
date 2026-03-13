// fetchWithAuth.ts
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = sessionStorage.getItem("jwt_token");
    const headers: HeadersInit = {
        ...(options.headers as Record<string, string>),
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
    };
    return fetch(url, { ...options, headers });
}
