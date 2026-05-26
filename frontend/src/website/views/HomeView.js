import AbstractView from "../../core/views/AbstractView.js";
import { TunnelAnimation } from "../components/TunnelAnimation.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { DeviceCapabilitiesDetector } from "../../core/utils/DeviceCapabilitiesDetector.js";

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
                            "Keyboard Survivor"
                        ),
                        el(
                            "p",
                            { className: "home-description" },
                            "Gamify your typing skills. Explore and fight using your keyboard as the primary controller."
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
                                "Start Game"
                            )
                        )
                    ),
                    el("img", {
                        src: "/asset/img/home.jpg",
                        alt: "Game Image",
                        className: "first-home-img",
                    })
                ),
                el(
                    "div",
                    { className: "home-contaner-2" },
                    el("img", {
                        src: "/asset/img/home.jpg",
                        alt: "Game Image",
                        className: "first-home-img",
                    }),
                    el(
                        "div",
                        { className: "home-info-container" },
                        el("h2", { className: "home-title" }, "why"),
                        el(
                            "p",
                            { className: "home-info" },
                            "Discover the unique gameplay experience that combines typing challenges with exciting adventures."
                        )
                    )
                ),
                el(
                    "div",
                    { className: "home-footer" },
                    el(
                        "p",
                        { className: "home-footer-info" },
                        "Contact us: ",
                        el(
                            "a",
                            { href: "mailto:info@keyboard-survivor.com" },
                            "info@keyboard-survivor.com"
                        )
                    ),
                    el(
                        "p",
                        { className: "home-footer-info" },
                        "Follow us on social media: ",
                        el(
                            "a",
                            {
                                href: "https://www.facebook.com/keyboardsurvivor",
                                target: "_blank",
                            },
                            "Facebook"
                        ),
                        ", ",
                        el(
                            "a",
                            {
                                href: "https://www.twitter.com/keyboardsurvivor",
                                target: "_blank",
                            },
                            "Twitter"
                        ),
                        ", ",
                        el(
                            "a",
                            {
                                href: "https://www.instagram.com/keyboardsurvivor",
                                target: "_blank",
                            },
                            "Instagram"
                        )
                    ),
                    el("p", { className: "footer-thx" }, "Special Thank"),
                    el(
                        "p",
                        { className: "home-footer-info" },
                        "to all our supporters and players who make Keyboard Survivor possible!"
                    ),
                    el(
                        "p",
                        { className: "home-footer-info" },
                        "\u00A9 2024 Keyboard Survivor. All rights reserved."
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
        return ["/asset/css/home.css"];
    }
}
