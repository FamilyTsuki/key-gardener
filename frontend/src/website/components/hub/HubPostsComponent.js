import { el, clear } from "../../../core/utils/DOMBuilder.js";
import { AuthService } from "../../../core/services/auth.service.js";
import { PostsService } from "../../../core/services/posts.service.js";
import { FlashMessageManager } from "../../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { WarningPopupManager } from "../../../core/utils/ModerationWarning.js";

export class HubPostsComponent {
    constructor() {
        this.postsContainer = null;
        this.currentSort = "hot";
        this.currentUserId = null;
        this.posts = [];
    }

    render() {
        this.postsContainer = el("div", { id: "posts-container" },
            el("p", {}, LanguageManager.t("hub.loadingPosts"))
        );

        this.sortContainer = el("div", { className: "sort-container" },
            this.createSortButton("hot", LanguageManager.t("hub.sortHot"), true),
            this.createSortButton("recent", LanguageManager.t("hub.sortRecent")),
            this.createSortButton("upvotes", LanguageManager.t("hub.sortUpvotes")),
            this.createSortButton("comments", LanguageManager.t("hub.sortComments"))
        );

        const refreshIcon = el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            className: "refresh-icon"
        },
            el("polyline", { points: "23 4 23 10 17 10" }),
            el("polyline", { points: "1 20 1 14 7 14" }),
            el("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
        );

        this.refreshBtn = el("button", {
            className: "sort-btn refresh-btn",
            onclick: () => this.handleRefresh()
        }, refreshIcon, el("span", {}, LanguageManager.t("hub.refresh")));

        const rightControls = el("div", { className: "hub-right-controls" },
            this.refreshBtn
        );

        this.controlsContainer = el("div", { className: "hub-controls-container" },
            this.sortContainer,
            rightControls
        );

