import HomeView from "./views/HomeView.js";
import HubView from "./views/HubView.js";
import LoginView from "./views/LoginView.js";
import RegisterView from "./views/RegisterView.js";

export default class Router {
    constructor() {
        this.routes = [
            { path: "/", view: HomeView },
            { path: "/hub", view: HubView },
            { path: "/login", view: LoginView },
            { path: "/register", view: RegisterView },
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

    navigateTo(url) {
        history.pushState(null, null, url);
        this.route();
    }

    async route() {
        let match = this.routes.find(
            (route) => route.path === location.pathname
        );

        if (!match) {
            match = this.routes[0];
        }

        const view = new match.view();

        document
            .querySelectorAll("link[data-dynamic-css]")
            .forEach((link) => link.remove());

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
            console.error(error);
        }

        const appContainer = document.querySelector("#app");
        if (appContainer) {
            appContainer.innerHTML = "";
            const node = await view.render();
            appContainer.appendChild(node);
            
            if (typeof view.init === "function") {
                await view.init();
            }
        }
    }
}
