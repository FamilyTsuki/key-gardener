import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import SocketService from "../../core/services/SocketService.js";

/**
 * View for registering a new user account.
 */
export default class RegisterView extends AbstractView {
    /**
     * Creates an instance of RegisterView.
     *
     * @param {Object} params - The route parameters.
     */
    constructor(params) {
        super(params);
        this.setTitle(LanguageManager.t("register.title") + " - Keyboard Survivor");
    }

    /**
     * Renders the registration view content and form.
     *
     * @returns {Promise<HTMLElement>} The register view container element.
     */
    async render() {
        const usernameInput = el("input", { type: "text", placeholder: LanguageManager.t("register.usernamePlaceholder"), required: true, className: "form-input", id: "username", "aria-label": "Username", autocomplete: "username" });
        const emailInput = el("input", { type: "email", placeholder: LanguageManager.t("register.emailPlaceholder"), required: true, className: "form-input", id: "reg-email", "aria-label": "Email Address", autocomplete: "email" });
        const passwordInput = el("input", { type: "password", placeholder: LanguageManager.t("register.passwordPlaceholder"), required: true, className: "form-input", id: "reg-password", "aria-label": "Password", autocomplete: "new-password" });
        const confirmPasswordInput = el("input", { type: "password", placeholder: LanguageManager.t("register.confirmPasswordPlaceholder"), required: true, className: "form-input", id: "confirm-password", "aria-label": "Confirm Password", autocomplete: "new-password" });

        const handleSubmit = async (e) => {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            if (password !== confirmPassword) {
                FlashMessageManager.show(LanguageManager.t("register.passwordsDoNotMatch"), "error");
                return;
            }

            if (password.length < 6) {
                FlashMessageManager.show(LanguageManager.t("register.passwordTooShort"), "error");
                return;
            }

            try {
                await AuthService.register(username, email, password);
                
                SocketService.registerUser();

                const Navbar = (await import("../components/Navbar.js")).default;
                Navbar.render();
                
                history.pushState(null, null, "/");
                window.dispatchEvent(new Event("popstate"));
                
                FlashMessageManager.show(LanguageManager.t("register.registerSuccess"), "success");
            } catch (error) {
                FlashMessageManager.show(error.message || LanguageManager.t("register.registerFailed"), "error");
            }
        };

        const separator = el("div", { className: "login-separator" },
            el("span", {}, LanguageManager.t("login.or"))
        );
        const googleBtnContainer = el("div", { id: "google-signin-btn", className: "google-btn-container" });

        const form = el("form", { id: "register-form", onsubmit: handleSubmit },
            usernameInput,
            emailInput,
            passwordInput,
            confirmPasswordInput,
            el("button", { type: "submit", className: "btn-primary" }, LanguageManager.t("register.registerBtn")),
            separator,
            googleBtnContainer
        );

        this.container = el("div", { className: "register-container glass-panel" },
            el("h2", {}, LanguageManager.t("register.title")),
            form,
            el("p", { className: "register-link" },
                LanguageManager.t("register.alreadyHaveAccount"),
                el("a", { href: "/login", dataset: { link: true } }, LanguageManager.t("register.loginLink"))
            )
        );

        this.initGoogleSignIn();
        return this.container;
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
        return ["/asset/css/register.css"];
    }
}

