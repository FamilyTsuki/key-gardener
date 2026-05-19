export class AuthService {
    static API_URL = "/api/auth";

    static async handleResponse(response, defaultError) {
        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const errorText = await response.text();
            throw new Error(errorText || "Too many requests, please try again later.");
        }

        if (!response.ok) {
            throw new Error(data.message || defaultError);
        }

        return data;
    }

    static async register(username, email, password) {
        const response = await fetch(`${this.API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        return this.handleResponse(response, "Registration failed");
    }

    static async login(email, password) {
        const response = await fetch(`${this.API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await this.handleResponse(response, "Login failed");

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

        const data = await this.handleResponse(response, "Failed to get user data");
        return data.user;
    }

    static async uploadAvatar(file) {
        const token = this.getToken();
        if (!token) {
            throw new Error("No authentication token found");
        }

        const formData = new FormData();
        formData.append("avatar", file);

        const response = await fetch(`${this.API_URL}/upload-avatar`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        return this.handleResponse(response, "Failed to upload avatar");
    }

    static async updateUsername(newUsername) {
        const token = this.getToken();
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await fetch(`${this.API_URL}/update-username`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ newUsername }),
        });

        return this.handleResponse(response, "Failed to update username");
    }

    static async updateEmail(newEmail) {
        const token = this.getToken();
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await fetch(`${this.API_URL}/update-email`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ newEmail }),
        });

        return this.handleResponse(response, "Failed to update email");
    }

    static async requestPasswordReset(email) {
        const response = await fetch(`${this.API_URL}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        return this.handleResponse(response, "Failed to request reset");
    }

    static async resetPassword(email, code, newPassword) {
        const response = await fetch(`${this.API_URL}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, newPassword }),
        });

        return this.handleResponse(response, "Failed to reset password");
    }

    static async changePassword(currentPassword, newPassword) {
        const token = this.getToken();
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await fetch(`${this.API_URL}/change-password`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        return this.handleResponse(response, "Failed to change password");
    }
}
