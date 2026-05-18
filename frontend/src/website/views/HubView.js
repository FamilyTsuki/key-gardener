import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { AuthService } from "../../core/services/auth.service.js";
import { PostsService } from "../../core/services/posts.service.js";

export default class HubView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Community Hub - Keyboard Survivor");
        this.selectedMediaFile = null;
    }

    async render() {
        this.postsContainer = el("div", { id: "posts-container" },
            el("p", {}, "Loading posts...")
        );

        return el("div", { className: "community-hub-container" },
            el("h1", {}, "Community Hub"),
            el("p", { className: "welcome-text" }, "Welcome to the community! Share your progress and interact with other players."),
            AuthService.isAuthenticated()
                ? this.displayAddPostForm()
                : el("div", { className: "login-prompt" },
                    el("p", {}, "You must be logged in to share your progress."),
                    el("a", { href: "/login", "data-link": "true" }, "Login")
                  ),
            this.postsContainer
        );
    }

    displayAddPostForm() {
        const fileInput = el("input", {
            type: "file",
            id: "post-media",
            accept: "image/*,video/*",
            className: "hidden",
            onchange: (e) => this.handleMediaSelection(e)
        });

        this.previewContainer = el("div", { id: "media-preview" });

        return el("div", { className: "add-post-form" },
            el("h3", {}, "Add a Post"),
            el("textarea", { id: "post-content", placeholder: "Share your progress..." }),
            fileInput,
            this.previewContainer,
            el("div", { className: "form-actions" },
                el("button", {
                    type: "button",
                    className: "add-media-btn",
                    onclick: () => fileInput.click()
                }, "+ Add Image/Video"),
                el("button", { onclick: () => this.addPost(), className: "post-btn" }, "Post")
            )
        );
    }

    handleMediaSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.selectedMediaFile = file;
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

    async addPost() {
        const postTextarea = document.getElementById("post-content");
        if (!postTextarea) return;
        const content = postTextarea.value.trim();
        if (!content && !this.selectedMediaFile) return;

        try {
            const data = await PostsService.createPost(content, this.selectedMediaFile);
            if (data.success) {
                postTextarea.value = "";
                this.clearSelectedMedia();
                await this.init();
            }
        } catch (error) {
            console.error("Error creating post:", error);
        }
    }

    async init() {
        if (!this.postsContainer) return;

        try {
            const data = await PostsService.getAllPosts();

            this.postsContainer.innerHTML = "";

            if (!data.success || data.posts.length === 0) {
                this.postsContainer.appendChild(el("p", {}, "No posts yet. Be the first!"));
                return;
            }

            data.posts.forEach((post) => {
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

                this.postsContainer.appendChild(
                    el("div", { className: "hub-post" },
                        el("strong", {}, post.username + ": "),
                        el("p", { className: "post-content" }, post.content),
                        mediaElement
                    )
                );
            });

        } catch (error) {
            console.error("Error loading posts:", error);
            this.postsContainer.innerHTML = "";
            this.postsContainer.appendChild(el("p", {}, "Error loading community messages."));
        }
    }

    isVideo(url) {
        if (!url) return false;
        const extension = url.split(".").pop().toLowerCase();
        return ["mp4", "webm", "ogg", "mov"].includes(extension);
    }

    getCss() {
        return ["/asset/css/hub.css"];
    }
}

