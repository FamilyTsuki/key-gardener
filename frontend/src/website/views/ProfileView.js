import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import Navbar from "../components/Navbar.js";
import { StatisticsService } from "../../core/services/statistics.service.js";

/**
 * View for displaying a user's profile.
 */
export default class ProfileView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Profile - Keyboard Survivor");
        this.userId = new URLSearchParams(window.location.search).get("id");
    }

    async render() {
        this.container = el("div", { className: "account-container" });
        
        if (!this.userId) {
            this.container.appendChild(el("h1", { className: "account-title" }, "User not found"));
            return this.container;
        }

        const loader = el("div", { className: "text-center mt-20" }, "Loading...");
        this.container.appendChild(loader);

        this.loadProfile();

        return this.container;
    }

    async loadProfile() {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/friends/profile/${this.userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            this.container.innerHTML = "";

            if (!data.success) {
                this.container.appendChild(el("h1", { className: "account-title" }, data.message || "User not found"));
                return;
            }

            const { user, stats, friendStatus } = data;
            
            this.setTitle(`${user.username} - Keyboard Survivor`);
            
            const avatarPath = (user.personal_picture && user.personal_picture !== "null") ? user.personal_picture : "default.webp";
            const avatarSrc = (avatarPath.startsWith('/') || avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) ? avatarPath : `/asset/img/users/${avatarPath}`;
            
            const avatarImg = el("img", { 
                src: avatarSrc,
                className: "account-avatar"
            });

            const content = el("div", { className: "account-content" });
            content.appendChild(avatarImg);
            
            const statusContainer = el("div", { className: "text-center mt-10 profile-status-container" });
            
            statusContainer.appendChild(el("h2", { className: "profile-username" }, user.username));
            
            let removeBtn = null;
            if (friendStatus === 'accepted') {
                removeBtn = el("button", { className: "btn-danger btn-remove-friend", onclick: () => this.showRemoveConfirmModal() }, LanguageManager.t("social.removeFriendBtn") || "Remove Friend");
            } else if (friendStatus === 'pending') {
                statusContainer.appendChild(el("p", { className: "text-muted profile-pending-status" }, LanguageManager.t("social.pendingStatus") || "Pending Request"));
            }
            
            content.appendChild(statusContainer);

            const statsContainer = el("div", { className: "stats-container" });
            const rank = StatisticsService.getRankFromWpm(stats.highest_wpm || 0);

            const statsGrid = el("div", { className: "stats-grid" },
                this.createStatItem("Grade", rank.name, rank.class),
                this.createStatItem("Top WPM", `${stats.highest_wpm} WPM`),
                this.createStatItem("WPM Moyen", `${stats.average_wpm} WPM`),
                this.createStatItem("Précision", `${stats.accuracy}%`),
                this.createStatItem("Mots Tapés", stats.total_words_typed),
                this.createStatItem("Ennemis Vaincus", stats.enemies_defeated),
                this.createStatItem("Boss Vaincus", stats.bosses_defeated),
                this.createStatItem("Temps de Jeu", `${Math.floor(stats.total_playtime_seconds / 60)} min`)
            );

            statsContainer.appendChild(el("h3", { className: "password-title" }, "Statistiques Globales"));
            statsContainer.appendChild(statsGrid);
            
            content.appendChild(statsContainer);
            
            if (removeBtn) {
                content.appendChild(removeBtn);
            }
            
            this.container.appendChild(content);

        } catch (error) {
            console.error("Error loading profile", error);
            this.container.innerHTML = "";
            this.container.appendChild(el("h1", { className: "account-title" }, "Error loading profile"));
        }
    }

    createStatItem(label, value, valueClass = "") {
        return el("div", { className: "stat-item" },
            el("div", { className: "stat-label" }, label),
            el("div", { className: `stat-value ${valueClass}` }, value)
        );
    }

    showRemoveConfirmModal() {
        const modalId = "remove-friend-modal";
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const overlay = el("div", { id: modalId, className: "custom-modal-overlay" });
        const content = el("div", { className: "custom-modal-content" });
        
        const title = el("h2", { className: "modal-title-danger" }, LanguageManager.t("social.removeFriendBtn") || "Remove Friend");
        const msg = el("p", {}, LanguageManager.t("social.removeFriendConfirm") || "Are you sure you want to remove this friend?");
        
        const actions = el("div", { className: "custom-modal-actions" });
        
        const cancelBtn = el("button", { className: "btn-secondary custom-modal-btn", onclick: () => overlay.remove() }, LanguageManager.t("social.closeBtn") || "Cancel");
        const confirmBtn = el("button", { className: "btn-danger custom-modal-btn", onclick: async () => {
            overlay.remove();
            await this.removeFriend(this.userId);
        }}, LanguageManager.t("social.removeFriendBtn") || "Remove");

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        content.appendChild(title);
        content.appendChild(msg);
        content.appendChild(actions);
        overlay.appendChild(content);

        document.body.appendChild(overlay);
    }

    async removeFriend(userId) {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/friends/remove/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("social.friendRemoved") || "Friend removed", "success");
                history.pushState(null, null, '/social');
                window.dispatchEvent(new Event("popstate"));
            } else {
                FlashMessageManager.show(data.message || LanguageManager.t("social.errorRemovingFriend") || "Error", "error");
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("social.errorRemovingFriend") || "Error", "error");
        }
    }

    getCss() {
        return ["/asset/css/account.css", "/asset/css/social.css"];
    }
}
