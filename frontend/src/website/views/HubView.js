import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { AuthService } from "../../core/services/auth.service.js";
import { PostsService } from "../../core/services/posts.service.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { WarningPopupManager } from "../../core/utils/ModerationWarning.js";

/**
 * View for the community hub displaying posts and interactions.
 */
export default class HubView extends AbstractView {
    /**
     * Creates an instance of HubView.
     *
     * @param {Object} params - The route parameters.
     */
    constructor(params) {
        super(params);
        this.setTitle("Community Hub - Keyboard Survivor");
        this.selectedMediaFile = null;
    }

    /**
     * Renders the community hub view content.
     *
     * @returns {Promise<HTMLElement>} The hub view container element.
     */
    async render() {
        this.postsContainer = el("div", { id: "posts-container" },
            el("p", {}, LanguageManager.t("hub.loadingPosts"))
        );

        return el("div", { className: "community-hub-container" },
            el("h1", {}, LanguageManager.t("hub.title")),
            el("p", { className: "welcome-text" }, LanguageManager.t("hub.welcome")),
            AuthService.isAuthenticated()
                ? this.displayAddPostForm()
                : el("div", { className: "login-prompt" },
                    el("p", {}, LanguageManager.t("hub.loginPrompt")),
                    el("a", { href: "/login", "data-link": "true" }, LanguageManager.t("hub.login"))
                  ),
            this.postsContainer
        );
    }

    /**
     * Generates and returns the form for adding a new post.
     *
     * @returns {HTMLElement} The form container element.
     */
    displayAddPostForm() {
        const fileInput = el("input", {
            type: "file",
            id: "post-media",
            accept: "image/*,video/*",
            className: "hidden",
            onchange: (e) => this.handleMediaSelection(e)
        });

        this.previewContainer = el("div", { id: "media-preview" });

        const postTextarea = el("textarea", {
            id: "post-content",
            className: "form-input",
            placeholder: LanguageManager.t("hub.shareProgress")
        });
        postTextarea.addEventListener("paste", (e) => this.handlePaste(e));

        return el("div", { className: "add-post-form glass-panel" },
            el("h3", {}, LanguageManager.t("hub.addPostTitle")),
            postTextarea,
            fileInput,
            this.previewContainer,
            el("div", { className: "form-actions" },
                el("button", {
                    type: "button",
                    className: "add-media-btn",
                    onclick: () => fileInput.click()
                }, LanguageManager.t("hub.addImageVideo")),
                el("button", { onclick: () => this.addPost(), className: "btn-primary" }, LanguageManager.t("hub.postBtn"))
            )
        );
    }

    handleMediaSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.selectedMediaFile = file;
        this.showMediaPreview(file);
    }

    handlePaste(e) {
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (const item of clipboardItems) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    this.selectedMediaFile = file;
                    this.showMediaPreview(file);
                    break;
                }
            }
        }
    }

    showMediaPreview(file) {
        this.previewContainer.innerHTML = "";

        const previewWrapper = el("div", { className: "preview-wrapper" });
        const removeBtn = el("button", {
            type: "button",
            className: "remove-preview-btn",
            onclick: () => this.clearSelectedMedia()
        }, "×");

        if (file.type.startsWith("video/")) {
            const videoPreview = el("video", {
                src: URL.createObjectURL(file),
                controls: true,
                className: "preview-media"
            });
            previewWrapper.appendChild(videoPreview);
        } else {
            const imagePreview = el("img", {
                src: URL.createObjectURL(file),
                className: "preview-media"
            });
            previewWrapper.appendChild(imagePreview);
        }

        previewWrapper.appendChild(removeBtn);
        this.previewContainer.appendChild(previewWrapper);
    }

    /**
     * Clears the currently selected media file and its preview.
     */
    clearSelectedMedia() {
        this.selectedMediaFile = null;
        if (this.previewContainer) {
            this.previewContainer.innerHTML = "";
        }
        const fileInput = document.getElementById("post-media");
        if (fileInput) {
            fileInput.value = "";
        }
    }

    /**
     * Creates and returns a DOM element for a post.
     * @param {Object} post - The post data object.
     * @returns {HTMLElement} The post DOM element.
     */
    createPostElement(post) {
        let mediaElement = null;
        if (post.image_url) {
            const isVideo = this.isVideo(post.image_url);
            if (isVideo) {
                mediaElement = el("video", {
                    src: post.image_url,
                    controls: true,
                    className: "post-media"
                });
            } else {
                mediaElement = el("img", {
                    src: post.image_url,
                    className: "post-media"
                });
            }
        }

        const upvoteBtn = el("button", {
            className: `vote-btn upvote-btn${post.user_vote === 1 ? " active" : ""}`,
            onclick: async () => this.handleVote(post.id, "upvote")
        }, `▲ ${post.upvotes || 0}`);

        const downvoteBtn = el("button", {
            className: `vote-btn downvote-btn${post.user_vote === -1 ? " active" : ""}`,
            onclick: async () => this.handleVote(post.id, "downvote")
        }, `▼ ${post.downvotes || 0}`);

        const commentsToggleBtn = el("button", {
            className: "vote-btn comments-toggle-btn",
            onclick: () => this.toggleComments(post.id)
        }, el("span", { className: "comment-emoji" }, "💬 "), el("span", { className: "comment-count" }, String(post.comment_count || 0)));

        const voteContainer = el("div", { className: "post-votes" },
            upvoteBtn,
            downvoteBtn,
            commentsToggleBtn
        );

        const isSelfPost = this.currentUserId && post.user_id === this.currentUserId;

        let postActions = null;
        if (isSelfPost) {
            const postDate = new Date(post.created_at.endsWith("Z") ? post.created_at : post.created_at + "Z");
            const diffMinutes = (new Date() - postDate) / (1000 * 60);
            const canEdit = diffMinutes <= 5;

            const editBtn = canEdit ? el("button", { 
                className: "action-btn edit-btn",
                onclick: () => this.handleEdit(post)
            }, LanguageManager.t("hub.edit")) : null;

            const deleteBtn = el("button", {
                className: "action-btn delete-btn",
                onclick: () => this.handleDelete(post.id)
            }, LanguageManager.t("hub.delete"));

            postActions = el("div", { className: "post-actions-container" }, editBtn, deleteBtn);
        }

        const postFooter = el("div", { className: "post-footer" }, voteContainer, postActions);

        const commentsSection = el("div", { className: "comments-section hidden", id: `comments-${post.id}` },
            el("div", { className: "comments-list", id: `comments-list-${post.id}` }),
            AuthService.isAuthenticated() ? el("div", { className: "add-comment-form" },
                el("textarea", { className: "form-input comment-input", id: `comment-input-${post.id}`, placeholder: LanguageManager.t("hub.addComment") }),
                el("button", { className: "btn-primary btn-small post-comment-btn", onclick: () => this.submitComment(post.id) }, LanguageManager.t("hub.postComment"))
            ) : null
        );

        return el("div", { className: `hub-post${isSelfPost ? " self-post" : ""}`, id: `post-${post.id}` },
            el("strong", {}, post.username + ": "),
            el("p", { className: "post-content" }, post.content),
            mediaElement,
            postFooter,
            commentsSection
        );
    }

    async addPost() {
        const postTextarea = document.getElementById("post-content");
        if (!postTextarea) return;
        const content = postTextarea.value.trim();
        if (!content && !this.selectedMediaFile) return;

        try {
            const data = await PostsService.createPost(content, this.selectedMediaFile);
            if (data.success && data.post) {
                postTextarea.value = "";
                this.clearSelectedMedia();
                const noPostsText = this.postsContainer.querySelector("p");
                if (noPostsText && noPostsText.textContent === LanguageManager.t("hub.noPostsYet")) {
                    this.postsContainer.innerHTML = "";
                }
                const newPostEl = this.createPostElement(data.post);
                this.postsContainer.prepend(newPostEl);
            }
        } catch (error) {
            console.error("Error creating post:", error);
            if (error.isModerated) {
                WarningPopupManager.show(content, error.flaggedType, error.warningCount);
            } else {
                FlashMessageManager.show(error.message, "error");
            }
        }
    }

    async init() {
        if (!this.postsContainer) return;

        try {
            let currentUserId = null;
            if (AuthService.isAuthenticated()) {
                try {
                    const user = await AuthService.getCurrentUser();
                    currentUserId = user ? user.id : null;
                    this.currentUserId = currentUserId;
                } catch (err) {
                    console.error("Error retrieving user for post highlighting:", err);
                }
            }

            const data = await PostsService.getAllPosts();

            this.postsContainer.innerHTML = "";

            if (!data.success || data.posts.length === 0) {
                this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.noPostsYet")));
                return;
            }

            data.posts.forEach((post) => {
                this.postsContainer.appendChild(this.createPostElement(post));
            });

        } catch (error) {
            console.error("Error loading posts:", error);
            this.postsContainer.innerHTML = "";
            this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.errorLoading")));
        }
    }

    async handleVote(postId, type) {
        if (!AuthService.isAuthenticated()) {
            FlashMessageManager.show(LanguageManager.t("hub.loginToVote"), "error");
            return;
        }
        try {
            let data;
            if (type === "upvote") {
                data = await PostsService.upvotePost(postId);
            } else {
                data = await PostsService.downvotePost(postId);
            }
            if (data && data.success && data.post) {
                const post = data.post;
                const postElement = document.getElementById(`post-${post.id}`);
                if (postElement) {
                    const upvoteBtn = postElement.querySelector(".upvote-btn");
                    const downvoteBtn = postElement.querySelector(".downvote-btn");
                    
                    if (upvoteBtn) {
                        upvoteBtn.textContent = `▲ ${post.upvotes || 0}`;
                        if (post.user_vote === 1) {
                            upvoteBtn.classList.add("active");
                        } else {
                            upvoteBtn.classList.remove("active");
                        }
                    }
                    if (downvoteBtn) {
                        downvoteBtn.textContent = `▼ ${post.downvotes || 0}`;
                        if (post.user_vote === -1) {
                            downvoteBtn.classList.add("active");
                        } else {
                            downvoteBtn.classList.remove("active");
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error casting ${type}:`, error);
            FlashMessageManager.show(error.message || LanguageManager.t("hub.voteFailed"), "error");
        }
    }

    handleEdit(post) {
        const postElement = document.getElementById(`post-${post.id}`);
        if (!postElement) return;

        const contentP = postElement.querySelector(".post-content");
        const actionsContainer = postElement.querySelector(".post-actions-container");
        if (!contentP || !actionsContainer) return;

        const textarea = el("textarea", { className: "form-input edit-post-textarea" });
        textarea.value = post.content;

        const saveBtn = el("button", {
            className: "action-btn save-btn",
            onclick: () => this.handleSaveEdit(post.id, textarea.value)
        }, LanguageManager.t("hub.save"));

        const cancelBtn = el("button", {
            className: "action-btn cancel-btn",
            onclick: () => {
                const currentPostEl = document.getElementById(`post-${post.id}`);
                if (currentPostEl) {
                    currentPostEl.replaceWith(this.createPostElement(post));
                }
            }
        }, LanguageManager.t("hub.cancel"));

        contentP.replaceWith(textarea);

        actionsContainer.innerHTML = "";
        actionsContainer.appendChild(saveBtn);
        actionsContainer.appendChild(cancelBtn);
    }

    async handleSaveEdit(postId, newContent) {
        if (!newContent || newContent.trim().length === 0) return;
        try {
            const data = await PostsService.updatePost(postId, newContent);
            if (data.success && data.post) {
                const postElement = document.getElementById(`post-${postId}`);
                if (postElement) {
                    const newPostEl = this.createPostElement(data.post);
                    postElement.replaceWith(newPostEl);
                }
            }
        } catch (error) {
            if (error.isModerated) {
                WarningPopupManager.show(newContent, error.flaggedType, error.warningCount);
            } else {
                FlashMessageManager.show(error.message || LanguageManager.t("hub.editExpired"), "error");
            }
            try {
                const data = await PostsService.getPostById(postId);
                if (data.success && data.post) {
                    const postElement = document.getElementById(`post-${postId}`);
                    if (postElement) {
                        postElement.replaceWith(this.createPostElement(data.post));
                    }
                }
            } catch (err) {
                console.error("Failed to restore original post:", err);
            }
        }
    }

    async handleDelete(postId) {
        if (!confirm(LanguageManager.t("hub.deleteConfirm"))) return;
        try {
            await PostsService.deletePost(postId);
            const postEl = document.getElementById(`post-${postId}`);
            if (postEl) {
                postEl.remove();
            }
            if (this.postsContainer.children.length === 0) {
                this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.noPostsYet")));
            }
        } catch (error) {
            FlashMessageManager.show(error.message || "Failed to delete post", "error");
        }
    }

    async toggleComments(postId) {
        const section = document.getElementById(`comments-${postId}`);
        if (!section) return;

        if (section.classList.contains("hidden")) {
            section.classList.remove("hidden");
            await this.loadComments(postId);
        } else {
            section.classList.add("hidden");
        }
    }

    async loadComments(postId) {
        const list = document.getElementById(`comments-list-${postId}`);
        if (!list) return;

        list.innerHTML = `<p class="loading-text">${LanguageManager.t("hub.loadingPosts")}</p>`;

        try {
            const data = await PostsService.getComments(postId);
            list.innerHTML = "";
            
            if (!data.success || data.comments.length === 0) {
                list.innerHTML = `<p class="no-comments">${LanguageManager.t("hub.noComments")}</p>`;
                return;
            }

            data.comments.forEach(c => {
                const isSelf = this.currentUserId === c.user_id;
                
                const deleteBtn = isSelf ? el("button", {
                    className: "action-btn delete-btn comment-delete-btn",
                    onclick: () => this.deleteComment(c.id, postId)
                }, "×") : null;

                const bubble = el("div", { className: `comment-bubble${isSelf ? " self-comment" : ""}` },
                    el("strong", {}, c.username + ": "),
                    el("span", {}, c.content),
                    deleteBtn
                );
                list.appendChild(bubble);
            });
        } catch (error) {
            list.innerHTML = `<p class="error">Error loading comments</p>`;
        }
    }

    async submitComment(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        if (!input) return;
        const content = input.value.trim();
        if (!content) return;

        try {
            const data = await PostsService.addComment(postId, content);
            if (data.success) {
                input.value = "";
                await this.loadComments(postId);
                const countEl = document.querySelector(`#post-${postId} .comment-count`);
                if (countEl) {
                    const currentCount = parseInt(countEl.textContent, 10) || 0;
                    countEl.textContent = String(currentCount + 1);
                }
            }
        } catch (error) {
            if (error.isModerated) {
                WarningPopupManager.show(content, error.flaggedType, error.warningCount);
            } else {
                FlashMessageManager.show(error.message, "error");
            }
        }
    }

    async deleteComment(commentId, postId) {
        if (!confirm(LanguageManager.t("hub.deleteConfirm"))) return;
        try {
            await PostsService.deleteComment(commentId);
            await this.loadComments(postId);
            const countEl = document.querySelector(`#post-${postId} .comment-count`);
            if (countEl) {
                const currentCount = parseInt(countEl.textContent, 10) || 0;
                countEl.textContent = String(Math.max(0, currentCount - 1));
            }
        } catch (error) {
            FlashMessageManager.show(error.message, "error");
        }
    }

    /**
     * Determines if a given URL points to a video file.
     *
     * @param {string} url - The URL to check.
     * @returns {boolean} True if the URL is a video, false otherwise.
     */
    isVideo(url) {
        if (!url) return false;
        const extension = url.split(".").pop().toLowerCase();
        return ["mp4", "webm", "ogg", "mov"].includes(extension);
    }

    /**
     * Retrieves the CSS files specific to this view.
     *
     * @returns {Array<string>} List of CSS file paths.
     */
    getCss() {
        return ["/asset/css/hub.css"];
    }
}

