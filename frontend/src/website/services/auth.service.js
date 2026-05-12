export class AuthService {
    static API_URL = "/api/auth";

    static async register(username, email, password) {
        const response = await fetch(`${this.API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Registration failed");
        }

        return data;
    }

    static async login(email, password) {
        const response = await fetch(`${this.API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed");
        }

        if (data.token) {
            localStorage.setItem("authToken", data.token);
        }

        return data;
    }

    static logout() {
        localStorage.removeItem("authToken");
    }

    static getToken() {
        return localStorage.getItem("authToken");
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static async getCurrentUser() {
        const token = this.getToken();
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await fetch(`${this.API_URL}/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to get user data");
        }

        return data.user;
    }
}
