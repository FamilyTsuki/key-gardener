import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";

export default class RegisterView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Register - Keyboard Survivor");
    }

    async render() {
        const usernameInput = el("input", { type: "text", placeholder: "Username", required: true, className: "register-input", id: "username" });
        const emailInput = el("input", { type: "email", placeholder: "Email", required: true, className: "register-input", id: "reg-email" });
        const passwordInput = el("input", { type: "password", placeholder: "Password", required: true, className: "register-input", id: "reg-password" });
        const confirmPasswordInput = el("input", { type: "password", placeholder: "Confirm Password", required: true, className: "register-input", id: "confirm-password" });

        const handleSubmit = async (e) => {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            if (password !== confirmPassword) {
                FlashMessageManager.show("Passwords do not match", "error");
                return;
            }

            if (password.length < 6) {
                FlashMessageManager.show("Password must be at least 6 characters", "error");
                return;
            }

            try {
                await AuthService.register(username, email, password);
                
                history.pushState(null, null, "/login");
                window.dispatchEvent(new Event("popstate"));
                
                FlashMessageManager.show("Registration successful!", "success");
            } catch (error) {
                FlashMessageManager.show(error.message || "Registration failed", "error");
            }
        };

        const form = el("form", { id: "register-form", onsubmit: handleSubmit },
            usernameInput,
            emailInput,
            passwordInput,
            confirmPasswordInput,
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

