import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import Navbar from "../components/Navbar.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { StatisticsService } from "../../core/services/statistics.service.js";
import { createCustomSelect } from "../components/CustomSelect.js";
import { ValidationUtils } from "../../core/utils/ValidationUtils.js";

/**
 * View for displaying and managing user account information.
 */
export default class AccountView extends AbstractView {
    /**
     * Creates an instance of AccountView.
     *
     * @param {any} params - The params.
     */
    constructor(params) {
        super(params);
        this.setTitle(LanguageManager.t("nav.account"));
    }

    /**
     * Renders the account view content.
     *
     * @returns {Promise<HTMLElement>} The account view container element.
     */
    async render() {
        this.usernameSpan = el("p", { className: "account-info name" });
        this.usermail = el("p", { className: "account-info" });
        this.fileInput = el("input", { 
            type: "file", 
            accept: "image/*", 
            className: "hidden",
            onchange: async (e) => {
                if (e.target.files && e.target.files[0]) {
                    try {
                        const file = e.target.files[0];
                        await AuthService.uploadAvatar(file);
                        await this.updateUserInfo();
                        await Navbar.updateUserInfo();
                    } catch (error) {
                        console.error("Upload failed:", error);
                        FlashMessageManager.show(error.message || LanguageManager.t("account.uploadFailed"), "error");
                    }
                }
            }
        });

        this.editUsername = el("button", { className: "edit" }, "✐");
        this.editUsermail = el("button", { className: "edit" }, "✐");
        this.editUsername.onclick = () => this.editUsernameClick();
        this.editUsermail.onclick = () => this.editUsermailClick();

        this.personalPictureImg = el("img", { 
            className: "account-avatar clickable-avatar",
            onclick: () => this.fileInput.click()
        });
        
        const logoutTxt = el("button", { 
                className: "btn-logout", 
                onclick: async () => {
                    await AuthService.logout();
                    await Navbar.render();
                    history.pushState(null, null, "/");
                    window.dispatchEvent(new Event("popstate"));
                } 
            }, LanguageManager.t("account.logout"));
        const passwordContainer = el("div", { className: "password-container" },
            el("h3", { className: "password-title" }, LanguageManager.t("account.changePasswordTitle")),
            el("input", { maxLength: 100,  type: "password", id: "current-password", placeholder: LanguageManager.t("account.currentPasswordPlaceholder"), className: "form-input password-input"  }),
            el("input", { maxLength: 100,  type: "password", id: "new-password", placeholder: LanguageManager.t("account.newPasswordPlaceholder"), className: "form-input password-input"  }),
            el("button", { 
                className: "btn-primary", 
                onclick: async () => {
                    const currentPwd = document.getElementById("current-password").value;
                    const newPwd = document.getElementById("new-password").value;
                    if (!currentPwd || !newPwd) {
                        FlashMessageManager.show(LanguageManager.t("account.passwordFillBoth"), "error");
                        return;
                    }
                    if (!ValidationUtils.validatePassword(newPwd)) {
                        FlashMessageManager.show(LanguageManager.t("account.passwordRequirements"), "error");
                        return;
                    }
                    try {
                        await AuthService.changePassword(currentPwd, newPwd);
                        FlashMessageManager.show(LanguageManager.t("account.passwordSuccess"), "success");
                        document.getElementById("current-password").value = "";
                        document.getElementById("new-password").value = "";
                    } catch (error) {
                        FlashMessageManager.show(error.message || LanguageManager.t("account.passwordFailed"), "error");
                    }
                }
            }, LanguageManager.t("account.updatePasswordBtn"))
        );
        const currentLang = LanguageManager.getLanguage();
        this.langSelect = createCustomSelect([
            { value: "en", label: LanguageManager.t("account.english") },
            { value: "fr", label: LanguageManager.t("account.french") }
        ], currentLang, (newValue) => {
            LanguageManager.setLanguage(newValue);
        }, "lang-select");

        const langContainer = el("div", { className: "password-container" },
            el("h3", { className: "password-title" }, LanguageManager.t("account.languageTitle")),
            this.langSelect
        );

        const savedTheme = localStorage.getItem("theme");
        const currentTheme = savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? "light" : "dark");
        const isLightMode = currentTheme === "light";

        const themeSwitchInput = el("input", {
            type: "checkbox",
            className: "theme-switch-checkbox",
            id: "theme-toggle",
            checked: isLightMode,
            onchange: (e) => {
                const theme = e.target.checked ? "light" : "dark";
                localStorage.setItem("theme", theme);
                if (theme === "light") {
                    document.body.setAttribute("data-theme", "light");
                } else {
                    document.body.removeAttribute("data-theme");
                }
            }
        });

