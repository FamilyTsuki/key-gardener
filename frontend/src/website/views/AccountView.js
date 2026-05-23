import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import Navbar from "../components/Navbar.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";

/**
 * View for displaying and managing user account information.
 */
export default class AccountView extends AbstractView {
    /**
     * Creates an instance of AccountView.
     *
     * @param {Object} params - The route parameters.
     */
    constructor(params) {
        super(params);
        this.setTitle("Account - Keyboard Survivor");
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
                        FlashMessageManager.show(error.message || "Upload failed", "error");
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
        
        const logoutTxt = el("a", { 
                dataset: { link: true },
                href: "/",
                className: "nav-logout", 
                onclick: () => {
                    AuthService.logout();
                    Navbar.render();
                    history.pushState(null, null, "/");
                    window.dispatchEvent(new Event("popstate"));
                } 
            }, "Logout");
        const passwordContainer = el("div", { className: "password-container" },
            el("h3", { className: "password-title" }, "Change Password"),
            el("input", { type: "password", id: "current-password", placeholder: "Current Password", className: "account-info-input password-input" }),
            el("input", { type: "password", id: "new-password", placeholder: "New Password", className: "account-info-input password-input" }),
            el("button", { 
                className: "update-password-btn", 
                onclick: async () => {
                    const currentPwd = document.getElementById("current-password").value;
                    const newPwd = document.getElementById("new-password").value;
                    if (!currentPwd || !newPwd) {
                        FlashMessageManager.show("Please fill both password fields", "error");
                        return;
                    }
                    try {
                        await AuthService.changePassword(currentPwd, newPwd);
                        FlashMessageManager.show("Password changed successfully", "success");
                        document.getElementById("current-password").value = "";
                        document.getElementById("new-password").value = "";
                    } catch (error) {
                        FlashMessageManager.show(error.message || "Failed to change password", "error");
                    }
                }
            }, "Update Password")
        );
            
        const container = el("div", { className: "account-container" },
            el("h1", { className: "account-title" }, "Profile"),

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
                passwordContainer
            ),
            logoutTxt
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
            if (user.personalPicture.startsWith('/')) {
                this.personalPictureImg.src = user.personalPicture;
            } else {
                this.personalPictureImg.src = "/asset/img/users/" + user.personalPicture;
            }
            
        } catch (error) {
            console.error("AccountView failed to load user data", error);
            AuthService.logout();
            Router.navigate("/");
        }
    }

    /**
     * Handles the click event to edit the username.
     * Replaces the username text with an input field.
     */
    editUsernameClick() {
        const input = el("input", { type: "text", value: this.usernameSpan.textContent, className: "account-info-input name" });
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
     * @param {HTMLInputElement} input - The input field for the username.
     */
    cancelEditUsername(input) {
        input.replaceWith(this.usernameSpan);
        this.editUsername.textContent = "✐";
        this.editUsername.onclick = () => this.editUsernameClick();
    }

    /**
     * Saves the new username if it has changed and updates the display.
     *
     * @param {HTMLInputElement} input - The input field containing the new username.
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
            FlashMessageManager.show("Username updated successfully", "success");
            this.usernameSpan.textContent = newUsername;
            await Navbar.updateUserInfo();
        } catch (error) {
            FlashMessageManager.show(error.message || "Failed to update username", "error");
        }
        
        this.cancelEditUsername(input);
    }

    /**
     * Handles the click event to edit the user email.
     * Replaces the email text with an input field.
     */
    editUsermailClick() {
        const input = el("input", { type: "email", value: this.usermail.textContent, className: "account-info-input" });
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
     * @param {HTMLInputElement} input - The input field for the email.
     */
    cancelEditUsermail(input) {
        input.replaceWith(this.usermail);
        this.editUsermail.textContent = "✐";
        this.editUsermail.onclick = () => this.editUsermailClick();
    }

    /**
     * Saves the new email if it has changed and updates the display.
     *
     * @param {HTMLInputElement} input - The input field containing the new email.
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
            FlashMessageManager.show("Email updated successfully", "success");
            this.usermail.textContent = newUsermail;
        } catch (error) {
            FlashMessageManager.show(error.message || "Failed to update email", "error");
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
}

