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

        let userComponent = el("a", { href: "/login", dataset: { link: true }, className: "login" }, LanguageManager.t("nav.login"));
        let saveComponent = null;

        if (AuthService.isAuthenticated()) {
            
            
            this.usernameSpan = el("a", { href: "/account", dataset: { link: true }, id: "nav-username" });
            this.personalPictureImg = el("img", { 
                className: "nav-user-avatar",
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
        const sep1 = el("span", { className: "nav-separator" }, "|");
        const sep2 = saveComponent ? el("span", { className: "nav-separator" }, "|") : null;

        const nav = el("nav", {},
            el("div", { className: "nav-page" },
                homeLink,
                sep1,
                hubLink,
                saveComponent ? sep2 : null,
                saveComponent
            ),
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
            if (user.personalPicture.startsWith('/')) {
                this.personalPictureImg.src = user.personalPicture;
            } else {
                this.personalPictureImg.src = "/asset/img/users/" + user.personalPicture;
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

