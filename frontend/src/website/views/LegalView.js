import AbstractView from "../../core/views/AbstractView.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * Represents LegalView.
 */
export default class LegalView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle(LanguageManager.t("legal.title") || "Legal Information");
        this.setMetaDescription(LanguageManager.t("legal.description"));
        this.currentTab = "notice";
    }

    async render() {

        const tabsContainer = el("div", { className: "legal-tabs" });
        
        const noticeBtn = el("button", { className: "legal-tab-btn active", id: "btn-notice" }, LanguageManager.t("legal.legalNoticeTab") || "Legal Notice");
        const privacyBtn = el("button", { className: "legal-tab-btn", id: "btn-privacy" }, LanguageManager.t("legal.privacyTab") || "Privacy Policy");
        const termsBtn = el("button", { className: "legal-tab-btn", id: "btn-terms" }, LanguageManager.t("legal.termsTab") || "Terms of Service");

        tabsContainer.append(noticeBtn, privacyBtn, termsBtn);

        const noticeSection = el("div", { className: "legal-content-section active", id: "sec-notice" });
        noticeSection.innerHTML = `<h2>${LanguageManager.t("legal.legalNoticeTitle") || "Legal Notice"}</h2>${LanguageManager.t("legal.legalNoticeContent") || ""}`;

        const privacySection = el("div", { className: "legal-content-section", id: "sec-privacy" });
        privacySection.innerHTML = `<h2>${LanguageManager.t("legal.privacyTitle") || "Privacy Policy"}</h2>${LanguageManager.t("legal.privacyContent", { email: window.SUPPORT_EMAIL }) || ""}`;

        const termsSection = el("div", { className: "legal-content-section", id: "sec-terms" });
        termsSection.innerHTML = `<h2>${LanguageManager.t("legal.termsTitle") || "Terms of Service"}</h2>${LanguageManager.t("legal.termsContent") || ""}`;

        const switchTab = (tabName) => {

            [noticeBtn, privacyBtn, termsBtn].forEach(btn => btn.classList.remove("active"));
            if (tabName === "notice") noticeBtn.classList.add("active");
            if (tabName === "privacy") privacyBtn.classList.add("active");
            if (tabName === "terms") termsBtn.classList.add("active");

            [noticeSection, privacySection, termsSection].forEach(sec => sec.classList.remove("active"));
            if (tabName === "notice") noticeSection.classList.add("active");
            if (tabName === "privacy") privacySection.classList.add("active");
            if (tabName === "terms") termsSection.classList.add("active");
        };

        noticeBtn.addEventListener("click", () => switchTab("notice"));
        privacyBtn.addEventListener("click", () => switchTab("privacy"));
        termsBtn.addEventListener("click", () => switchTab("terms"));

        const container = el(
            "div",
            { className: "legal-container" },
            el("div", { className: "legal-header" },
                el("h1", { className: "legal-title" }, LanguageManager.t("legal.title") || "Legal Information")
            ),
            tabsContainer,
            noticeSection,
            privacySection,
            termsSection
        );

        return container;
    }

    async init() {

        const hash = window.location.hash.replace("#", "");
        if (hash === "privacy" || hash === "terms" || hash === "notice") {
            const btn = document.getElementById(`btn-${hash}`);
            if (btn) btn.click();
        }
    }

    getCss() {
        return ["/asset/css/legal.css"];
    }
}
