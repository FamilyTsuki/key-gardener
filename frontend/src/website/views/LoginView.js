import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import SocketService from "../../core/services/SocketService.js";

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
        this.setTitle(LanguageManager.t("login.title") + " - Keyboard Survivor");
        this.state = "login";
        this.resetEmail = "";
        this.resetToken = "";

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("reset_token");
        const email = urlParams.get("email");
        if (token && email) {
            this.state = "reset";
            this.resetEmail = email;
            this.resetToken = token;
        }
    }

    /**
     * Renders the initial login view container.
     *
     * @returns {Promise<HTMLElement>} The login container element.
     */
    async render() {
        this.container = el("div", { className: "login-container glass-panel" });
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
            this.initGoogleSignIn();
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
        const emailInput = el("input", { type: "email", placeholder: LanguageManager.t("login.emailPlaceholder"), required: true, className: "form-input", id: "email", "aria-label": "Email Address", autocomplete: "username" });
        const passwordInput = el("input", { type: "password", placeholder: LanguageManager.t("login.passwordPlaceholder"), required: true, className: "form-input", id: "password", "aria-label": "Password", autocomplete: "current-password" });

        const handleSubmit = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            try {
                await AuthService.login(email, password);
                SocketService.registerUser();
                const Navbar = (await import("../components/Navbar.js")).default;
                Navbar.render();
                history.pushState(null, null, "/");
                window.dispatchEvent(new Event("popstate"));
                FlashMessageManager.show(LanguageManager.t("login.loginSuccess"), "success");
            } catch (error) {
                FlashMessageManager.show(error.message || LanguageManager.t("login.loginFailed"), "error");
            }
        };
        const forgotLink = el("a", { 
            href: "#", 
            className: "forgot-link",
            onclick: (e) => {
                e.preventDefault();
                this.state = "forgot";
                this.renderState();
            }
        }, LanguageManager.t("login.forgotPasswordLink"));
        const separator = el("div", { className: "login-separator" },
            el("span", {}, LanguageManager.t("login.or"))
        );
        const googleBtnContainer = el("div", { id: "google-signin-btn", className: "google-btn-container" });

        const form = el("form", { id: "login-form", onsubmit: handleSubmit },
            emailInput,
            el("div", { className: "input-wrapper" },
                passwordInput,
                el("p", { className: "forgot-link" }, forgotLink)
            ),
            el("button", { type: "submit", className: "btn-primary" }, LanguageManager.t("login.loginBtn")),
            separator,
            googleBtnContainer
        );

        return el("div", {},
            el("h2", {}, LanguageManager.t("login.title")),
            form,
            el("p", { className: "register-link" },
                LanguageManager.t("login.noAccount"),
                el("a", { href: "/register", dataset: { link: true } }, LanguageManager.t("login.signUpLink"))
            )
        );
    }

    /**
     * Creates the form elements for requesting a password reset.
     *
     * @returns {HTMLElement} The forgot password form element.
     */
    createForgotForm() {
        const emailInput = el("input", { type: "email", placeholder: LanguageManager.t("login.emailPlaceholder"), required: true, className: "form-input", "aria-label": "Email Address" });

        const handleSubmit = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();

            try {
                await AuthService.requestPasswordReset(email);
                this.state = "login";
                this.renderState();
                FlashMessageManager.show(LanguageManager.t("login.resetCodeSent"), "success");
            } catch (error) {
                FlashMessageManager.show(error.message || LanguageManager.t("login.requestFailed"), "error");
            }
        };

        const form = el("form", { id: "forgot-form", onsubmit: handleSubmit },
            emailInput,
            el("button", { type: "submit", className: "btn-primary" }, LanguageManager.t("login.sendResetCodeBtn"))
        );

        return el("div", {},
            el("h2", {}, LanguageManager.t("login.resetTitle")),
            el("p", { className: "reset-info-text" }, LanguageManager.t("login.resetInfo")),
            form,
            el("p", { className: "register-link" },
                el("a", { 
                    href: "#", 
                    onclick: (e) => {
                        e.preventDefault();
                        this.state = "login";
                        this.renderState();
                    } 
                }, LanguageManager.t("login.backToLogin"))
            )
        );
    }

    /**
     * Creates the form elements for entering the reset code and new password.
     *
     * @returns {HTMLElement} The reset password form element.
     */
    createResetForm() {
        const newPasswordInput = el("input", { type: "password", placeholder: LanguageManager.t("login.newPasswordPlaceholder"), required: true, className: "form-input", "aria-label": "New Password", autocomplete: "new-password" });

        const handleSubmit = async (e) => {
            e.preventDefault();
            const newPassword = newPasswordInput.value.trim();

            try {
                await AuthService.resetPassword(this.resetEmail, this.resetToken, newPassword);
                this.state = "login";
                history.replaceState(null, null, "/login");
                this.renderState();
                FlashMessageManager.show(LanguageManager.t("login.resetSuccess"), "success");
            } catch (error) {
                FlashMessageManager.show(error.message || LanguageManager.t("login.resetFailed"), "error");
            }
        };

        const form = el("form", { id: "reset-form", onsubmit: handleSubmit },
            newPasswordInput,
            el("button", { type: "submit", className: "btn-primary" }, LanguageManager.t("login.updatePasswordBtn"))
        );

        return el("div", {},
            el("h2", {}, LanguageManager.t("login.enterCodeTitle")),
            el("p", { className: "reset-info-text" }, LanguageManager.t("login.codeSentTo") + this.resetEmail),
            form,
            el("p", { className: "register-link" },
                el("a", { 
                    href: "#", 
                    onclick: (e) => {
                        e.preventDefault();
                        this.state = "login";
                        history.replaceState(null, null, "/login");
                        this.renderState();
                    } 
                }, LanguageManager.t("login.backToLogin"))
            )
        );
    }

    /**
     * Initializes and renders the Google Sign-In button.
     */
    initGoogleSignIn() {
        const googleBtnContainer = document.getElementById("google-signin-btn") || (this.container && this.container.querySelector("#google-signin-btn"));
        if (!googleBtnContainer) {
            return;
        }

        if (window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.initialize({
                client_id: window.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
                callback: async (response) => {
                    try {
                        await AuthService.loginWithGoogle(response.credential);
                        SocketService.registerUser();
                        const Navbar = (await import("../components/Navbar.js")).default;
                        Navbar.render();
                        history.pushState(null, null, "/");
                        window.dispatchEvent(new Event("popstate"));
                        FlashMessageManager.show(LanguageManager.t("login.loginSuccess"), "success");
                    } catch (error) {
                        FlashMessageManager.show(error.message || LanguageManager.t("login.loginFailed"), "error");
                    }
                }
            });

            window.google.accounts.id.renderButton(
                googleBtnContainer,
                {
                    theme: "outline",
                    size: "large",
                    width: "100%",
                    text: "signin_with",
                    shape: "rectangular"
                }
            );
        } else {
            setTimeout(() => this.initGoogleSignIn(), 100);
        }
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
