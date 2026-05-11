import { AuthService } from "../services/auth.service.js";
export default class Navbar {
    static async getHtml() {
        let loginLink = `<a href="/login" data-link class="login">Login</a>`;

        if (AuthService.isAuthenticated()) {
            loginLink = `
                <div class="nav-user">
                    <span id="nav-username"></span>
                    <button id="logout-btn" class="nav-logout">Logout</button>
                </div>
            `;
        }

        return `
            <nav>
                <div class="nav-page">
                    <a href="/" data-link>Home</a>
                    <a href="/hub" data-link>Community Hub</a>
                </div>
                ${loginLink}
            </nav>
        `;
    }

    static async render() {
        const container = document.getElementById("nav-container");
        if (container) {
            container.innerHTML = await this.getHtml();
            await this.updateUserInfo();
            this.addListeners();
        }
    }

    static async updateUserInfo() {
        const usernameElement = document.getElementById("nav-username");
        if (!usernameElement) {
            return;
        }

        try {
            const user = await AuthService.getCurrentUser();
            usernameElement.textContent = user.username;
        } catch (error) {
            console.error("Navbar failed to load user data:", error);
            AuthService.logout();
            window.location.reload();
        }
    }
}
