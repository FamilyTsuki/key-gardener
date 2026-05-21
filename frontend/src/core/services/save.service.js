import { AuthService } from "./auth.service.js";

export class SaveService {
    static API_URL = "/api/saves";

    static async getSaves() {
        const token = AuthService.getToken();
        if (!token) return { success: false, saves: [] };

        const response = await fetch(this.API_URL, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to retrieve saves");
        }
        return data;
    }

    static async getSaveBySlot(slot) {
        const token = AuthService.getToken();
        if (!token) throw new Error("User not authenticated");

        const response = await fetch(`${this.API_URL}/${slot}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to retrieve save");
        }
        return data;
    }

    static async saveGame(slotNumber, gameState) {
        const token = AuthService.getToken();
        if (!token) throw new Error("User not authenticated");

        const response = await fetch(this.API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ slotNumber, gameState }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to save game");
        }
        return data;
    }

    static async deleteSave(slot) {
        const token = AuthService.getToken();
        if (!token) throw new Error("User not authenticated");

        const response = await fetch(`${this.API_URL}/${slot}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to delete save");
        }
        return data;
    }
}
