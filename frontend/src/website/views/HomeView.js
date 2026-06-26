import AbstractView from "../../core/views/AbstractView.js";
import { CaveAnimation } from "../components/CaveAnimation.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { DeviceCapabilitiesDetector } from "../../core/utils/DeviceCapabilitiesDetector.js";
import { AuthService } from "../../core/services/auth.service.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";
import { SettingsManager } from "../../core/utils/SettingsManager.js";
/**
 * Represents HomeView.
 */
export default class HomeView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle(LanguageManager.t("nav.home") || "Home");
        this.isCurrentView = false;
        this.hologramListeners = [];
        this.glitchFrameId = null;
        this.boundScrollListener = null;
        this.caveAnimation = null;
    }
    renderHologram(imgSrc, altText) {
        const img = el("img", {
            src: imgSrc,
            alt: altText,
            className: "first-home-img",
        });
        if (window.incrementLoader) window.incrementLoader();
        img.onload = () => { if (window.decrementLoader) window.decrementLoader(); };
        img.onerror = () => { if (window.decrementLoader) window.decrementLoader(); };
        return el(
            "div",
            {
                className: "hologram-wrapper",
                style: `--img-url: url('${imgSrc}')`
            },
            img,
            el("div", { className: "hologram-scanlines" }),
            el("div", { className: "hologram-noise" }),
            el("div", { className: "hologram-tear-layer" })
        );
    }
    async render() {
        this.isCurrentView = true;
        const tunnelContainer = el("div", { id: "tunnel-container" });
        const svgFilter = el("div", {},
            el("svg", { className: "hologram-svg-filter", width: "0", height: "0" },
                el("filter", { id: "hologram-distortion-filter" },
                    el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.001 0.2", numOctaves: "1", result: "noise" }),
                    el("feDisplacementMap", { id: "displacement-map", in: "SourceGraphic", in2: "noise", scale: "0", xChannelSelector: "R", yChannelSelector: "A" })
                ),
                el("filter", { id: "hologram-mouse-filter" },
                    el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.001 0.2", numOctaves: "1", result: "noise2" },
                        el("animate", { attributeName: "seed", values: "1;100", dur: "2s", repeatCount: "indefinite" })
                    ),
                    el("feDisplacementMap", { id: "mouse-displacement-map", in: "SourceGraphic", in2: "noise2", scale: "0", xChannelSelector: "R", yChannelSelector: "A" })
                )
            )
        );
        const container = el(
            "div",
            {},
            tunnelContainer,
            svgFilter,
            el(
                "main",
                { className: "content", role: "main" },
                el(
                    "section",
                    { className: "home-section-row home-contaner-1", "aria-labelledby": "home-main-title" },
                    el(
                        "div",
                        { className: "home-presantation-container" },
                        el(
                            "h1",
                            { className: "home-title", id: "home-main-title" },
                            LanguageManager.t("home.title")
                        ),
                        el(
                            "p",
                            { className: "home-description" },
                            LanguageManager.t("home.description")
                        ),
                        
                        el(
                            "a",
                            {
                                href: "/game",
                                dataset: { link: true },
                                className: "start-btn hidden",
                                id: "start-btn",
                                onclick: (e) => {
                                    if (SettingsManager.getSettings().fullscreen && !document.fullscreenElement) {
                                        document.documentElement.requestFullscreen().then(() => {
                                            if (navigator.keyboard && navigator.keyboard.lock) {
                                                navigator.keyboard.lock(["Escape"]).catch(e => console.warn(e));
                                            }
                                        }).catch(err => console.warn(err));
                                    }
                                }
                            },
                            LanguageManager.t("home.startGame")
                        ),

                    
                    )
                ),
                el(
                    "div",
                    { className: "home-section-row home-contaner-2" },
                    this.renderHologram("/asset/img/boykisser.gif", "Game Image"),
                    el(
                        "div",
                        { className: "home-info-container" },
                        el("h2", { className: "home-title" }, LanguageManager.t("home.whyTitle")),
                        el(
                            "p",
                            { className: "home-info" },
                            LanguageManager.t("home.whyDesc")
                        ),
                        el("h3", { className: "home-feature-title" }, LanguageManager.t("home.feature1Title")),
                        el("p", { className: "home-info" }, LanguageManager.t("home.feature1Desc"))
                    )
                ),
                el(
                    "section",
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
                    this.renderHologram("/asset/img/moi.webp", "Cave Exploration")
                ),
                el(
                    "section",
                    { className: "home-section-col home-contaner-4" },
                    el(
                        "div",
                        { className: "home-info-container home-motivation-container" },
                        el("h2", { className: "home-title" }, LanguageManager.t("home.motivationTitle")),
                        el(
                            "p",
                            { className: "home-description" },
                            LanguageManager.t("home.motivationDesc")
                        )
                    )
                ),
                el(
                    "footer",
                    { className: "home-footer", role: "contentinfo" },
                    el(
                        "div",
                        { className: "footer-grid" },
                        el(
                            "div",
                            { className: "footer-column" },
                            el("h3", {}, LanguageManager.t("home.contactUs")),
                            el("a", { href: `mailto:${window.SUPPORT_EMAIL}` }, window.SUPPORT_EMAIL)
                        ),
                        el(
                            "div",
                            { className: "footer-column" },
                            el("h3", {}, LanguageManager.t("home.followUs")),
                            el("a", { href: "https://github.com/FamilyTsuki", target: "_blank", "aria-label": LanguageManager.t("home.followGitHub") }, "GitHub"),
                            el("a", { href: "https://discord.gg/Mv3MRXmg9P", target: "_blank", "aria-label": LanguageManager.t("home.joinDiscord") }, "Discord")
                        ),
                        el("div", { className: "footer-column" },
                                el("h3", {}, LanguageManager.t("home.credits") || "Credits"),
                                el("p", { className: "footer-thx" }, LanguageManager.t("home.specialThank")),
                                el("p", { className: "footer-thx" }, LanguageManager.t("home.thankSupporters"))
                            )
                    ),
                    el("a", { 
                        href: "/support", 
                        dataset: { link: true }, 
                        className: "footer-support-link"
                    }, LanguageManager.t("nav.donate") || "Support the Project"),
                    el(
                        "div",
                        { className: "footer-bottom" },
                        el("p", { className: "home-footer-info" }, LanguageManager.t("home.rights")),
                        el("a", { href: "/legal", dataset: { link: true }, className: "footer-legal-link" }, LanguageManager.t("legal.title") || "Legal Information")
                    )
                )
            )
        );
        this.tunnelContainer = tunnelContainer;
        return container;
    }
    async init() {
        if (this.tunnelContainer) {
            this.caveAnimation = new CaveAnimation(this.tunnelContainer);
            this.caveAnimation.init();
        }
        const deviceDetector = new DeviceCapabilitiesDetector(".start-btn", () => AuthService.isAuthenticated());
        deviceDetector.initialize();
        this.setupHologramListeners();
        this.startGlitchLoop();
    }
    setupHologramListeners() {
        this.hologramListeners = [];
        const wrappers = document.querySelectorAll(".hologram-wrapper");
        wrappers.forEach((wrapper) => {
            wrapper.targetHoverIntensity = 0;
            wrapper.currentHoverIntensity = 0;
            const handleMouseMove = (e) => {
                const rect = wrapper.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                wrapper.style.setProperty("--mouse-x", x);
                wrapper.style.setProperty("--mouse-y", y);
            };
            const handleMouseEnter = () => {
                wrapper.targetHoverIntensity = 1;
            };
            const handleMouseLeave = () => {
                wrapper.targetHoverIntensity = 0;
            };
            wrapper.addEventListener("mousemove", handleMouseMove);
            wrapper.addEventListener("mouseenter", handleMouseEnter);
            wrapper.addEventListener("mouseleave", handleMouseLeave);
            this.hologramListeners.push({ wrapper, handleMouseMove, handleMouseEnter, handleMouseLeave });
        });
    }
    startGlitchLoop() {
        const displacementMap = document.getElementById("displacement-map");
        if (!displacementMap) return;
        const wrappers = document.querySelectorAll(".hologram-wrapper");
        const mouseMap = document.getElementById("mouse-displacement-map");
        let lastDisplacementScale = "0";
        let lastMouseScale = "0";
        let isScrolling = false;
        let scrollTimeout = null;
        const appElement = document.getElementById("app");
        const scrollTarget = appElement || window;
        this.boundScrollListener = () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        };
        scrollTarget.addEventListener("scroll", this.boundScrollListener, { passive: true });
        const animate = () => {
            if (!this.isCurrentView) {
                return;
            }
            if (isScrolling) {
                this.glitchFrameId = requestAnimationFrame(animate);
                return;
            }
            let maxIntensity = 0;
            wrappers.forEach(wrapper => {
                if (Math.abs(wrapper.targetHoverIntensity - wrapper.currentHoverIntensity) > 0.001) {
                    wrapper.currentHoverIntensity += (wrapper.targetHoverIntensity - wrapper.currentHoverIntensity) * 0.05;
                    if (Math.abs(wrapper.targetHoverIntensity - wrapper.currentHoverIntensity) < 0.002) {
                        wrapper.currentHoverIntensity = wrapper.targetHoverIntensity;
                    }
                    wrapper.style.setProperty("--hover-intensity", wrapper.currentHoverIntensity.toFixed(3));
                                        if (wrapper.currentHoverIntensity > 0.01) {
                        wrapper.style.setProperty("--hologram-filter", "url(#hologram-distortion-filter)");
                        wrapper.style.setProperty("--hologram-mouse-filter", "url(#hologram-mouse-filter)");
                    } else {
                        wrapper.style.setProperty("--hologram-filter", "none");
                        wrapper.style.setProperty("--hologram-mouse-filter", "none");
                    }
                }
                                if (wrapper.currentHoverIntensity > maxIntensity) {
                    maxIntensity = wrapper.currentHoverIntensity;
                }
            });
            if (maxIntensity > 0) {
                let newScale;
                if (Math.random() > 0.94) {
                    newScale = String((Math.random() * 5 + 5) * maxIntensity);
                } else if (Math.random() > 0.85) {
                    newScale = String((Math.random() * 1) * maxIntensity);
                } else {
                    newScale = "0";
                }
                if (newScale !== lastDisplacementScale) {
                    displacementMap.setAttribute("scale", newScale);
                    lastDisplacementScale = newScale;
                }
                                if (mouseMap) {
                    let newMouseScale;
                    if (Math.random() > 0.90) {
                        newMouseScale = String((Math.random() * 60 + 20) * maxIntensity);
                    } else if (Math.random() > 0.75) {
                        newMouseScale = String((Math.random() * 15) * maxIntensity);
                    } else {
                        newMouseScale = "0";
                    }
                    if (newMouseScale !== lastMouseScale) {
                        mouseMap.setAttribute("scale", newMouseScale);
                        lastMouseScale = newMouseScale;
                    }
                }
            } else {
                if (lastDisplacementScale !== "0") {
                    displacementMap.setAttribute("scale", "0");
                    lastDisplacementScale = "0";
                }
                if (mouseMap && lastMouseScale !== "0") {
                    mouseMap.setAttribute("scale", "0");
                    lastMouseScale = "0";
                }
            }
            this.glitchFrameId = requestAnimationFrame(animate);
        };
        this.glitchFrameId = requestAnimationFrame(animate);
    }
    cleanupHologramListeners() {
        if (this.hologramListeners) {
            this.hologramListeners.forEach(({ wrapper, handleMouseMove, handleMouseEnter, handleMouseLeave }) => {
                wrapper.removeEventListener("mousemove", handleMouseMove);
                wrapper.removeEventListener("mouseenter", handleMouseEnter);
                wrapper.removeEventListener("mouseleave", handleMouseLeave);
            });
            this.hologramListeners = [];
        }
    }
    destroy() {
        this.isCurrentView = false;
        if (this.glitchFrameId) {
            cancelAnimationFrame(this.glitchFrameId);
            this.glitchFrameId = null;
        }
        if (this.boundScrollListener) {
            const appElement = document.getElementById("app");
            const scrollTarget = appElement || window;
            scrollTarget.removeEventListener("scroll", this.boundScrollListener);
            this.boundScrollListener = null;
        }
        if (this.caveAnimation) {
            this.caveAnimation.destroy();
            this.caveAnimation = null;
        }
        this.cleanupHologramListeners();
    }
    getCss() {
        return ["/asset/css/home.css", "/asset/css/footer.css"];
    }
}
