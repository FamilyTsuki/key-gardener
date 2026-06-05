import { AuthService } from "./auth.service.js";

/**
 * Service to handle posts-related API requests.
 */
export class PostsService {
    static API_URL = "/api/posts";

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
            const error = new Error(data.message || defaultError);
            error.isModerated = data.isModerated;
            error.flaggedType = data.flaggedType;
            error.warningCount = data.warningCount;
            throw error;
        }

        return data;
    }

    /**
     * Retrieves all posts from the server.
     * @returns {Promise<Array>} A promise resolving to a list of posts.
     */
    static async getAllPosts() {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/`, { headers });
        return this.handleResponse(response, "Failed to fetch posts");
    }

    /**
     * Retrieves a specific post by its ID.
     * @param {string} id - The ID of the post.
     * @returns {Promise<Object>} A promise resolving to the post data.
     */
    static async getPostById(id) {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/${id}`, { headers });
        return this.handleResponse(response, "Failed to fetch post");
    }

    /**
     * Retrieves all posts created by a specific user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array>} A promise resolving to a list of the user's posts.
     */
    static async getUserPosts(userId) {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/user/${userId}`, { headers });
        return this.handleResponse(response, "Failed to fetch user posts");
    }

    /**
     * Creates a new post.
     * @param {string} content - The content of the post.
     * @param {File} [file=null] - An optional media file attached to the post.
     * @returns {Promise<Object>} A promise resolving to the created post data.
     * @throws {Error} If the user is not authenticated.
     */
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

    /**
     * Updates an existing post.
     * @param {string} id - The ID of the post to update.
     * @param {string} content - The new content of the post.
     * @returns {Promise<Object>} A promise resolving to the updated post data.
     * @throws {Error} If the user is not authenticated.
     */
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

    /**
     * Deletes an existing post.
     * @param {string} id - The ID of the post to delete.
     * @returns {Promise<Object>} A promise resolving to the deletion response data.
     * @throws {Error} If the user is not authenticated.
     */
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

    /**
     * Upvotes a specific post.
     * @param {string} id - The ID of the post.
     * @returns {Promise<Object>} A promise resolving to the response data.
     * @throws {Error} If the user is not authenticated.
     */
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

    /**
     * Downvotes a specific post.
     * @param {string} id - The ID of the post.
     * @returns {Promise<Object>} A promise resolving to the response data.
     * @throws {Error} If the user is not authenticated.
     */
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

    /**
     * Retrieves all comments for a post.
     * @param {string} id - The ID of the post.
     * @returns {Promise<Object>} A promise resolving to the comments data.
     */
    static async getComments(id) {
        const token = AuthService.getToken();
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.API_URL}/${id}/comments`, { headers });
        return this.handleResponse(response, "Failed to fetch comments");
    }

    /**
     * Adds a comment to a post.
     * @param {string} id - The ID of the post.
     * @param {string} content - The comment content.
     * @returns {Promise<Object>} A promise resolving to the created comment data.
     */
    static async addComment(id, content) {
        const token = AuthService.getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`${this.API_URL}/${id}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
        });
        return this.handleResponse(response, "Failed to add comment");
    }

    /**
     * Deletes a comment.
     * @param {string} commentId - The ID of the comment to delete.
     * @returns {Promise<Object>}
     */
    static async deleteComment(commentId) {
        const token = AuthService.getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`${this.API_URL}/comments/${commentId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return this.handleResponse(response, "Failed to delete comment");
    }

    static async contestModeration(content, flaggedType) {
        const token = AuthService.getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`${this.API_URL}/contest`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content, flaggedType }),
        });
        return this.handleResponse(response, "Failed to send contest report");
    }
}