        const themeSwitchSlider = el("span", { className: "theme-switch-slider" });
        const themeSwitchLabel = el("label", { className: "theme-switch-label", htmlFor: "theme-toggle" },
            themeSwitchInput,
            themeSwitchSlider
        );

        const themeContainer = el("div", { className: "password-container" },
            el("h3", { className: "password-title" }, LanguageManager.t("account.themeTitle")),
            themeSwitchLabel
        );

        const arrowSpan = el("span", { className: "danger-zone-arrow" }, "▼");
        const dangerZoneHeader = el("div", { className: "danger-zone-header" },
            el("h3", {}, LanguageManager.t("account.deleteAccountTitle")),
            arrowSpan
        );
        const dangerZoneContent = el("div", { className: "danger-zone-content" },
            el("p", {}, LanguageManager.t("account.deleteAccountConfirm")),
            el("div", { className: "danger-zone-buttons" },
                el("button", { 
                    className: "btn-primary-small", 
                    onclick: async () => {
                        try {
                            await AuthService.exportData();
                            FlashMessageManager.show(LanguageManager.t("account.exportDataSuccess"), "success");
                        } catch (error) {
                            FlashMessageManager.show(LanguageManager.t("account.exportDataFailed"), "error");
                        }
                    } 
                }, LanguageManager.t("account.exportDataBtn")),
                el("button", { className: "btn-danger-small", onclick: () => this.showDeleteModal() }, LanguageManager.t("account.deleteAccountBtn"))
            )
        );

        dangerZoneHeader.onclick = () => {
            arrowSpan.classList.toggle("open");
            dangerZoneContent.classList.toggle("open");
        };

        const dangerZoneContainer = el("div", { className: "danger-zone" },
            dangerZoneHeader,
            dangerZoneContent
        );
            
        const container = el("div", { className: "account-container" },
            el("h1", { className: "account-title" }, LanguageManager.t("account.title")),

            el("div", { className: "account-content" },
                this.personalPictureImg,
                this.fileInput,
                el("div", { className: "container" },
                    this.usernameSpan,
                    this.editUsername,
                ),
                el("div", { className: "container" },
                    this.usermail,
                    this.editUsermail,
                ),
                (this.statsContainer = el("div", { className: "stats-container hidden" })),
                passwordContainer,
                langContainer,
                themeContainer,
                logoutTxt,
                dangerZoneContainer
            )
        );
        
