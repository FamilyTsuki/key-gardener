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
        this.setTitle("Profile");
        this.userId = new URLSearchParams(window.location.search).get("id");
    }

    /**
     * Renders the profile view.
     */
    async render() {
        this.container = el("div", { className: "account-container" });
        
        if (!this.userId) {
            this.container.appendChild(el("h1", { className: "account-title" }, LanguageManager.t("profile.userNotFound")));
            return this.container;
        }

        const loader = el("div", { className: "text-center mt-20" }, LanguageManager.t("common.loading"));
        this.container.appendChild(loader);

        this.loadProfile();

        return this.container;
    }

    /**
     * Loads the profile.
     */
    async loadProfile() {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/friends/profile/${this.userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            this.container.innerHTML = "";

            if (!data.success) {
                this.container.appendChild(el("h1", { className: "account-title" }, data.message || LanguageManager.t("profile.userNotFound")));
                return;
            }

            const { user, stats, friendStatus } = data;
            
            this.setTitle(user.username);
            
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
                removeBtn = el("button", { className: "btn-danger btn-remove-friend", onclick: () => this.showRemoveConfirmModal() }, LanguageManager.t("social.removeFriendBtn"));
            } else if (friendStatus === 'pending') {
                statusContainer.appendChild(el("p", { className: "text-muted profile-pending-status" }, LanguageManager.t("social.pendingStatus")));
            }
            
            content.appendChild(statusContainer);

            const statsContainer = el("div", { className: "stats-container" });
            const rank = StatisticsService.getRankFromWpm(stats.highest_wpm || 0);

            const statsGrid = el("div", { className: "stats-grid" },
                this.createStatItem(LanguageManager.t("profile.rank"), rank.name, rank.class),
                this.createStatItem(LanguageManager.t("account.topWpm"), `${stats.highest_wpm} WPM`),
                this.createStatItem(LanguageManager.t("account.avgWpm"), `${stats.average_wpm} WPM`),
                this.createStatItem(LanguageManager.t("account.accuracy"), `${stats.accuracy}%`),
                this.createStatItem(LanguageManager.t("account.wordsTyped"), stats.total_words_typed),
                this.createStatItem(LanguageManager.t("account.enemiesDefeated"), stats.enemies_defeated),
                this.createStatItem(LanguageManager.t("account.bossesDefeated"), stats.bosses_defeated),
                this.createStatItem(LanguageManager.t("account.playtime"), `${Math.floor(stats.total_playtime_seconds / 60)} min`)
            );

            statsContainer.appendChild(el("h3", { className: "password-title" }, LanguageManager.t("account.globalStats")));
            statsContainer.appendChild(statsGrid);
            
            content.appendChild(statsContainer);
            
            if (removeBtn) {
                content.appendChild(removeBtn);
            }
            
            this.container.appendChild(content);

        } catch (error) {
            console.error("Error loading profile", error);
            this.container.innerHTML = "";
            this.container.appendChild(el("h1", { className: "account-title" }, LanguageManager.t("profile.errorLoading")));
        }
    }

    /**
     * Creates the stat item.
     * @param {any} label - The label.
     * @param {any} value - The value.
     * @param {any} valueClass - The valueClass.
     */
    createStatItem(label, value, valueClass = "") {
        return el("div", { className: "stat-item" },
            el("div", { className: "stat-label" }, label),
            el("div", { className: `stat-value ${valueClass}` }, value)
        );
    }

    /**
     * Shows the remove confirm modal.
     */
    showRemoveConfirmModal() {
        const modalId = "remove-friend-modal";
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const overlay = el("div", { id: modalId, className: "custom-modal-overlay" });
        const content = el("div", { className: "custom-modal-content" });
        
        const title = el("h2", { className: "modal-title-danger" }, LanguageManager.t("social.removeFriendBtn"));
        const msg = el("p", {}, LanguageManager.t("social.removeFriendConfirm"));
        
        const actions = el("div", { className: "custom-modal-actions" });
        
        const cancelBtn = el("button", { className: "btn-secondary custom-modal-btn", onclick: () => overlay.remove() }, LanguageManager.t("social.closeBtn"));
        const confirmBtn = el("button", { className: "btn-danger custom-modal-btn", onclick: async () => {
            overlay.remove();
            await this.removeFriend(this.userId);
        }}, LanguageManager.t("social.removeFriendBtn"));

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        content.appendChild(title);
        content.appendChild(msg);
        content.appendChild(actions);
        overlay.appendChild(content);

        document.body.appendChild(overlay);
    }

    /**
     * Removes the friend.
     * @param {any} userId - The userId.
     */
    async removeFriend(userId) {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/friends/remove/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("social.friendRemoved"), "success");
                history.pushState(null, null, '/social');
                window.dispatchEvent(new Event("popstate"));
            } else {
                FlashMessageManager.show(data.message || LanguageManager.t("social.errorRemovingFriend"), "error");
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("social.errorRemovingFriend"), "error");
        }
    }

    /**
     * Get the css.
     */
    getCss() {
        return ["/asset/css/account.css", "/asset/css/social.css"];
    }
}
