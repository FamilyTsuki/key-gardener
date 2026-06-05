import { el } from "./DOMBuilder.js";
import { PostsService } from "../services/posts.service.js";
import { FlashMessageManager } from "./FlashMessageManager.js";

class ModerationWarning {
    constructor() {
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById("scary-warning-styles")) {
            return;
        }

        const styleSheet = el("style", { id: "scary-warning-styles" }, `
            @keyframes scary-fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }

            @keyframes red-glow-pulse {
                0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 60, 0.3), inset 0 0 10px rgba(255, 0, 60, 0.15); }
                50% { box-shadow: 0 0 30px rgba(255, 0, 60, 0.55), inset 0 0 20px rgba(255, 0, 60, 0.3); }
            }

            .scary-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(10, 12, 16, 0.85);
                backdrop-filter: blur(16px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .scary-modal {
                background: #0f1219;
                border: 1px solid #ff003c;
                border-radius: 24px;
                padding: 40px 30px;
                max-width: 460px;
                width: 90%;
                text-align: center;
                animation: scary-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards, red-glow-pulse 3s infinite ease-in-out;
                box-sizing: border-box;
                font-family: "Outfit", "Inter", sans-serif;
            }

            .scary-icon {
                font-size: 3rem;
                margin-bottom: 15px;
                display: inline-block;
                filter: drop-shadow(0 0 10px rgba(255, 0, 60, 0.6));
            }

            .scary-title {
                color: #ffffff;
                font-size: 1.8rem;
                font-weight: 800;
                margin-top: 0;
                margin-bottom: 15px;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .scary-text {
                color: #94a3b8;
                font-size: 1.05rem;
                line-height: 1.6;
                margin-bottom: 20px;
            }

            .scary-reason-box {
                background: rgba(255, 0, 60, 0.05);
                border: 1px solid rgba(255, 0, 60, 0.25);
                border-radius: 14px;
                padding: 15px 20px;
                margin-bottom: 25px;
                text-align: left;
            }

            .scary-reason-title {
                color: #ff003c;
                font-weight: bold;
                font-size: 0.8rem;
                text-transform: uppercase;
                margin-bottom: 4px;
                letter-spacing: 0.5px;
            }

            .scary-reason-desc {
                color: #ffffff;
                font-size: 1rem;
                font-weight: 600;
            }

            .scary-btn-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .scary-btn {
                border-radius: 12px;
                padding: 14px 24px;
                font-size: 1rem;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.2s, transform 0.15s, border-color 0.2s;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                width: 100%;
                box-sizing: border-box;
            }

            .scary-btn-primary {
                background: #ff003c;
                color: #ffffff;
                border: none;
            }

            .scary-btn-primary:hover {
                background: #e60035;
                transform: translateY(-2px);
            }

            .scary-btn-secondary {
                background: transparent;
                color: #ff003c;
                border: 1px solid #ff003c;
            }

            .scary-btn-secondary:hover {
                background: rgba(255, 0, 60, 0.08);
                transform: translateY(-2px);
            }

            .scary-btn:active {
                transform: translateY(0);
            }

            .scary-success-message {
                color: #10b981;
                font-weight: 600;
                margin-top: 15px;
                font-size: 0.95rem;
            }
        `);
        document.head.appendChild(styleSheet);
    }

    show(content, flaggedType, warningCount = 1) {
        const typeTranslation = flaggedType === "image" ? "Image non conforme / inappropriée" : "Langage inapproprié / offensant";

        const closeBtn = el("button", { className: "scary-btn scary-btn-primary" }, "J'ai compris");
        const contestBtn = el("button", { className: "scary-btn scary-btn-secondary" }, "Contester la décision");
        const actionContainer = el("div", { className: "scary-btn-container" }, closeBtn, contestBtn);

        const modal = el("div", { className: "scary-modal" },
            el("div", { className: "scary-icon" }, "⚠️"),
            el("h2", { className: "scary-title" }, "Alerte de Sécurité"),
            el("p", { className: "scary-text" }, "Votre publication a été détectée comme non conforme à nos règles de modération."),
            el("p", { className: "scary-text" }, `Votre compte a reçu un avertissement (${warningCount}/4). La réitération entraînera une suspension définitive de l'accès au hub.`),
            el("div", { className: "scary-reason-box" },
                el("div", { className: "scary-reason-title" }, "Anomalie détectée"),
                el("div", { className: "scary-reason-desc" }, typeTranslation)
            ),
            actionContainer
        );

        const overlay = el("div", { className: "scary-overlay" }, modal);

        closeBtn.onclick = () => {
            overlay.remove();
        };

        contestBtn.onclick = async () => {
            contestBtn.disabled = true;
            contestBtn.innerText = "Envoi...";
            try {
                await PostsService.contestModeration(content || "[Contenu Média]", flaggedType);
                contestBtn.remove();
                actionContainer.appendChild(
                    el("div", { className: "scary-success-message" }, "Votre contestation a bien été enregistrée.")
                );
            } catch (err) {
                contestBtn.disabled = false;
                contestBtn.innerText = "Contester la décision";
                FlashMessageManager.show("Impossible d'envoyer la contestation.", "error");
            }
        };

        document.body.appendChild(overlay);
    }
}

export const WarningPopupManager = new ModerationWarning();
