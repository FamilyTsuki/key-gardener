import HomeView from "../website/views/HomeView.js";
import HubView from "../website/views/HubView.js";
import LoginView from "../website/views/LoginView.js";
import RegisterView from "../website/views/RegisterView.js";
import SaveView from "../website/views/SaveView.js";
import GameView from "../website/views/GameView.js";
import AccountView from "../website/views/AccountView.js";
import FaqView from "../website/views/FaqView.js";
import { AdminView } from "../website/views/AdminView.js";
import { AuthService } from "./services/auth.service.js";
import { FlashMessageManager } from "./utils/FlashMessageManager.js";
import { LanguageManager } from "./utils/LanguageManager.js";

/**
 * Handles application routing and view transitions.
 */
export default class Router {
    /**
     * Initializes the router and sets up event listeners.
     */
    constructor() {
        if ("scrollRestoration" in history) {
            history.scrollRestoration = "manual";
        }
        this.routes = [
            { path: "/", view: HomeView },
            { path: "/hub", view: HubView },
            { path: "/login", view: LoginView },
            { path: "/register", view: RegisterView },
            { path: "/save", view: SaveView, requiresAuth: true },
            { path: "/game", view: GameView, requiresAuth: true },
            { path: "/account", view: AccountView, requiresAuth: true },
            { path: "/faq", view: FaqView, requiresAuth: false },
            { path: "/admin", view: AdminView, requiresAuth: true },
        ];

        window.addEventListener("popstate", () => {
            this.route();
        });

        document.addEventListener("DOMContentLoaded", () => {
            document.body.addEventListener("click", (e) => {
                if (e.target.matches("[data-link]")) {
                    e.preventDefault();
                    this.navigateTo(e.target.href);
                }
            });

            this.route();
        });
    }

    /**
     * Navigates to a specific URL without reloading the page.
     * @param {string} url - The target URL.
     */
    navigateTo(url) {
        history.pushState(null, null, url);
        this.route();
    }

    /**
     * Triggers a fade-to-black screen transition.
     * @returns {Promise<void>} Resolves when the transition animation is complete.
     */
    fadeToBlack() {
        return new Promise((resolve) => {
            const overlay = document.getElementById("page-transition");
            if (!overlay) return resolve();
            overlay.classList.add("fade-in");
            setTimeout(resolve, 4000);
        });
    }

    /**
     * Triggers a fade-from-black screen transition.
     * @returns {Promise<void>} Resolves when the transition animation is complete.
     */
    fadeFromBlack() {
        return new Promise((resolve) => {
            const overlay = document.getElementById("page-transition");
            if (!overlay) return resolve();
            overlay.classList.remove("fade-in");
            setTimeout(resolve, 4000);
        });
    }

    /**
     * Processes the current route, loads the corresponding view and handles transitions.
     * @returns {Promise<void>} Resolves when the view has been rendered.
     */
    async route() {
        let match = this.routes.find(
            (route) => route.path === location.pathname
        );

        if (!match) {
            match = this.routes[0];
        }

        if (match.requiresAuth && !AuthService.isAuthenticated()) {
            FlashMessageManager.show(LanguageManager.t("auth.loginRequired"), "error");
            this.navigateTo("/");
            return;
        }

        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = window.location.origin + window.location.pathname;

        const view = new match.view();
        const appContainer = document.querySelector("#app");

        const oldLinks = document.querySelectorAll("link[data-dynamic-css]");
        const cssFiles = view.getCss();
        const loadStyles = cssFiles.map((cssPath) => {
            return new Promise((resolve, reject) => {
                const linkElement = document.createElement("link");
                linkElement.rel = "stylesheet";
                linkElement.href = cssPath;
                linkElement.setAttribute("data-dynamic-css", "true");
                
                linkElement.onload = () => resolve();
                linkElement.onerror = () => reject(new Error(`Failed to load CSS: ${cssPath}`));
                
                document.head.appendChild(linkElement);
            });
        });

        try {
            await Promise.all(loadStyles);
        } catch (error) {
            console.error("Erreur de chargement CSS:", error);
        }

        if (appContainer) {
            const isEnteringGame = location.pathname === "/game";
            const overlayAlreadyActive = isEnteringGame &&
                document.getElementById("page-transition")?.classList.contains("fade-in") &&
                !this.currentView;

            if (isEnteringGame && !overlayAlreadyActive) {
                await this.fadeToBlack();
            }

            if (this.currentView && typeof this.currentView.destroy === "function") {
                this.currentView.destroy();
            }
            this.currentView = view;

            if (isEnteringGame) {
                document.body.classList.add("in-game");
            } else {
                document.body.classList.remove("in-game");
            }

            appContainer.innerHTML = "";
            const node = await view.render();
            appContainer.appendChild(node);
            oldLinks.forEach((link) => link.remove());
            window.scrollTo(0, 0);

            document.querySelectorAll("#nav-container a[data-link]").forEach(link => {
                if (link.getAttribute("href") === location.pathname) {
                    link.classList.add("active");
                } else {
                    link.classList.remove("active");
                }
            });

            if (typeof view.init === "function") {
                await view.init();
            }
            window.scrollTo(0, 0);

            if (isEnteringGame) {
                await this.fadeFromBlack();
            }
        }
    }
}
