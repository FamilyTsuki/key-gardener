import AbstractView from "../../core/views/AbstractView.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { BlackHoleAnimation } from "../components/BlackHoleAnimation.js";

export default class ErrorView extends AbstractView {
    constructor(params) {
        super(params);
        this.errorCode = params?.errorCode || "404";
        this.errorMessage = params?.errorMessage || LanguageManager.t("error.defaultDescription");
        this.setTitle(LanguageManager.t("error.title")?.replace("{code}", this.errorCode) || `${this.errorCode} - Error`);
    }

    /**
     * Rers.nde
     */
    async render() {
        this.tunnelContainer = el("div", { 
            id: "error-tunnel-container", 
            style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden;" 
        });

        const container = el(
            "div",
            { className: "error-page-wrapper" },
            this.tunnelContainer,
            el(
                "div",
                { className: "not-found-content glass-card" },
                el("h1", { className: "error-code-modern" }, this.errorCode),
                el("h2", { className: "error-title" }, LanguageManager.t("error.title")?.replace("{code}", this.errorCode) || `Error ${this.errorCode}`),
                el("p", { className: "error-desc" }, this.errorMessage),
                el("a", { href: "/", dataset: { link: true }, className: "error-btn-glow" }, LanguageManager.t("error.backHome"))
            )
        );

        return container;
    }

    /**
     * Initializes the error view.
     */
    async init() {
        if (this.tunnelContainer) {
            this.animation = new BlackHoleAnimation(this.tunnelContainer);
            await this.animation.init();
        }
    }

    /**
     * Destroies.
     */
    destroy() {
        if (this.animation && typeof this.animation.destroy === 'function') {
            this.animation.destroy();
        }
    }

    /**
     * Get the css.
     */
    getCss() {
        return ["/asset/css/error.css"];
    }
}
