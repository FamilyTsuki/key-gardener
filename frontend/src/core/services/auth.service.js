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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to upload avatar");
        }

        return data;
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to update username");
        }

        return data;
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to update email");
        }

        return data;
    }
    static async requestPasswordReset(email) {
        const response = await fetch(`${this.API_URL}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to request reset");
        return data;
    }

    static async resetPassword(email, code, newPassword) {
        const response = await fetch(`${this.API_URL}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to reset password");
        return data;
    }

    static async changePassword(currentPassword, newPassword) {
        const token = this.getToken();
        if (!token) throw new Error("No authentication token found");

        const response = await fetch(`${this.API_URL}/change-password`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to change password");
        return data;
    }
}
