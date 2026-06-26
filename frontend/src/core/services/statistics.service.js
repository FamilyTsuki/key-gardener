import { AuthService } from "./auth.service.js";

/**
 * Service to manage game statistics for the user.
 */
export class StatisticsService {
    /**
     * Gets the current user's statistics.
     * @returns {Promise<Object>} Statistics object.
     */
    static async getStats() {
        
        if (!token) throw new Error("User is not authenticated");

        const response = await fetch("/api/stats", {
            headers: {
            },
            credentials: "include"
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch stats");
        }
        
        return data.stats;
    }

    /**
     * Sends new stats to update the user's profile.
     * @param {Object} statsData - Stats from the recent play session.
     * @returns {Promise<Object>} The updated stats object.
     */
    static async updateStats(statsData) {
        
        if (!token) throw new Error("User is not authenticated");

        const response = await fetch("/api/stats", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(statsData)
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to update stats");
        }
        
        return data.stats;
    }

    /**
     * Calculates the user's rank based on their WPM.
     * @param {number} wpm - Words per minute.
     * @returns {Object} Rank name and class for styling.
     */
    static getRankFromWpm(wpm) {
        if (wpm >= 100) return { name: "Hacker", class: "rank-hacker" };
        if (wpm >= 70) return { name: "Pro", class: "rank-pro" };
        if (wpm >= 50) return { name: "Intermédiaire", class: "rank-intermediate" };
        if (wpm >= 30) return { name: "Initié", class: "rank-initiate" };
        return { name: "Débutant", class: "rank-noob" };
    }
}
