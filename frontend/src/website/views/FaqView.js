import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * FAQ and Tips View for SEO and User Information.
 */
export default class FaqView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle(LanguageManager.t("faq.title"));
        this.setMetaDescription(LanguageManager.t("faq.description"));
    }

    /**
     * Renders.
     */
    async render() {
        const container = el("main", { className: "content faq-container", role: "main" },
            el("section", { className: "faq-header glass-panel" },
                el("h1", { className: "faq-main-title" }, LanguageManager.t("faq.mainTitle")),
                el("p", { className: "faq-intro" }, LanguageManager.t("faq.intro"))
            ),
            el("section", { className: "faq-questions" },
                this.createFaqItem("faq.q1", "faq.a1"),
                this.createFaqItem("faq.q2", "faq.a2"),
                this.createFaqItem("faq.q3", "faq.a3"),
                this.createFaqItem("faq.q4", "faq.a4")
            )
        );

        return container;
    }

    /**
     * Creates the faq item.
 * @param {any} questionKey - The questionKey.
 * @param {any} answerKey - The answerKey.
     */
    createFaqItem(questionKey, answerKey) {
        return el("article", { className: "faq-item glass-panel" },
            el("h2", { className: "faq-question" }, LanguageManager.t(questionKey)),
            el("p", { className: "faq-answer" }, LanguageManager.t(answerKey))
        );
    }

    /**
     * Get the css.
     */
    getCss() {
        return ["/asset/css/faq.css"];
    }
}
