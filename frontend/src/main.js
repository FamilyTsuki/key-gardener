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
import SocketService from "./core/services/SocketService.js?v=1";
import { FlashMessageManager } from "./core/utils/FlashMessageManager.js";
import { AuthService } from "./core/services/auth.service.js";
import { LanguageManager } from "./core/utils/LanguageManager.js";

console.log("Website UI initialized");

(async () => {
    await AuthService.init();

    Navbar.render();
    EasterEgg.init();
    SocketService.connect();

    window.pendingDuelInvitations = [];

    SocketService.on('duel_invitation', (data) => {
        const exists = window.pendingDuelInvitations.some(inv => inv.fromId === data.fromId);
        if (!exists) {
            window.pendingDuelInvitations.push(data);
        }
        FlashMessageManager.show(LanguageManager.t("social.duelNotification", { user: data.fromUsername }) || `${data.fromUsername} vous a défié en duel ! Allez sur l'onglet Social pour l'affronter !`, "warning");
        if (window.appRouter && window.appRouter.currentView && typeof window.appRouter.currentView.loadFriends === 'function') {
            window.appRouter.currentView.loadFriends();
        }
    });

    SocketService.on('duel_declined', (data) => {
        FlashMessageManager.show(LanguageManager.t("social.duelDeclinedNotification", { user: data.fromUsername }) || `${data.fromUsername} a décliné votre invitation de duel.`, "error");
    });

    SocketService.on('duel_started', (data) => {
        window.pendingDuelInvitations = window.pendingDuelInvitations.filter(inv => inv.fromId !== data.player1.id && inv.fromId !== data.player2.id);
        window.currentDuelData = data;
        history.pushState(null, null, "/game?mode=duel");
        window.dispatchEvent(new Event("popstate"));
    });

    const appRouter = new Router();
    window.appRouter = appRouter;
})();
