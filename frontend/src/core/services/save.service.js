import { AuthService } from "./auth.service.js";

/**
 * Service to manage game saves.
 */
export class SaveService {
    static API_URL = "/api/saves";

    /**
     * Retrieves all saved games for the current user.
     * @returns {Promise<Object>} An object containing the list of saves.
     */
    static async getSaves() {
        
        if (!AuthService.isAuthenticated()) return { success: false, saves: [] };

        const response = await fetch(this.API_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to retrieve saves");
        }
        return data;
    }

    /**
     * Retrieves a specific save by its slot number.
     * @param {number} slot - The slot number of the save.
     * @returns {Promise<Object>} The save data.
     * @throws {Error} If the user is not authenticated or the retrieval fails.
     */
    static async getSaveBySlot(slot) {
        
        if (!AuthService.isAuthenticated()) throw new Error("User not authenticated");

        const response = await fetch(`${this.API_URL}/${slot}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to retrieve save");
        }
        return data;
    }

    /**
     * Saves the current game state to a specific slot.
     * @param {number} slotNumber - The slot number to save to.
     * @param {Object} gameState - The current game state to save.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the user is not authenticated or the save fails.
     */
    static async saveGame(slotNumber, gameState) {
        
        if (!AuthService.isAuthenticated()) throw new Error("User not authenticated");

        const response = await fetch(this.API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ slotNumber, gameState }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to save game");
        }
        return data;
    }

    /**
     * Deletes a specific game save by its slot number.
     * @param {number} slot - The slot number of the save to delete.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the user is not authenticated or the deletion fails.
     */
    static async deleteSave(slot) {
        
        if (!AuthService.isAuthenticated()) throw new Error("User not authenticated");

        const response = await fetch(`${this.API_URL}/${slot}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to delete save");
        }
        return data;
    }
}
