import { AuthService } from "./auth.service.js";

export class PostsService {
    static API_URL = "/api/posts";

    static async getAllPosts() {
        const response = await fetch(`${this.API_URL}/`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch posts");
        }

        return data;
    }

    static async getPostById(id) {
        const response = await fetch(`${this.API_URL}/${id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch post");
        }

        return data;
    }

    static async getUserPosts(userId) {
        const response = await fetch(`${this.API_URL}/user/${userId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch user posts");
        }

        return data;
    }

    static async createPost(content) {
        const token = AuthService.getToken();

        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to create post");
        }

        return data;
    }

    static async updatePost(id, content) {
        const token = AuthService.getToken();

        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to update post");
        }

        return data;
    }

    static async deletePost(id) {
        const token = AuthService.getToken();

        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to delete post");
        }

        return data;
    }

    static async upvotePost(id) {
        const response = await fetch(`${this.API_URL}/${id}/upvote`, {
            method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to upvote post");
        }

        return data;
    }

    static async downvotePost(id) {
        const response = await fetch(`${this.API_URL}/${id}/downvote`, {
            method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to downvote post");
        }

        return data;
    }
}
