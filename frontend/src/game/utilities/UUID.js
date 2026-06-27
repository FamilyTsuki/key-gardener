/**
 * Generates the u u i d.
 */
export function generateUUID() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "id-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
}
