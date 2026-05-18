import { AuthService } from "./auth.service.js";

export class PostsService {
    static API_URL = "/api/posts";

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

    static async getAllPosts() {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/`, { headers });
        return this.handleResponse(response, "Failed to fetch posts");
    }

    static async getPostById(id) {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/${id}`, { headers });
        return this.handleResponse(response, "Failed to fetch post");
    }

    static async getUserPosts(userId) {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/user/${userId}`, { headers });
        return this.handleResponse(response, "Failed to fetch user posts");
    }

    static async createPost(content, file = null) {
        const token = AuthService.getToken();

        if (!token) {
            throw new Error("Not authenticated");
        }

        const formData = new FormData();
        formData.append("content", content);
        if (file) {
            formData.append("media", file);
        }

        const response = await fetch(`${this.API_URL}/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        return this.handleResponse(response, "Failed to create post");
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

        return this.handleResponse(response, "Failed to update post");
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

        return this.handleResponse(response, "Failed to delete post");
    }

    static async upvotePost(id) {
        const token = AuthService.getToken();

        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/${id}/upvote`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return this.handleResponse(response, "Failed to upvote post");
    }

    static async downvotePost(id) {
        const token = AuthService.getToken();

        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${this.API_URL}/${id}/downvote`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return this.handleResponse(response, "Failed to downvote post");
    }
}
