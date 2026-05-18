import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import Navbar from "../components/Navbar.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";

export default class AccountView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Account - Keyboard Survivor");
    }

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

    cancelEditUsername(input) {
        input.replaceWith(this.usernameSpan);
        this.editUsername.textContent = "✐";
        this.editUsername.onclick = () => this.editUsernameClick();
    }

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

    cancelEditUsermail(input) {
        input.replaceWith(this.usermail);
        this.editUsermail.textContent = "✐";
        this.editUsermail.onclick = () => this.editUsermailClick();
    }

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

    getCss() {
        return ["/asset/css/account.css"];
    }
}

