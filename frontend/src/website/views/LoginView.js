import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";

/**
 * View for user authentication (login, forgot password, reset password).
 */
export default class LoginView extends AbstractView {
    /**
     * Creates an instance of LoginView.
     *
     * @param {Object} params - The route parameters.
     */
    constructor(params) {
        super(params);
        this.setTitle("Login - Keyboard Survivor");
        this.state = "login";
        this.resetEmail = "";
    }

    /**
     * Renders the initial login view container.
     *
     * @returns {Promise<HTMLElement>} The login container element.
     */
    async render() {
        this.container = el("div", { className: "login-container" });
        this.renderState();
        return this.container;
    }

    /**
     * Updates the form displayed based on the current state (login, forgot, reset).
     */
    renderState() {
        this.container.innerHTML = "";
        
        if (this.state === "login") {
            this.container.appendChild(this.createLoginForm());
        } else if (this.state === "forgot") {
            this.container.appendChild(this.createForgotForm());
        } else if (this.state === "reset") {
            this.container.appendChild(this.createResetForm());
        }
    }

    /**
     * Creates the form elements for logging in.
     *
     * @returns {HTMLElement} The login form element.
     */
    createLoginForm() {
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

        const forgotLink = el("a", { 
            href: "#", 
            className: "forgot-link",
            onclick: (e) => {
                e.preventDefault();
                this.state = "forgot";
                this.renderState();
            }
        }, "Forgot Password?");

        return el("div", {},
            el("h2", {}, "Login"),
            form,
            el("p", { className: "register-link" }, forgotLink),
            el("p", { className: "register-link" },
                "Don't have an account? ",
                el("a", { href: "/register", dataset: { link: true } }, "Sign up")
            )
        );
    }

    /**
     * Creates the form elements for requesting a password reset.
     *
     * @returns {HTMLElement} The forgot password form element.
     */
    createForgotForm() {
        const emailInput = el("input", { type: "email", placeholder: "Email", required: true, className: "login-input" });

        const handleSubmit = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();

            try {
                await AuthService.requestPasswordReset(email);
                this.resetEmail = email;
                this.state = "reset";
                this.renderState();
                FlashMessageManager.show("If an account exists, a reset code was sent.", "success");
            } catch (error) {
                FlashMessageManager.show(error.message || "Request failed", "error");
            }
        };

        const form = el("form", { id: "forgot-form", onsubmit: handleSubmit },
            emailInput,
            el("button", { type: "submit", className: "login-btn" }, "Send Reset Code")
        );

        return el("div", {},
            el("h2", {}, "Reset Password"),
            el("p", { className: "reset-info-text" }, "Enter your email to receive a 6-digit code."),
            form,
            el("p", { className: "register-link" },
                el("a", { 
                    href: "#", 
                    onclick: (e) => {
                        e.preventDefault();
                        this.state = "login";
                        this.renderState();
                    } 
                }, "Back to Login")
            )
        );
    }

    /**
     * Creates the form elements for entering the reset code and new password.
     *
     * @returns {HTMLElement} The reset password form element.
     */
    createResetForm() {
        const codeInput = el("input", { type: "text", placeholder: "6-digit Code", required: true, className: "login-input", maxLength: 6 });
        const newPasswordInput = el("input", { type: "password", placeholder: "New Password", required: true, className: "login-input" });

        const handleSubmit = async (e) => {
            e.preventDefault();
            const code = codeInput.value.trim();
            const newPassword = newPasswordInput.value.trim();

            try {
                await AuthService.resetPassword(this.resetEmail, code, newPassword);
                this.state = "login";
                this.renderState();
                FlashMessageManager.show("Password reset successful! Please login.", "success");
            } catch (error) {
                FlashMessageManager.show(error.message || "Reset failed", "error");
            }
        };

        const form = el("form", { id: "reset-form", onsubmit: handleSubmit },
            codeInput,
            newPasswordInput,
            el("button", { type: "submit", className: "login-btn" }, "Update Password")
        );

        return el("div", {},
            el("h2", {}, "Enter Code"),
            el("p", { className: "reset-info-text" }, `Code sent to ${this.resetEmail}`),
            form,
            el("p", { className: "register-link" },
                el("a", { 
                    href: "#", 
                    onclick: (e) => {
                        e.preventDefault();
                        this.state = "login";
                        this.renderState();
                    } 
                }, "Back to Login")
            )
        );
    }

    /**
     * Retrieves the CSS files specific to this view.
     *
     * @returns {Array<string>} List of CSS file paths.
     */
    getCss() {
        return ["/asset/css/login.css"];
    }
}
