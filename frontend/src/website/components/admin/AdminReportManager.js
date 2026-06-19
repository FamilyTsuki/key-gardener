import { el, clear } from '../../../core/utils/DOMBuilder.js';
import { LanguageManager } from '../../../core/utils/LanguageManager.js';
import { FlashMessageManager } from '../../../core/utils/FlashMessageManager.js';

export class AdminReportManager {
    constructor(sidebarContainer, mainContainer) {
        this.sidebarContainer = sidebarContainer;
        this.mainContainer = mainContainer;
        this.reportedPosts = [];
        this.activeReportedPostId = null;
    }

    async init() {
        await this.loadReportedPosts();
    }

    async loadReportedPosts() {
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch("/api/posts/admin/reported", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();

            if (!data.success) {
                this.showError(data.message || LanguageManager.t("admin.errorLoad"));
                return;
            }

            this.reportedPosts = data.posts;
            this.renderSidebar();
            this.renderMainContent();
        } catch (e) {
            console.error(e);
            this.showError(LanguageManager.t("admin.errorServer"));
        }
    }

    showError(message) {
        clear(this.mainContainer);
        this.mainContainer.appendChild(el("div", { className: "admin-error-msg" }, message));
    }

    renderSidebar() {
        clear(this.sidebarContainer);

        const listContainer = el("div", { id: "reports-list", className: "levels-list" });

        this.sidebarContainer.appendChild(
            el("div", { className: "reports-sidebar-container" },
                el("h2", { className: "sidebar-title" }, LanguageManager.t("admin.reportedPosts")),
                listContainer
            )
        );

        this.populateReportsList(listContainer);
    }

    populateReportsList(listContainer) {
        if (this.reportedPosts.length === 0) {
            listContainer.appendChild(el("p", { className: "admin-no-reports" }, LanguageManager.t("admin.noReportedPosts")));
            return;
        }

        if (this.activeReportedPostId === null || !this.reportedPosts.find(p => p.id === this.activeReportedPostId)) {
            this.activeReportedPostId = this.reportedPosts[0].id;
        }

        this.reportedPosts.forEach(post => {
            const btn = el("button", {
                className: `level-item-btn${post.id === this.activeReportedPostId ? " active" : ""}`,
                onclick: () => {
                    this.activeReportedPostId = post.id;
                    this.renderSidebar();
                    this.renderMainContent();
                }
            },
                el("span", { className: "level-btn-number" }, `${LanguageManager.t("admin.postLabel")} #${post.id}`),
                el("span", { className: "level-btn-type" }, post.username)
            );

            listContainer.appendChild(btn);
        });
    }

    renderMainContent() {
        clear(this.mainContainer);

        if (this.reportedPosts.length === 0) {
            this.mainContainer.appendChild(el("div", { className: "admin-welcome-screen" },
                el("h3", {}, LanguageManager.t("admin.noReportedPosts"))
            ));
            return;
        }

        const activePost = this.reportedPosts.find(p => p.id === this.activeReportedPostId);
        if (activePost) {
            this.renderReportDetail(activePost);
        }
    }

    renderReportDetail(post) {
        const reportsList = el("ul", { className: "reports-list" });
        if (post.reports && Array.isArray(post.reports)) {
            post.reports.forEach(r => {
                reportsList.appendChild(el("li", { className: "report-item admin-report-item" },
                    el("strong", {}, `User ${r.user_id}: `),
                    el("span", {}, r.reason)
                ));
            });
        }

        const keepBtn = el("button", { className: "btn-primary", onclick: () => this.handleKeepPost(post.id) }, LanguageManager.t("admin.keepPost"));
        const destroyBtn = el("button", { className: "btn-delete-level", onclick: () => this.handleDestroyPost(post.id) }, LanguageManager.t("admin.destroyPost"));

        this.mainContainer.appendChild(
            el("div", { className: "admin-editor-card" },
                el("h3", { className: "report-detail-title" }, LanguageManager.t("admin.postBy").replace("{id}", post.id).replace("{username}", post.username)),
                el("div", { className: "post-content-preview" },
                    post.content ? el("p", {}, post.content) : null,
                    post.image_url ? el("img", { src: post.image_url, className: "post-image-preview" }) : null
                ),
                el("h4", {}, `${LanguageManager.t("admin.reason")} (${LanguageManager.t("admin.reportsCount").replace("{count}", post.reports ? post.reports.length : 0)})`),
                reportsList,
                el("div", { className: "report-action-buttons" }, keepBtn, destroyBtn)
            )
        );
    }

    async handleKeepPost(postId) {
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(`/api/posts/admin/${postId}/approve`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("admin.postKept"), "success");
                await this.loadReportedPosts();
            } else {
                FlashMessageManager.show(data.message, "error");
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("admin.errorApprovePost"), "error");
        }
    }

    async handleDestroyPost(postId) {
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(`/api/posts/${postId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("admin.postDestroyed"), "success");
                await this.loadReportedPosts();
            } else {
                FlashMessageManager.show(data.message, "error");
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("admin.errorDeletePost"), "error");
        }
    }
}