        if (AuthService.isAuthenticated()) {
            await this.updateUserInfo();
        }
        return container;
    }

    /**
     * Fetches and updates the user information on the screen.
     *
     * @returns {Promise<void>}
     */
    async updateUserInfo() {
        if (!this.usernameSpan || !this.usermail) return;

        try {
            const user = await AuthService.getCurrentUser();
            this.usernameSpan.textContent = user.username;
            this.usermail.textContent = user.email;
            const avatar = (user.personalPicture && user.personalPicture !== "null") ? user.personalPicture : "default.webp";
            if (avatar.startsWith('/') || avatar.startsWith('http://') || avatar.startsWith('https://')) {
                this.personalPictureImg.src = avatar;
            } else {
                this.personalPictureImg.src = "/asset/img/users/" + avatar;
            }
            
            this.renderStats();
            
        } catch (error) {
            console.error("AccountView failed to load user data", error);
            await AuthService.logout();
            await Navbar.render();
            history.pushState(null, null, "/");
            window.dispatchEvent(new Event("popstate"));
        }
    }

    /**
     * Fetches and renders user statistics.
     */
    async renderStats() {
        try {
            const stats = await StatisticsService.getStats();
            if (this.statsContainer) {
                this.statsContainer.innerHTML = "";
                this.statsContainer.classList.remove("hidden");

                const rank = StatisticsService.getRankFromWpm(stats.highest_wpm || 0);

                const statsGrid = el("div", { className: "stats-grid" },
                    this.createStatItem(LanguageManager.t("account.currentRank"), rank.name, rank.class),
                    this.createStatItem(LanguageManager.t("account.topWpm"), `${stats.highest_wpm} WPM`),
                    this.createStatItem(LanguageManager.t("account.avgWpm"), `${stats.average_wpm} WPM`),
                    this.createStatItem(LanguageManager.t("account.accuracy"), `${stats.accuracy}%`),
                    this.createStatItem(LanguageManager.t("account.wordsTyped"), stats.total_words_typed),
                    this.createStatItem(LanguageManager.t("account.enemiesDefeated"), stats.enemies_defeated),
                    this.createStatItem(LanguageManager.t("account.bossesDefeated"), stats.bosses_defeated),
                    this.createStatItem(LanguageManager.t("account.playtime"), `${Math.floor(stats.total_playtime_seconds / 60)} min`)
                );

                this.statsContainer.appendChild(el("h3", { className: "password-title" }, LanguageManager.t("account.globalStats")));
                this.statsContainer.appendChild(statsGrid);
            }
        } catch (error) {
            console.warn("Could not load stats:", error);
        }
    }

    /**
     * Creates a DOM element for a single stat item.
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
     * Handles the click event to edit the username.
     * Replaces the username text with an input field.
     */
    editUsernameClick() {
        const input = el("input", { maxLength: 50,  type: "text", value: this.usernameSpan.textContent, className: "form-input name account-info-input"  });
        this.usernameSpan.replaceWith(input);
        input.focus();
        
        this.editUsername.textContent = "🖫";
        this.editUsername.onclick = () => this.saveUsername(input);

        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                this.saveUsername(input);
            } else if (e.key === "Escape") {
                this.cancelEditUsername(input);
            }
        };
    }

    /**
     * Cancels the username editing and restores the text span.
     *
     * @param {any} input - The input.
     */
    cancelEditUsername(input) {
        input.replaceWith(this.usernameSpan);
        this.editUsername.textContent = "✐";
        this.editUsername.onclick = () => this.editUsernameClick();
    }

    /**
     * Saves the new username if it has changed and updates the display.
     *
     * @param {any} input - The input.
     * @returns {Promise<void>}
     */
    async saveUsername(input) {
        const newUsername = input.value.trim();
        if (!newUsername || newUsername === this.usernameSpan.textContent) {
            this.cancelEditUsername(input);
            return;
        }

        try {
            await AuthService.updateUsername(newUsername);
            FlashMessageManager.show(LanguageManager.t("account.usernameSuccess"), "success");
            this.usernameSpan.textContent = newUsername;
            await Navbar.updateUserInfo();
        } catch (error) {
            FlashMessageManager.show(error.message || LanguageManager.t("account.usernameFailed"), "error");
        }
        
        this.cancelEditUsername(input);
    }

    /**
     * Handles the click event to edit the user email.
     * Replaces the email text with an input field.
     */
    editUsermailClick() {
        const input = el("input", { maxLength: 100,  type: "email", value: this.usermail.textContent, className: "form-input account-info-input"  });
        this.usermail.replaceWith(input);
        input.focus();
        
        this.editUsermail.textContent = "🖫";
        this.editUsermail.onclick = () => this.saveUsermail(input);

        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                this.saveUsermail(input);
            } else if (e.key === "Escape") {
                this.cancelEditUsermail(input);
            }
        };
    }

    /**
     * Cancels the email editing and restores the text span.
     *
     * @param {any} input - The input.
     */
    cancelEditUsermail(input) {
        input.replaceWith(this.usermail);
        this.editUsermail.textContent = "✐";
        this.editUsermail.onclick = () => this.editUsermailClick();
    }

    /**
     * Saves the new email if it has changed and updates the display.
     *
     * @param {any} input - The input.
     * @returns {Promise<void>}
     */
    async saveUsermail(input) {
        const newUsermail = input.value.trim();
        if (!newUsermail || newUsermail === this.usermail.textContent) {
            this.cancelEditUsermail(input);
            return;
        }

        try {
            await AuthService.updateEmail(newUsermail);
            FlashMessageManager.show(LanguageManager.t("account.emailSuccess"), "success");
            this.usermail.textContent = newUsermail;
        } catch (error) {
            FlashMessageManager.show(error.message || LanguageManager.t("account.emailFailed"), "error");
        }
        
        this.cancelEditUsermail(input);
    }

    /**
     * Retrieves the CSS files specific to this view.
     *
     * @returns {Array<string>} List of CSS file paths.
     */
    getCss() {
        return ["/asset/css/account.css"];
    }

    /**
     * Cleans up custom components when the view is destroyed.
     */
    destroy() {
        if (this.langSelect && typeof this.langSelect.destroy === "function") {
            this.langSelect.destroy();
        }
    }

    async showDeleteModal() {
        const confirmed = await FlashMessageManager.confirm(
            LanguageManager.t("account.deleteAccountTitle"),
            LanguageManager.t("account.deleteAccountConfirm"),
            LanguageManager.t("account.deleteAccountBtn")
        );
        if (confirmed) {
            await this.handleDeleteAccount();
        }
    }

    async handleDeleteAccount() {
        try {
            const response = await AuthService.deleteAccount();
            if (response) {
                FlashMessageManager.show(LanguageManager.t("account.deleteAccountSuccess"), "success");
                history.pushState(null, null, "/");
                window.dispatchEvent(new Event("popstate"));
            }
        } catch (error) {
            FlashMessageManager.show(error.message || "Failed to delete account.", "error");
        }
    }
}

