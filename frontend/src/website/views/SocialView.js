import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import SocketService from "../../core/services/SocketService.js?v=1";
import AbstractView from "../../core/views/AbstractView.js";

export class SocialView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle(`${LanguageManager.t("social.title")} - Keyboard Survivor`);
        this.container = el("div", { className: "social-view-container fade-in" });
        this.friends = [];
        this.searchResults = [];
    }

    async render() {
        this.container.innerHTML = "";
        
        const title = el("h1", { className: "social-title text-center mt-20" }, LanguageManager.t("social.title"));
        
        const addFriendSection = el("div", { className: "add-friend-section p-20 card-bg" },
            el("h3", {}, LanguageManager.t("social.addFriendTitle")),
            el("div", { className: "flex-row-gap10 mt-10" },
                el("input", { 
                    type: "text", 
                    id: "friend-search-input", 
                    placeholder: LanguageManager.t("social.usernamePlaceholder"), 
                    className: "form-input w-full",
                    oninput: (e) => this.handleSearch(e.target.value)
                })
            ),
            el("div", { id: "search-results-container", className: "search-results mt-10" })
        );

        this.friendsListContainer = el("div", { className: "friends-list-section p-20 card-bg mt-20" });
        
        this.container.appendChild(title);
        this.container.appendChild(addFriendSection);
        this.container.appendChild(this.friendsListContainer);
        
        await this.loadFriends();
        
        return this.container;
    }

    async handleSearch(query) {
        const container = document.getElementById("search-results-container");
        if (!container) return;

        if (query.trim().length < 2) {
            container.innerHTML = "";
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.searchResults = data.users;
                this.renderSearchResults();
            }
        } catch (e) {
            console.error("Error searching users", e);
        }
    }

    renderSearchResults() {
        const container = document.getElementById("search-results-container");
        if (!container) return;
        
        container.innerHTML = "";
        if (this.searchResults.length === 0) return;

        this.searchResults.forEach(user => {
            const avatar = (user.personal_picture && user.personal_picture !== "null") ? user.personal_picture : "default.webp";
            const avatarSrc = (avatar.startsWith('/') || avatar.startsWith('http://') || avatar.startsWith('https://')) ? avatar : `/asset/img/users/${avatar}`;
            const card = el("div", { className: "search-result-card flex-row-gap10 p-10 mt-10 card-bg-light" },
                el("div", { className: "flex-row-gap10" },
                    el("img", { src: avatarSrc, className: "avatar-small" }),
                    el("span", { className: "friend-username" }, user.username)
                ),
                el("button", { className: "btn-primary btn-small", onclick: (e) => this.addFriend(user.username, e.target) }, LanguageManager.t("social.addBtn"))
            );
            container.appendChild(card);
        });
    }

    async loadFriends() {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/friends/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.friends = data.friends;
                this.renderFriendsList();
            }
        } catch (e) {
            console.error("Error loading friends", e);
        }
    }

    async addFriend(username, btnElement) {
        if (btnElement) {
            btnElement.disabled = true;
            btnElement.textContent = LanguageManager.t("social.sentBtn");
        }
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/friends/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUsername: username })
            });
            const data = await res.json();
            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("social.friendRequestSent"), "success");
                const input = document.getElementById("friend-search-input");
                if(input) input.value = "";
                this.searchResults = [];
                this.renderSearchResults();
                await this.loadFriends();
            } else {
                FlashMessageManager.show(data.message, "error");
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("social.errorSendingRequest"), "error");
        }
    }

    async acceptFriend(friendId) {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId })
            });
            const data = await res.json();
            if (data.success) {
                FlashMessageManager.show(LanguageManager.t("social.friendRequestAccepted"), "success");
                await this.loadFriends();
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("social.errorAcceptingRequest"), "error");
        }
    }

    renderFriendsList() {
        this.friendsListContainer.innerHTML = "";
        
        if (this.friends.length === 0) {
            this.friendsListContainer.appendChild(el("p", { className: "text-muted text-center" }, LanguageManager.t("social.noFriendsYet")));
            return;
        }

        const pendingList = el("div", { className: "pending-friends mb-20" });
        const acceptedList = el("div", { className: "accepted-friends" });

        this.friends.forEach(f => {
            const avatar = (f.personal_picture && f.personal_picture !== "null") ? f.personal_picture : "default.webp";
            const avatarSrc = (avatar.startsWith('/') || avatar.startsWith('http://') || avatar.startsWith('https://')) ? avatar : `/asset/img/users/${avatar}`;
            const userInfo = el("div", { 
                className: "flex-row-gap10 friend-user-info", 
                onclick: () => this.showProfile(f)
            },
                el("img", { src: avatarSrc, className: "avatar-small" }),
                el("span", { className: "friend-username" }, f.username)
            );

            const actions = el("div", { className: "flex-row-gap10" });
            const card = el("div", { className: "friend-card flex-row-gap10 p-10 mt-10 card-bg-light" }, userInfo, actions);

            if (f.status === 'pending') {
                if (f.direction === 'received') {
                    actions.appendChild(el("button", { className: "btn-primary btn-small", onclick: () => this.acceptFriend(f.user_id) }, LanguageManager.t("social.acceptBtn")));
                } else {
                    actions.appendChild(el("span", { className: "text-muted" }, LanguageManager.t("social.pendingStatus")));
                }
                pendingList.appendChild(card);
            } else {
                const hasDuelInvite = window.pendingDuelInvitations && window.pendingDuelInvitations.some(inv => inv.fromId === f.user_id);
                if (hasDuelInvite) {
                    const acceptBtn = el("button", { 
                        className: "btn-primary btn-small", 
                        onclick: () => this.acceptDuel(f.user_id) 
                    }, LanguageManager.t("social.acceptDuel"));
                    const declineBtn = el("button", { 
                        className: "btn-danger btn-small", 
                        onclick: () => this.declineDuel(f.user_id) 
                    }, LanguageManager.t("social.declineDuel"));
                    actions.appendChild(acceptBtn);
                    actions.appendChild(declineBtn);
                } else {
                    actions.appendChild(el("button", { className: "btn-danger btn-small", onclick: (e) => this.inviteDuel(f.user_id, e.target) }, LanguageManager.t("social.duelBtn")));
                }
                acceptedList.appendChild(card);
            }
        });

        if (pendingList.children.length > 0) {
            this.friendsListContainer.appendChild(el("h3", {}, LanguageManager.t("social.pendingRequests")));
            this.friendsListContainer.appendChild(pendingList);
        }

        if (acceptedList.children.length > 0) {
            this.friendsListContainer.appendChild(el("h3", {}, LanguageManager.t("social.myFriends")));
            this.friendsListContainer.appendChild(acceptedList);
        }
    }

    inviteDuel(targetUserId, btnElement) {
        if (btnElement) {
            btnElement.disabled = true;
            btnElement.textContent = LanguageManager.t("social.waitingBtn");
            // Re-enable after a timeout if no response
            setTimeout(() => {
                if(btnElement) {
                    btnElement.disabled = false;
                    btnElement.textContent = LanguageManager.t("social.duelBtn");
                }
            }, 10000);
        }
        FlashMessageManager.show(LanguageManager.t("social.duelInvitationSent"), "success");
        SocketService.emit('invite_duel', { targetUserId });
    }

    acceptDuel(fromId) {
        window.pendingDuelInvitations = window.pendingDuelInvitations.filter(inv => inv.fromId !== fromId);
        SocketService.emit('accept_duel', { fromId });
        this.loadFriends();
    }

    declineDuel(fromId) {
        window.pendingDuelInvitations = window.pendingDuelInvitations.filter(inv => inv.fromId !== fromId);
        SocketService.emit('decline_duel', { fromId });
        this.loadFriends();
    }

    showProfile(friendData) {
        history.pushState(null, null, `/profile?id=${friendData.user_id}`);
        window.dispatchEvent(new Event("popstate"));
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
                FlashMessageManager.show(LanguageManager.t("social.friendRemoved"), "success");
                await this.loadFriends();
            } else {
                FlashMessageManager.show(data.message || LanguageManager.t("social.errorRemovingFriend"), "error");
            }
        } catch (e) {
            FlashMessageManager.show(LanguageManager.t("social.errorRemovingFriend"), "error");
        }
    }

    async cleanup() {
    }

    getCss() {
        return ["/asset/css/social.css"];
    }
}