        return {
            controls: this.controlsContainer,
            container: this.postsContainer
        };
    }

    createSortButton(value, label, isActive = false) {
        return el("button", {
            className: `sort-btn${isActive ? " active" : ""}`,
            "data-sort": value,
            onclick: (e) => this.handleSortChange(e, value)
        }, label);
    }

    async handleSortChange(e, value) {
        if (this.currentSort === value) return;

        const buttons = this.sortContainer.querySelectorAll(".sort-btn");
        buttons.forEach(btn => btn.classList.remove("active"));
        e.currentTarget.classList.add("active");

        this.currentSort = value;
        this.postsContainer.innerHTML = "";
        this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.loadingPosts")));
        await this.init();
    }

    async handleRefresh() {
        this.refreshBtn.disabled = true;
        this.postsContainer.innerHTML = "";
        this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.loadingPosts")));
        await this.init();
        this.refreshBtn.disabled = false;
    }

    async init() {
        if (!this.postsContainer) return;

        try {
            if (AuthService.isAuthenticated()) {
                try {
                    const user = await AuthService.getCurrentUser();
                    this.currentUserId = user ? user.id : null;
                } catch (err) {
                    console.error("Error retrieving user for post highlighting:", err);
                }
            }

            const data = await PostsService.getAllPosts(this.currentSort);

            clear(this.postsContainer);

            if (!data.success || data.posts.length === 0) {
                this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.noPostsYet")));
                return;
            }
            
            this.posts = data.posts;
            this.renderPosts();

        } catch (error) {
            console.error("Error loading posts:", error);
            clear(this.postsContainer);
            this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.errorLoading")));
        }
    }

    renderPosts() {
        clear(this.postsContainer);
        if (this.posts.length === 0) {
            this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.noPostsYet")));
            return;
        }
        this.posts.forEach((post) => {
            this.postsContainer.appendChild(this.createPostElement(post));
        });
    }

    prependPost(post) {
        const noPostsText = this.postsContainer.querySelector("p");
        if (noPostsText && noPostsText.textContent === LanguageManager.t("hub.noPostsYet")) {
            clear(this.postsContainer);
        }
        const newPostEl = this.createPostElement(post);
        this.postsContainer.prepend(newPostEl);
        this.posts.unshift(post);
    }

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

        let postActions = el("div", { className: "post-actions-container" });
        if (isSelfPost) {
            const postDate = new Date(post.created_at.endsWith("Z") ? post.created_at : post.created_at + "Z");
            const diffMinutes = (new Date() - postDate) / (1000 * 60);
            const canEdit = diffMinutes <= 5;

            if (canEdit) {
                const editBtn = el("button", { 
                    className: "action-btn edit-btn",
                    onclick: () => this.handleEdit(post)
                }, LanguageManager.t("hub.edit"));
                postActions.appendChild(editBtn);
            }

            const deleteBtn = el("button", {
                className: "action-btn delete-btn",
                onclick: () => this.handleDelete(post.id)
            }, LanguageManager.t("hub.delete"));
            postActions.appendChild(deleteBtn);
        } else if (AuthService.isAuthenticated()) {
            if (post.has_reported) {
                const reportBtn = el("button", {
                    className: "action-btn report-btn",
                    disabled: true
                }, LanguageManager.t("hub.report"));
                postActions.appendChild(reportBtn);
            } else {
                const reportBtn = el("button", {
                    className: "action-btn report-btn",
                    onclick: () => this.handleReport(post.id)
                }, LanguageManager.t("hub.report"));
                postActions.appendChild(reportBtn);
            }
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

    isVideo(url) {
        if (!url) return false;
        const extension = url.split(".").pop().toLowerCase();
        return ["mp4", "webm", "ogg", "mov"].includes(extension);
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

        clear(actionsContainer);
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
        const confirmed = await FlashMessageManager.confirm(LanguageManager.t("hub.deleteConfirm"));
        if (!confirmed) return;
        try {
            await PostsService.deletePost(postId);
            const postEl = document.getElementById(`post-${postId}`);
            if (postEl) {
                postEl.remove();
            }
            this.posts = this.posts.filter(p => p.id !== postId);
            if (this.postsContainer.children.length === 0) {
                this.postsContainer.appendChild(el("p", {}, LanguageManager.t("hub.noPostsYet")));
            }
        } catch (error) {
            FlashMessageManager.show(error.message || "Failed to delete post", "error");
        }
    }

    async handleReport(postId) {
        const existingModal = document.getElementById("report-modal");
        if (existingModal) existingModal.remove();

        const modal = el("div", { id: "report-modal", className: "report-modal-overlay" });
        const modalContent = el("div", { className: "report-modal-content" });
        
        const title = el("h3", { className: "report-modal-title" }, LanguageManager.t("hub.reportPrompt"));
        const textarea = el("textarea", { 
            className: "report-modal-textarea",
            rows: "4", 
            placeholder: LanguageManager.t("hub.reportPrompt")
        });
        
        const btnContainer = el("div", { className: "report-modal-actions" });
        const cancelBtn = el("button", { className: "btn-secondary report-modal-btn", onclick: () => modal.remove() }, LanguageManager.t("hub.cancel"));
        const submitBtn = el("button", { className: "btn-primary report-modal-btn report-modal-submit", onclick: async () => {
            const reason = textarea.value.trim();
            if (!reason) return;
            modal.remove();
            try {
                const data = await PostsService.reportPost(postId, reason);
                if (data.success) {
                    if (data.hidden) {
                        FlashMessageManager.show(LanguageManager.t("hub.reportHidden"), "warning");
                        const postEl = document.getElementById(`post-${postId}`);
                        if (postEl) postEl.remove();
                    } else {
                        FlashMessageManager.show(LanguageManager.t("hub.reportSuccess"), "success");
                        const postObj = this.posts.find(p => p.id === postId);
                        if (postObj) {
                            postObj.has_reported = true;
                            this.renderPosts();
                        }
                    }
                }
            } catch (error) {
                FlashMessageManager.show(error.message || "Failed to report post", "error");
            }
        }}, LanguageManager.t("hub.report"));

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(submitBtn);

        modalContent.appendChild(title);
        modalContent.appendChild(textarea);
        modalContent.appendChild(btnContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        textarea.focus();
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

        clear(list); list.appendChild(el("p", { className: "loading-text" }, LanguageManager.t("hub.loadingPosts")));

        try {
            const data = await PostsService.getComments(postId);
            clear(list);
            
            if (!data.success || data.comments.length === 0) {
                clear(list); list.appendChild(el("p", { className: "no-comments" }, LanguageManager.t("hub.noComments")));
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
            clear(list); list.appendChild(el("p", { className: "error" }, LanguageManager.t("hub.errorLoadingComments") || "Error loading comments"));
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
        const confirmed = await FlashMessageManager.confirm(LanguageManager.t("hub.deleteConfirm"));
        if (!confirmed) return;
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
}
