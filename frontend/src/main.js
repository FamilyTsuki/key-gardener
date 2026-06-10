/**
 * Main application entry point.
 * Initializes the UI and sets up the router.
 */
const originalFetch = window.fetch;
window.activeRequests = 0;

window.incrementLoader = function() {
    window.activeRequests++;
    const miniLoader = document.getElementById("mini-loader");
    if (miniLoader) miniLoader.classList.remove("hidden");
};

window.decrementLoader = function() {
    window.activeRequests--;
    if (window.activeRequests <= 0) {
        window.activeRequests = 0;
        const miniLoader = document.getElementById("mini-loader");
        if (miniLoader) miniLoader.classList.add("hidden");
    }
};

window.fetch = async function (...args) {
    window.incrementLoader();
    try {
        const response = await originalFetch.apply(this, args);
        return response;
    } finally {
        window.decrementLoader();
    }
};
import Router from "./core/Router.js";
import Navbar from "./website/components/Navbar.js";
import { EasterEgg } from "./website/components/EasterEgg.js";

console.log("Website UI initialized");

// Initialize theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
    document.body.setAttribute("data-theme", "light");
} else if (savedTheme === "dark") {
    document.body.removeAttribute("data-theme");
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.body.setAttribute("data-theme", "light");
}

Navbar.render();
EasterEgg.init();

const appRouter = new Router();
