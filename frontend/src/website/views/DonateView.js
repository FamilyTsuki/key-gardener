import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * View class for the Support/Donation page.
 */
export default class DonateView {
    constructor() {
        this.container = el("div", { className: "view-container donate-container" });
    }

    /**
     * Renders the Support view.
     * @returns {HTMLElement} The populated container element.
     */
    async render() {
        this.container.innerHTML = "";

        const shapes = [
            el("div", { className: "organic-shape shape-1" }),
            el("div", { className: "organic-shape shape-2" }),
            el("div", { className: "organic-shape shape-3" }),
            el("div", { className: "organic-shape shape-4" }),
            el("div", { className: "organic-shape shape-5" })
        ];

        const particlesContainer = el("div", { className: "particles-container" });
        for (let i = 0; i < 15; i++) {
            const size = Math.random() * 8 + 4;
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 10 + 10;
            
            const particle = el("div", { 
                className: "warm-particle",
                style: `width: ${size}px; height: ${size}px; left: ${left}%; top: ${top}%; animation-delay: -${delay}s; animation-duration: ${duration}s;`
            });
            particlesContainer.appendChild(particle);
        }

        const header = el("div", { className: "support-header" },
            el("h1", { className: "support-title" }, LanguageManager.t("donate.title"))
        );

        const avatarContainer = el("div", { className: "letter-avatar-container" },
            el("img", { src: "/asset/img/boykisser.gif", alt: "Developer", className: "letter-avatar" })
        );

        const letter = el("div", { className: "support-letter" },
            avatarContainer,
            el("p", {}, LanguageManager.t("donate.letterIntro1")),
            el("p", {}, LanguageManager.t("donate.letterIntro2"))
        );

        const expensesCard = el("div", { className: "support-card expenses" },
            el("div", { className: "card-icon" }, "☕"),
            el("h2", { className: "support-card-title" }, LanguageManager.t("donate.realityTitle")),
            el("p", { className: "support-card-desc" }, LanguageManager.t("donate.realityDesc"))
        );

        const improvementsCard = el("div", { className: "support-card improvements" },
            el("div", { className: "card-icon" }, "✨"),
            el("h2", { className: "support-card-title" }, LanguageManager.t("donate.dreamTitle")),
            el("p", { className: "support-card-desc" }, LanguageManager.t("donate.dreamDesc"))
        );

        const grid = el("div", { className: "support-grid" },
            expensesCard,
            improvementsCard
        );

        const kofiLink = "https://ko-fi.com/tsuki_dev";

        const ctaContainer = el("div", { className: "cta-container" },
            el("h2", { className: "cta-title" }, LanguageManager.t("donate.ctaTitle")),
            el("p", { className: "cta-desc" }, LanguageManager.t("donate.ctaDesc")),
            el("a", { 
                href: kofiLink, 
                target: "_blank", 
                rel: "noopener noreferrer",
                className: "kofi-btn" 
            }, 
                "💖 " + LanguageManager.t("donate.submit")
            )
        );

        shapes.forEach(s => this.container.appendChild(s));
        this.container.appendChild(particlesContainer);

        this.container.appendChild(header);
        this.container.appendChild(letter);
        this.container.appendChild(grid);
        this.container.appendChild(ctaContainer);
        
        return this.container;
    }

    /**
     * Get the css.
     */
    getCss() {
        return ["/asset/css/donate.css"];
    }
}
