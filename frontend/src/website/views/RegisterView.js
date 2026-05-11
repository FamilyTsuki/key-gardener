import AbstractView from "./AbstractView.js";
import { AuthService } from "../services/auth.service.js";
import { el } from "../utils/DOMBuilder.js";

export default class RegisterView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Register - Keyboard Survivor");
    }

    async render() {
        const messageDiv = el("div", { id: "register-message" });
        const usernameInput = el("input", { type: "text", placeholder: "Username", required: true, className: "register-input", id: "username" });
        const emailInput = el("input", { type: "email", placeholder: "Email", required: true, className: "register-input", id: "reg-email" });
        const passwordInput = el("input", { type: "password", placeholder: "Password", required: true, className: "register-input", id: "reg-password" });
        const confirmPasswordInput = el("input", { type: "password", placeholder: "Confirm Password", required: true, className: "register-input", id: "confirm-password" });

        const setMessage = (text, className) => {
            messageDiv.innerHTML = "";
            messageDiv.appendChild(el("p", { className }, text));
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = "";

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            if (password !== confirmPassword) {
                setMessage("Passwords do not match", "auth-error");
                return;
            }

            if (password.length < 6) {
                setMessage("Password must be at least 6 characters", "auth-error");
                return;
            }

            try {
                await AuthService.register(username, email, password);
                setMessage("Registration successful! Redirecting to login...", "auth-success");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 500);
            } catch (error) {
                setMessage(error.message || "Registration failed", "auth-error");
            }
        };

        const form = el("form", { id: "register-form", onsubmit: handleSubmit },
            usernameInput,
            emailInput,
            passwordInput,
            confirmPasswordInput,
            messageDiv,
            el("button", { type: "submit", className: "register-btn" }, "Register")
        );

        return el("div", { className: "register-container" },
            el("h2", {}, "Register"),
            form,
            el("p", { className: "register-link" },
                "Already have an account? ",
                el("a", { href: "/login", dataset: { link: true } }, "Login")
            )
        );
    }

    getCss() {
        return ["/asset/css/register.css"];
    }
}
