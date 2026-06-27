import SocketService from "./SocketService.js?v=1";

/**
 * Service to handle authentication and user account operations.
 */
export class AuthService {
    static API_URL = "/api/auth";
    static _isAuthenticated = false;
    static _currentUser = null;

    static async init() {
        try {
            const user = await this.getCurrentUser();
            if (user) {
                this._isAuthenticated = true;
                this._currentUser = user;
            } else {
                this._isAuthenticated = false;
                this._currentUser = null;
            }
        } catch (error) {
            this._isAuthenticated = false;
            this._currentUser = null;
        }
    }

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
            credentials: "include",
            body: JSON.stringify({ username, email, password }),
        });

        const data = await this.handleResponse(response, "Registration failed");

        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            this._isAuthenticated = true;
            this._currentUser = data.user;
        }

        return data;
    }

    /**
     * Logs in a user.
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<Object>} The login response data.
     */
    static async login(email, password) {
        const response = await fetch(`${this.API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
        });

        const data = await this.handleResponse(response, "Login failed");

        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            this._isAuthenticated = true;
            this._currentUser = data.user;
        }

        return data;
    }

    /**
     * Authenticates the user with a Google OAuth credential token.
     * @param {string} credential - The Google OAuth2 ID token.
     * @returns {Promise<Object>} The authentication response containing JWT and user profile.
     */
    static async loginWithGoogle(credential) {
        const response = await fetch(`${this.API_URL}/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ credential }),
        });

        const data = await this.handleResponse(response, "Google authentication failed");

        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            this._isAuthenticated = true;
            this._currentUser = data.user;
        }

        return data;
    }

    /**
     * Logs out the current user by removing the auth token.
     */
    static async logout() {
        try {
            await fetch(`${this.API_URL}/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (e) {
            console.error("Logout request failed", e);
        }
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
        this._isAuthenticated = false;
        this._currentUser = null;
        SocketService.disconnect();
    }

    /**
     * Checks if the user is authenticated.
     * @returns {boolean} True if the user is authenticated, false otherwise.
     */
    static isAuthenticated() {
        return this._isAuthenticated;
    }

    /**
     * Fetches the current user's profile data.
     * @returns {Promise<Object>} The user profile data.
     * @throws {Error} If no token is found.
     */
    static async getCurrentUser() {
        const response = await fetch(`${this.API_URL}/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        const data = await this.handleResponse(response, "Failed to get user data");
        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            this._isAuthenticated = true;
            this._currentUser = data.user;
        }
        return data.user;
    }

    /**
     * Uploads a new avatar for the user.
     * @param {File} file - The image file to upload.
     * @returns {Promise<Object>} The upload response data.
     * @throws {Error} If no token is found.
     */
    static async uploadAvatar(file) {
        if (!this.isAuthenticated()) {
            throw new Error("Not authenticated");
        }

        const formData = new FormData();
        formData.append("avatar", file);

        const response = await fetch(`${this.API_URL}/upload-avatar`, {
            method: "POST",
            credentials: "include",
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
        if (!this.isAuthenticated()) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/update-username`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ newUsername }),
        });

        const data = await this.handleResponse(response, "Failed to update username");
        if (data.success) {
            localStorage.setItem("username", newUsername);
            if (this._currentUser) {
                this._currentUser.username = newUsername;
            }
        }
        return data;
    }

    /**
     * Updates the user's email address.
     * @param {string} newEmail - The new email address.
     * @returns {Promise<Object>} The update response data.
     * @throws {Error} If no token is found.
     */
    static async updateEmail(newEmail) {
        if (!this.isAuthenticated()) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/update-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ newEmail }),
        });

        const data = await this.handleResponse(response, "Failed to update email");
        if (data.success && this._currentUser) {
            this._currentUser.email = newEmail;
        }
        return data;
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
        if (!this.isAuthenticated()) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        return this.handleResponse(response, "Failed to change password");
    }

    /**
     * Updates user settings in the backend.
     * @param {Object} settings - The settings object to merge.
     * @returns {Promise<Object>} The response data.
     */
    static async updateSettings(settings) {
        if (!this.isAuthenticated()) return { success: false };

        try {
            const response = await fetch(`${this.API_URL}/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(settings),
            });
            return await this.handleResponse(response, "Failed to update settings");
        } catch (e) {
            console.error(e);
            return { success: false };
        }
    }

    /**
     * Helper to sync backend settings to local storage.
     */
    static syncSettingsToLocalStorage(settings) {
    }

    /**
     * Deletes the user account.
     * @returns {Promise<Object>} The deletion response data.
     */
    static async deleteAccount() {
        const response = await fetch(`${this.API_URL}/me`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await this.handleResponse(response, "Account deletion failed");

        this._isAuthenticated = false;
        this._currentUser = null;
        localStorage.removeItem("username");
        localStorage.removeItem("userId");

        return data;
    }
}

const originalSetItem = localStorage.setItem;
let syncTimeout = null;
let pendingSettings = {};
let isInternalSync = false;

localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);

    const trackedKeys = ["app_lang", "theme", "game_settings", "unlockedFingersColors"];
    if (!isInternalSync && trackedKeys.includes(key)) {
        let parsedValue = value;
        if (key === "game_settings") {
            try { parsedValue = JSON.parse(value); } catch (e) {}
        }
        pendingSettings[key] = parsedValue;

        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            if (Object.keys(pendingSettings).length > 0) {
                AuthService.updateSettings(pendingSettings);
                pendingSettings = {};
            }
        }, 1000);
    }
};

AuthService.syncSettingsToLocalStorage = function(settings) {
    isInternalSync = true;
    for (const key of Object.keys(settings)) {
        let val = settings[key];
        if (typeof val === 'object') {
            val = JSON.stringify(val);
        }
        originalSetItem.call(localStorage, key, val);
    }
    isInternalSync = false;
};
