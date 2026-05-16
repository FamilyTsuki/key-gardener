import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";

export default class LoginView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Login - Keyboard Survivor");
    }

    async render() {
        const emailInput = el("input", { type: "email", placeholder: "Email", required: true, className: "login-input", id: "email" });
        const passwordInput = el("input", { type: "password", placeholder: "Password", required: true, className: "login-input", id: "password" });

        const handleSubmit = async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            try {
                await AuthService.login(email, password);
                const Navbar = (await import("../components/Navbar.js")).default;
                Navbar.render();
                history.pushState(null, null, "/");
                window.dispatchEvent(new Event("popstate"));
                
                FlashMessageManager.show("Login successful!", "success");
            } catch (error) {
                FlashMessageManager.show(error.message || "Login failed", "error");
            }
        };

        const form = el("form", { id: "login-form", onsubmit: handleSubmit },
            emailInput,
            passwordInput,
            el("button", { type: "submit", className: "login-btn" }, "Login")
        );

        return el("div", { className: "login-container" },
            el("h2", {}, "Login"),
            form,
            el("p", { className: "register-link" },
                "Don't have an account? ",
                el("a", { href: "/register", dataset: { link: true } }, "Sign up")
            )
        );
    }

    getCss() {
        return ["/asset/css/login.css"];
    }
}

