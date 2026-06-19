import { el, clear } from "../../../core/utils/DOMBuilder.js";
import { PostsService } from "../../../core/services/posts.service.js";
import { FlashMessageManager } from "../../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { WarningPopupManager } from "../../../core/utils/ModerationWarning.js";

export class HubCreatePostComponent {
    constructor(onPostCreated) {
        this.onPostCreated = onPostCreated;
        this.selectedMediaFile = null;
        this.previewContainer = null;
        this.addPostFormContainer = null;
        this.addPostToggleBtn = null;
    }

    render() {
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

        const closeIcon = el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        },
            el("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            el("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
        );

        const closeBtn = el("button", {
            type: "button",
            className: "form-close-btn",
            onclick: () => this.hideForm()
        }, closeIcon);

        this.addPostFormContainer = el("div", { className: "add-post-form-inner glass-panel hidden" },
            closeBtn,
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
                el("div", { className: "form-actions-right" },
                    el("button", {
                        type: "button",
                        className: "action-btn cancel-btn",
                        onclick: () => this.hideForm()
                    }, LanguageManager.t("hub.cancel")),
                    el("button", { onclick: (e) => this.addPost(e), className: "btn-primary" }, LanguageManager.t("hub.postBtn"))
                )
            )
        );

        const plusIcon = el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: "24",
            height: "24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "4",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        },
            el("line", { x1: "12", y1: "4", x2: "12", y2: "20" }),
            el("line", { x1: "4", y1: "12", x2: "20", y2: "12" })
        );

        this.addPostToggleBtn = el("button", {
            className: "btn-primary add-post-toggle-btn",
            title: LanguageManager.t("hub.addPostTitle"),
            onclick: () => this.showForm()
        }, plusIcon);

        return {
            form: this.addPostFormContainer,
            toggleBtn: this.addPostToggleBtn
        };
    }

    showForm() {
        this.addPostFormContainer.classList.remove("hidden");
        this.addPostToggleBtn.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            const textarea = document.getElementById("post-content");
            if (textarea) textarea.focus();
        }, 300);
    }

    hideForm() {
        this.addPostFormContainer.classList.add("hidden");
        this.addPostToggleBtn.classList.remove("hidden");
        const textarea = document.getElementById("post-content");
        if (textarea) textarea.value = "";
        this.clearSelectedMedia();
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
        clear(this.previewContainer);

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
        if (this.previewContainer) clear(this.previewContainer);
        const fileInput = document.getElementById("post-media");
        if (fileInput) fileInput.value = "";
    }

    async addPost(e) {
        const postTextarea = document.getElementById("post-content");
        if (!postTextarea) return;
        const content = postTextarea.value.trim();
        if (!content && !this.selectedMediaFile) return;

        let submitBtn = null;
        let originalText = "";
        if (e && e.currentTarget) {
            submitBtn = e.currentTarget;
            submitBtn.disabled = true;
            originalText = submitBtn.textContent;
            submitBtn.textContent = originalText + "...";
        }

        try {
            const data = await PostsService.createPost(content, this.selectedMediaFile);
            if (data.success && data.post) {
                this.hideForm();
                if (this.onPostCreated) {
                    this.onPostCreated(data.post);
                }
            }
        } catch (error) {
            console.error("Error creating post:", error);
            if (error.isModerated) {
                WarningPopupManager.show(content, error.flaggedType, error.warningCount);
            } else {
                FlashMessageManager.show(error.message, "error");
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }
}
