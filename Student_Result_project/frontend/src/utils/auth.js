export const parseJwt = (token) => {
    try {
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null; // Expired
        }
        return payload;
    } catch (err) {
        console.warn("Invalid token:", err);
        return null;
    }
};
