import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * Component representing the navigation bar.
 */
export default class Navbar {
    /**
     * Renders the navigation bar in the DOM.
     * Updates links and user information based on authentication status.
     *
     * @returns {Promise<void>}
     */
    static async render() {
        const container = document.getElementById("nav-container");
        if (!container) return;

        let userComponent = el("a", { href: "/login", dataset: { link: true }, className: "login", "aria-label": "Log in to your account" }, LanguageManager.t("nav.login"));
        let saveComponent = null;

        if (AuthService.isAuthenticated()) {
            
            
            this.usernameSpan = el("a", { href: "/account", dataset: { link: true }, id: "nav-username", "aria-label": "View your account profile" });
            this.personalPictureImg = el("img", { 
                className: "nav-user-avatar",
                alt: "Your user avatar",
                onclick: () => {
                    history.pushState(null, null, "/account");
                    window.dispatchEvent(new Event("popstate"));
                }
            });

            userComponent = el("div", { className: "nav-user" },
                this.usernameSpan,
                this.personalPictureImg
            );
            saveComponent = el("a", { href: "/save", dataset: { link: true }, className: "save" }, LanguageManager.t("nav.save"));
            
        }

        const homeLink = el("a", { href: "/", dataset: { link: true } }, LanguageManager.t("nav.home"));
        const hubLink = el("a", { href: "/hub", dataset: { link: true } }, LanguageManager.t("nav.communityHub"));
        const socialLink = AuthService.isAuthenticated() ? el("a", { href: "/social", dataset: { link: true } }, LanguageManager.t("social.title") || "Friends & Duels") : null;
        const sep1 = el("span", { className: "nav-separator" }, "|");
        const sep2 = saveComponent ? el("span", { className: "nav-separator" }, "|") : null;
        this.adminLink = null;
        this.adminSep = null;

        const navPageChildren = [
            homeLink, sep1, hubLink
        ];
        
        if (socialLink) {
            navPageChildren.push(el("span", { className: "nav-separator" }, "|"), socialLink);
        }

        if (saveComponent) {
            navPageChildren.push(sep2, saveComponent);
        }

        this.navPage = el("div", { className: "nav-page", role: "menubar" }, ...navPageChildren);

        const nav = el("nav", { "aria-label": "Main Navigation" },
            this.navPage,
            userComponent
        );

        container.innerHTML = "";
        container.appendChild(nav);

        if (AuthService.isAuthenticated()) {
            await this.updateUserInfo();
        }
    }

    /**
     * Updates the user information displayed in the navbar.
     * Fetches current user data and sets the username and avatar image.
     *
     * @returns {Promise<void>}
     */
    static async updateUserInfo() {
        if (!this.usernameSpan) return;

        try {
            const user = await AuthService.getCurrentUser();
            this.usernameSpan.textContent = user.username;
            const avatar = (user.personalPicture && user.personalPicture !== "null") ? user.personalPicture : "default.webp";
            if (avatar.startsWith('/')) {
                this.personalPictureImg.src = avatar;
            } else {
                this.personalPictureImg.src = "/asset/img/users/" + avatar;
            }

            if (user.is_admin && !this.adminLink) {
                this.adminSep = el("span", { className: "nav-separator" }, "|");
                this.adminLink = el("a", { href: "/admin", dataset: { link: true }, className: "admin admin-link" }, LanguageManager.t("nav.adminPanel") || "Admin Panel");
                this.navPage.appendChild(this.adminSep);
                this.navPage.appendChild(this.adminLink);
            }
        } catch (error) {
            console.error("Navbar failed to load user data:", error);
            if (error.message.includes("Too many requests") || error.message.includes("rate limit")) {
                FlashMessageManager.show(LanguageManager.t("auth.rateLimit"), "error");
                return;
            }
            AuthService.logout();
            Navbar.render();
            history.pushState(null, null, "/");
            window.dispatchEvent(new Event("popstate"));
        }
    }
}

