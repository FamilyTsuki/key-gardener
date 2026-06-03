import AbstractView from "../../core/views/AbstractView.js";
import { CaveAnimation } from "../components/CaveAnimation.js";
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
            tunnelContainer,
            el(
                "div",
                { className: "content" },
                el(
                    "div",
                    { className: "home-section-row home-contaner-1" },
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
                    )
                ),
                el(
                    "div",
                    { className: "home-section-row home-contaner-2" },
                    el("img", {
                        src: "/asset/img/home_battle.png",
                        alt: "Game Image",
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
                        ),
                        el("h3", { style: "color: var(--primary-color); margin-top: 1rem;" }, LanguageManager.t("home.feature1Title")),
                        el("p", { className: "home-info" }, LanguageManager.t("home.feature1Desc"))
                    )
                ),
                el(
                    "div",
                    { className: "home-section-row home-contaner-3" },
                    el(
                        "div",
                        { className: "home-presantation-container" },
                        el("h2", { className: "home-title" }, LanguageManager.t("home.feature2Title")),
                        el(
                            "p",
                            { className: "home-description" },
                            LanguageManager.t("home.feature2Desc")
                        )
                    ),
                    el("img", {
                        src: "/asset/img/home.jpg",
                        alt: "Cave Exploration",
                        className: "first-home-img",
                    })
                ),
                el(
                    "div",
                    { className: "home-section-col home-contaner-4" },
                    el(
                        "div",
                        { className: "home-info-container", style: "text-align: center; width: 60vw; margin: 0 auto;" },
                        el("h2", { className: "home-title" }, LanguageManager.t("home.motivationTitle")),
                        el(
                            "p",
                            { className: "home-description" },
                            LanguageManager.t("home.motivationDesc")
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
            const caveAnimation = new CaveAnimation(this.tunnelContainer);
            caveAnimation.init();
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
