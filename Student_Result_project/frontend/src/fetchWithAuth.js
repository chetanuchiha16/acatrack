// fetchWithAuth.js
export async function fetchWithAuth(url, options = {}) {
    const token = sessionStorage.getItem("jwt_token");
    const headers = {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
    };
    return fetch(url, { ...options, headers });
}
