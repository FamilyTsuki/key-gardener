import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { AuthService } from "../../core/services/auth.service.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { HubPostsComponent } from "../components/hub/HubPostsComponent.js";
import { HubCreatePostComponent } from "../components/hub/HubCreatePostComponent.js";
import { HubSocialComponent } from "../components/hub/HubSocialComponent.js";

/**
 * View for the community hub displaying posts and interactions.
 * Now acts as an orchestrator for modular UI components.
 */
export default class HubView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Community Hub - Keyboard Survivor");
        this.activeTab = window.location.pathname === "/social" ? "social" : "posts";

        this.postsComponent = new HubPostsComponent();
        this.createPostComponent = new HubCreatePostComponent((post) => this.postsComponent.prependPost(post));
        this.socialComponent = new HubSocialComponent();
    }

    async render() {
        const postsElements = this.postsComponent.render();
        const createPostElements = this.createPostComponent.render();
        const socialElements = this.socialComponent.render();

        let addPostSection = null;
        let addPostToggle = null;
        if (AuthService.isAuthenticated()) {
            addPostSection = createPostElements.form;
            addPostToggle = createPostElements.toggleBtn;
        }

        this.postsTabContent = el("div", { className: "tab-content" },
            postsElements.controls,
            addPostSection,
            addPostToggle,
            postsElements.container
        );

        this.socialTabContent = socialElements;

        const feedTabBtn = el("button", {
            className: "hub-tab-btn active",
            dataset: { tab: "posts" },
            onclick: () => this.switchTab("posts")
        }, LanguageManager.t("hub.postsTab"));

        const friendsTabBtn = AuthService.isAuthenticated() ? el("button", {
            className: "hub-tab-btn",
            dataset: { tab: "social" },
            onclick: () => this.switchTab("social")
        }, LanguageManager.t("hub.socialTab")) : null;

        const tabsBar = friendsTabBtn ? el("div", { className: "hub-tabs-bar" }, feedTabBtn, friendsTabBtn) : null;

        const isFirstVisit = !localStorage.getItem("hub_visited");
        if (isFirstVisit) {
            localStorage.setItem("hub_visited", "true");
        }

        this.container = el("div", { className: "community-hub-container" },
            el("h1", {}, LanguageManager.t("hub.title")),
            isFirstVisit ? el("p", { className: "welcome-text" }, LanguageManager.t("hub.welcome")) : null,
            !AuthService.isAuthenticated()
                ? el("div", { className: "login-prompt" },
                    el("p", {}, LanguageManager.t("hub.loginPrompt")),
                    el("a", { href: "/login", "data-link": "true" }, LanguageManager.t("hub.login"))
                  ) : null,
            tabsBar,
            this.postsTabContent,
            this.socialTabContent
        );

        if (this.activeTab === "social") {
            this.switchTab("social");
        }

        return this.container;
    }

    async init() {
        if (this.activeTab === "social") {
            await this.socialComponent.init();
        } else {
            await this.postsComponent.init();
        }
    }

    switchTab(tab) {
        if (this.activeTab === tab && this.container.querySelector(`.hub-tab-btn[data-tab="${tab}"]`).classList.contains("active")) return;
        this.activeTab = tab;

        const buttons = this.container.querySelectorAll(".hub-tab-btn");
        buttons.forEach(btn => btn.classList.remove("active"));
        const activeBtn = this.container.querySelector(`.hub-tab-btn[data-tab="${tab}"]`);
        if (activeBtn) activeBtn.classList.add("active");

        if (tab === "posts") {
            this.postsTabContent.classList.remove("hidden");
            this.socialTabContent.classList.add("hidden");
            
            const formInner = this.postsTabContent.querySelector(".add-post-form-inner");
            if (this.createPostComponent.addPostToggleBtn && formInner && formInner.classList.contains("hidden")) {
                this.createPostComponent.addPostToggleBtn.classList.remove("hidden");
            }
            if (this.postsComponent.postsContainer.querySelector("p")?.textContent === LanguageManager.t("hub.loadingPosts")) {
                this.postsComponent.init();
            }
        } else {
            this.postsTabContent.classList.add("hidden");
            this.socialTabContent.classList.remove("hidden");
            
            if (this.createPostComponent.addPostToggleBtn) {
                this.createPostComponent.addPostToggleBtn.classList.add("hidden");
            }
            this.socialComponent.init();
        }
    }

    getCss() {
        return ["/asset/css/hub.css", "/asset/css/social.css"];
    }
}
