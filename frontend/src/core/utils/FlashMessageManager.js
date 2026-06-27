import { el } from "./DOMBuilder.js";
import { Icons } from "./Icons.js";
import { LanguageManager } from "./LanguageManager.js";

/**
 * Manager to handle flash message notifications in the UI.
 */
export const FlashMessageManager = {
    /**
     * Shows a universal confirmation modal.
     * @param {any} title - The title of the modal.
     * @param {any} message - The message body.
     * @param {any} confirmText - Optional custom confirm button text.
     * @param {any} cancelText - Optional custom cancel button text.
     * @param {any} confirmClass - Optional CSS class for the confirm button.
     * @returns {Promise<boolean>}
     */
    confirm(title, message, confirmText = null, cancelText = null, confirmClass = "danger") {
        return new Promise((resolve) => {
            const modalOverlay = el("div", { className: "global-modal-overlay" });
            const modalBox = el("div", { className: "global-modal-box" },
                el("h2", { className: "global-modal-title" }, title),
                el("p", { className: "global-modal-text" }, message),
                el("div", { className: "global-modal-actions" },
                    el("button", { 
                        className: "global-modal-btn cancel",
                        onclick: () => {
                            modalOverlay.remove();
                            resolve(false);
                        }
                    }, cancelText || LanguageManager.t("common.cancel") || "Cancel"),
                    el("button", { 
                        className: "global-modal-btn confirm",
                        onclick: () => {
                            modalOverlay.remove();
                            resolve(true);
                        }
                    }, confirmText || LanguageManager.t("common.confirm") || "Confirm")
                )
            );

            if (confirmClass !== "danger") {
                const btn = modalBox.querySelector(".confirm");
                btn.style.background = "var(--primary-color)";
                btn.style.boxShadow = "0 4px 15px var(--primary-translucent)";
            }

            modalOverlay.appendChild(modalBox);
            document.body.appendChild(modalOverlay);
        });
    },

    /**
     * Shows a flash message.
     * @param {any} message - The message.
     * @param {any} type - The type.
     * @param {any} persistent - The persistent.
     * @param {any} onClickCallback - The onClickCallback.
     */
    show(
        message,
        type = "success",
        persistent = false,
        onClickCallback = null,
    ) {
        message = LanguageManager.translateMessage(message);

        const existingMessages = Array.from(document.querySelectorAll('.flash-text'));
        if (existingMessages.some(el => el.textContent === message)) {
            return;
        }
        
        const container = this._getOrCreateContainer();

        const closeBtn = el(
            "button",
            {
                className: "flash-close",
            },
            Icons.close("flash-close-icon"),
        );

        const messageEl = el(
            "div",
            {
                className: `flash-message flash-${type} ${persistent ? "flash-persistent" : "flash-temporary"}`,
            },
            el("span", { className: "flash-text" }, message),
            closeBtn,
        );

        if (onClickCallback) {
            messageEl.classList.add("flash-clickable");
            messageEl.addEventListener("click", (e) => {
                if (messageEl.dataset.isSwiping === "true") return;
                if (!e.target.closest(".flash-close")) {
                    onClickCallback();
                    this._remove(messageEl);
                }
            });
        }

        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this._remove(messageEl);
        };

        let startX = 0;
        let currentX = 0;

        messageEl.addEventListener(
            "touchstart",
            (e) => {
                startX = e.touches[0].clientX;
                messageEl.dataset.isSwiping = "false";
                messageEl.style.transition = "none";
            },
            { passive: true },
        );

        messageEl.addEventListener(
            "touchmove",
            (e) => {
                currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                if (Math.abs(diff) > 15) messageEl.dataset.isSwiping = "true";

                messageEl.style.transform = `translateX(${diff}px)`;
                messageEl.style.opacity =
                    1 - Math.abs(diff) / window.innerWidth;
            },
            { passive: true },
        );

        messageEl.addEventListener("touchend", () => {
            const diff = currentX - startX;
            messageEl.style.transition =
                "transform 0.3s ease, opacity 0.3s ease";

            if (Math.abs(diff) > 80) {
                messageEl.style.transform = `translateX(${diff > 0 ? "100%" : "-100%"})`;
                messageEl.style.opacity = 0;
                setTimeout(() => this._remove(messageEl), 300);
            } else {
                messageEl.style.transform = "";
                messageEl.style.opacity = "";
            }
            setTimeout(() => {
                messageEl.dataset.isSwiping = "false";
            }, 100);
        });

        container.appendChild(messageEl);

        if (!persistent) {
            setTimeout(() => {
                this._remove(messageEl);
            }, 3000);
        }
    },

    /**
     * Removes a flash message element from the DOM with an animation.
     * @private
     * @param {any} element - The element.
     */
    _remove(element) {
        if (
            !element ||
            element.classList.contains("flash-hiding") ||
            !element.parentNode
        )
            return;

        element.classList.add("flash-hiding");

        const handleTransitionEnd = () => {
            if (element.parentNode) {
                element.remove();
            }
            element.removeEventListener("transitionend", handleTransitionEnd);
        };

        element.addEventListener("transitionend", handleTransitionEnd);

        setTimeout(() => {
            if (element.parentNode) element.remove();
        }, 400);
    },

    /**
     * Gets or creates the container element for flash messages.
     * @private
     * @returns {Element} The flash messages container.
     */
    _getOrCreateContainer() {
        let container = document.getElementById("flash-container");
        if (!container) {
            container = el("div", { id: "flash-container" });
            document.body.appendChild(container);
        }
        return container;
    },
};
