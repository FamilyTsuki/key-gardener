import AbstractView from "../../core/views/AbstractView.js";
import { TunnelAnimation } from "../components/TunnelAnimation.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { DeviceCapabilitiesDetector } from "../../core/utils/DeviceCapabilitiesDetector.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * View for the home landing page.
 */
export default class HomeView extends AbstractView {
    /**
     * Creates an instance of HomeView.
     *
     * @param {Object} params - The route parameters.
     */
    constructor(params) {
        super(params);
        this.setTitle("Home - Keyboard Survivor");
    }

    /**
     * Renders the home view content including animations and descriptions.
     *
     * @returns {Promise<HTMLElement>} The home view container element.
     */
    async render() {
        const tunnelContainer = el("div", { id: "tunnel-container" });

        const container = el(
            "div",
            {},
            el("canvas", { id: "bg-canvas" }),
            tunnelContainer,
            el(
                "div",
                { className: "content" },
                el(
                    "div",
                    { className: "home-contaner-1" },
                    el(
                        "div",
                        { className: "home-presantation-container" },
                        el(
                            "h1",
                            { className: "home-title" },
                            LanguageManager.t("home.title")
                        ),
                        el(
                            "p",
                            { className: "home-description" },
                            LanguageManager.t("home.description")
                        ),
                        el(
                            "p",
                            {},
                            el(
                                "a",
                                {
                                    href: "/game",
                                    dataset: { link: true },
                                    className: "start-btn",
                                },
                                LanguageManager.t("home.startGame")
                            )
                        )
                    ),
                    el("img", {
                        src: "/asset/img/home_hero.png",
                        alt: "Game Image",
                        className: "first-home-img",
                    })
                ),
                el(
                    "div",
                    { className: "home-contaner-2" },
                    el("img", {
                        src: "/asset/img/home_battle.png",
                        alt: "Gameplay Action",
                        className: "first-home-img",
                    }),
                    el(
                        "div",
                        { className: "home-info-container" },
                        el("h2", { className: "home-title" }, LanguageManager.t("home.whyTitle")),
                        el(
                            "p",
                            { className: "home-info" },
                            LanguageManager.t("home.whyDesc")
                        )
                    )
                ),
                el(
                    "div",
                    { className: "home-footer" },
                    el(
                        "div",
                        { className: "footer-grid" },
                        el(
                            "div",
                            { className: "footer-column" },
                            el("h3", {}, LanguageManager.t("home.contactUs")),
                            el("a", { href: "mailto:info@keyboard-survivor.com" }, "info@keyboard-survivor.com")
                        ),
                        el(
                            "div",
                            { className: "footer-column" },
                            el("h3", {}, LanguageManager.t("home.followUs")),
                            el("a", { href: "https://www.facebook.com/keyboardsurvivor", target: "_blank" }, "Facebook"),
                            el("a", { href: "https://www.twitter.com/keyboardsurvivor", target: "_blank" }, "Twitter"),
                            el("a", { href: "https://www.instagram.com/keyboardsurvivor", target: "_blank" }, "Instagram")
                        ),
                        el(
                            "div",
                            { className: "footer-column" },
                            el("h3", {}, "Credits"),
                            el("p", { className: "footer-thx" }, LanguageManager.t("home.specialThank")),
                            el("p", { className: "footer-thx" }, LanguageManager.t("home.thankSupporters"))
                        )
                    ),
                    el(
                        "div",
                        { className: "footer-bottom" },
                        el("p", { className: "home-footer-info" }, LanguageManager.t("home.rights"))
                    )
                )
            )
        );

        this.tunnelContainer = tunnelContainer;
        return container;
    }

    /**
     * Initializes the home view, starting tunnel animation and checking device capabilities.
     *
     * @returns {Promise<void>}
     */
    async init() {
        if (this.tunnelContainer) {
            TunnelAnimation.init(this.tunnelContainer);
        }
        const deviceDetector = new DeviceCapabilitiesDetector("start-btn");
        deviceDetector.initialize();
    }

    /**
     * Retrieves the CSS files specific to this view.
     *
     * @returns {Array<string>} List of CSS file paths.
     */
    getCss() {
        return ["/asset/css/home.css", "/asset/css/footer.css"];
    }
}
