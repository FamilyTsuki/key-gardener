import { el } from "./DOMBuilder.js";
import { PostsService } from "../services/posts.service.js";
import { FlashMessageManager } from "./FlashMessageManager.js";
import { LanguageManager } from "./LanguageManager.js";

class ModerationWarning {
    show(content, flaggedType, warningCount = 1) {
        const flagTypeLabel = flaggedType === "image"
            ? LanguageManager.t("moderation.typeImage")
            : LanguageManager.t("moderation.typeLanguage");

        const alertText2 = LanguageManager.t("moderation.alertText2").replace("{count}", warningCount);

        const closeBtn = el("button", { className: "scary-btn scary-btn-primary" }, LanguageManager.t("moderation.understood"));
        const contestBtn = el("button", { className: "scary-btn scary-btn-secondary" }, LanguageManager.t("moderation.contest"));
        const actionContainer = el("div", { className: "scary-btn-container" }, closeBtn, contestBtn);

        const modal = el("div", { className: "scary-modal" },
            el("div", { className: "scary-icon" }, "⚠️"),
            el("h2", { className: "scary-title" }, LanguageManager.t("moderation.alertTitle")),
            el("p", { className: "scary-text" }, LanguageManager.t("moderation.alertText1")),
            el("p", { className: "scary-text" }, alertText2),
            el("div", { className: "scary-reason-box" },
                el("div", { className: "scary-reason-title" }, LanguageManager.t("moderation.anomalyLabel")),
                el("div", { className: "scary-reason-desc" }, flagTypeLabel)
            ),
            actionContainer
        );

        const overlay = el("div", { className: "scary-overlay" }, modal);

        closeBtn.onclick = () => overlay.remove();

        contestBtn.onclick = async () => {
            contestBtn.disabled = true;
            contestBtn.innerText = LanguageManager.t("moderation.contesting");
            try {
                const postContent = content || LanguageManager.t("moderation.mediaPlaceholder");
                await PostsService.contestModeration(postContent, flaggedType);
                contestBtn.remove();
                actionContainer.appendChild(
                    el("div", { className: "scary-success-message" }, LanguageManager.t("moderation.contestSuccess"))
                );
            } catch (err) {
                contestBtn.disabled = false;
                contestBtn.innerText = LanguageManager.t("moderation.contest");
                FlashMessageManager.show(LanguageManager.t("moderation.contestError"), "error");
            }
        };

        document.body.appendChild(overlay);
    }
}

export const WarningPopupManager = new ModerationWarning();
