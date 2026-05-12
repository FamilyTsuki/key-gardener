import { AuthService } from "../services/auth.service.js";
import { el } from "../utils/DOMBuilder.js";
import { FlashMessageManager } from "../utils/FlashMessageManager.js";

export default class Navbar {
    static async render() {
        const container = document.getElementById("nav-container");
        if (!container) return;

        let userComponent = el("a", { href: "/login", dataset: { link: true }, className: "login" }, "Login");
        let saveComponent = null;

        if (AuthService.isAuthenticated()) {
            const logoutBtn = el("button", { 
                id: "logout-btn", 
                className: "nav-logout", 
                onclick: () => {
                    AuthService.logout();
                    Navbar.render();
                    history.pushState(null, null, "/");
                    window.dispatchEvent(new Event("popstate"));
                    FlashMessageManager.show("You have been logged out.", "success");
                } 
            }, "Logout");
            
            this.usernameSpan = el("span", { id: "nav-username" });

            userComponent = el("div", { className: "nav-user" },
                this.usernameSpan,
                logoutBtn
            );
            saveComponent = el("a", { href: "/save", dataset: { link: true }, className: "save" }, "| Save");
            
        }

        const nav = el("nav", {},
            el("div", { className: "nav-page" },
                el("a", { href: "/", dataset: { link: true } }, "Home"),
                el("a", { href: "/hub", dataset: { link: true } }, "| Community Hub"),
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

    static async updateUserInfo() {
        if (!this.usernameSpan) return;

        try {
            const user = await AuthService.getCurrentUser();
            this.usernameSpan.textContent = user.username;
        } catch (error) {
            console.error("Navbar failed to load user data:", error);
            AuthService.logout();
            Navbar.render();
            history.pushState(null, null, "/");
            window.dispatchEvent(new Event("popstate"));
        }
    }
}
