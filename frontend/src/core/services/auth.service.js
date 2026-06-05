/**
 * Service to handle authentication and user account operations.
 */
export class AuthService {
    static API_URL = "/api/auth";

    /**
     * Handles API responses, parsing JSON or text, and throwing errors if not ok.
     * @param {Response} response - The fetch response object.
     * @param {string} defaultError - The default error message to use if none is provided by the server.
     * @returns {Promise<any>} The parsed response data.
     * @throws {Error} If the response is not ok.
     */
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

    /**
     * Registers a new user.
     * @param {string} username - The user's username.
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<Object>} The registration response data.
     */
    static async register(username, email, password) {
        const response = await fetch(`${this.API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await this.handleResponse(response, "Registration failed");

        if (data.token) {
            localStorage.setItem("authToken", data.token);
        }

        return data;
    }

    /**
     * Logs in a user.
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<Object>} The login response data containing the token.
     */
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

    /**
     * Logs out the current user by removing the auth token.
     */
    static logout() {
        localStorage.removeItem("authToken");
    }

    /**
     * Retrieves the current authentication token.
     * @returns {string|null} The auth token, or null if not found.
     */
    static getToken() {
        return localStorage.getItem("authToken");
    }

    /**
     * Checks if the user is authenticated.
     * @returns {boolean} True if the user is authenticated, false otherwise.
     */
    static isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Fetches the current user's profile data.
     * @returns {Promise<Object>} The user profile data.
     * @throws {Error} If no token is found.
     */
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

    /**
     * Uploads a new avatar for the user.
     * @param {File} file - The image file to upload.
     * @returns {Promise<Object>} The upload response data.
     * @throws {Error} If no token is found.
     */
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

    /**
     * Updates the user's username.
     * @param {string} newUsername - The new username.
     * @returns {Promise<Object>} The update response data.
     * @throws {Error} If no token is found.
     */
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

    /**
     * Updates the user's email address.
     * @param {string} newEmail - The new email address.
     * @returns {Promise<Object>} The update response data.
     * @throws {Error} If no token is found.
     */
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

    /**
     * Requests a password reset for a given email address.
     * @param {string} email - The email address to reset the password for.
     * @returns {Promise<Object>} The response data.
     */
    static async requestPasswordReset(email) {
        const response = await fetch(`${this.API_URL}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        return this.handleResponse(response, "Failed to request reset");
    }

    /**
     * Resets a user's password using a reset code.
     * @param {string} email - The user's email address.
     * @param {string} code - The password reset code.
     * @param {string} newPassword - The new password.
     * @returns {Promise<Object>} The response data.
     */
    static async resetPassword(email, code, newPassword) {
        const response = await fetch(`${this.API_URL}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, newPassword }),
        });

        return this.handleResponse(response, "Failed to reset password");
    }

    /**
     * Changes the current user's password.
     * @param {string} currentPassword - The current password.
     * @param {string} newPassword - The new password.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If no token is found.
     */
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
