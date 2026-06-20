import SocketService from "./SocketService.js?v=1";

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
        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            if (data.user.settings) this.syncSettingsToLocalStorage(data.user.settings);
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
        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            if (data.user.settings) this.syncSettingsToLocalStorage(data.user.settings);
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
            body: JSON.stringify({ credential }),
        });

        const data = await this.handleResponse(response, "Google authentication failed");

        if (data.token) {
            localStorage.setItem("authToken", data.token);
        }
        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            if (data.user.settings) this.syncSettingsToLocalStorage(data.user.settings);
        }

        return data;
    }

    /**
     * Logs out the current user by removing the auth token.
     */
    static logout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
        SocketService.disconnect();
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
        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            if (data.user.settings) this.syncSettingsToLocalStorage(data.user.settings);
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

        const data = await this.handleResponse(response, "Failed to update username");
        if (data.success) {
            localStorage.setItem("username", newUsername);
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
    /**
     * Updates user settings in the backend.
     * @param {Object} settings - The settings object to merge.
     * @returns {Promise<Object>} The response data.
     */
    static async updateSettings(settings) {
        const token = this.getToken();
        if (!token) return { success: false }; // Silently fail if not logged in (guest mode)

        try {
            const response = await fetch(`${this.API_URL}/settings`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(settings),
            });
            return await this.handleResponse(response, "Failed to update settings");
        } catch (e) {
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
        if (data.user) {
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("userId", data.user.id);
            if (data.user.settings) this.syncSettingsToLocalStorage(data.user.settings);
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

        const data = await this.handleResponse(response, "Failed to update username");
        if (data.success) {
            localStorage.setItem("username", newUsername);
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
    /**
     * Updates user settings in the backend.
     * @param {Object} settings - The settings object to merge.
     * @returns {Promise<Object>} The response data.
     */
    static async updateSettings(settings) {
        const token = this.getToken();
        if (!token) return { success: false }; // Silently fail if not logged in (guest mode)

        try {
            const response = await fetch(`${this.API_URL}/settings`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
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
        // Implementation replaced below by the interceptor override
    }
}

// Global localStorage override to sync settings to the backend
const originalSetItem = localStorage.setItem;
let syncTimeout = null;
let pendingSettings = {};
let isInternalSync = false;

localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);

    // Tracked keys to sync
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
        }, 1000); // 1s debounce
    }
};

// Update syncSettingsToLocalStorage to avoid triggering the interceptor
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
