/**
 * @deprecated Use `./auth.ts` in TypeScript modules.
 * This JS shim is kept for backward compatibility with older JS imports.
 */
export const parseJwt = (token) => {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            return null;
        }

        return payload;
    } catch (err) {
        console.warn("[auth] Invalid JWT:", err);
        return null;
    }
};

/**
 * @deprecated Use `./auth.ts` in TypeScript modules.
 */
export const isTokenValid = (token) => parseJwt(token) !== null;

/**
 * @deprecated Use `./auth.ts` in TypeScript modules.
 */
export const getJwtClaim = (token, claim) => {
    const payload = parseJwt(token);
    if (!payload) return null;
    return payload[claim] ?? null;
};
