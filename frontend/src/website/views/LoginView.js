import AbstractView from "./AbstractView.js";
import { AuthService } from "../services/auth.service.js";
import { el } from "../utils/DOMBuilder.js";

export default class LoginView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Login - Keyboard Survivor");
    }

    async render() {
        const messageDiv = el("div", { id: "login-message" });
        const emailInput = el("input", { type: "email", placeholder: "Email", required: true, className: "login-input", id: "email" });
        const passwordInput = el("input", { type: "password", placeholder: "Password", required: true, className: "login-input", id: "password" });

        const setMessage = (text, className) => {
            messageDiv.innerHTML = "";
            messageDiv.appendChild(el("p", { className }, text));
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = "";

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            try {
                await AuthService.login(email, password);
                setMessage("Login successful! Redirecting...", "auth-success");
                setTimeout(() => {
                    window.location.href = "/";
                }, 500);
            } catch (error) {
                setMessage(error.message || "Login failed", "auth-error");
            }
        };

        const form = el("form", { id: "login-form", onsubmit: handleSubmit },
            emailInput,
            passwordInput,
            messageDiv,
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
