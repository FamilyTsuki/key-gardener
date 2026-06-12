import { el } from "./DOMBuilder.js";
import { Icons } from "./Icons.js";
import { LanguageManager } from "./LanguageManager.js";

/**
 * Manager to handle flash message notifications in the UI.
 */
export const FlashMessageManager = {
    /**
     * Shows a confirmation flash message.
     * @param {string} message - The message content.
     * @returns {Promise<boolean>}
     */
    confirm(message) {
        return new Promise((resolve) => {
            const container = this._getOrCreateContainer();

            const confirmBtn = el(
                "button",
                {
                    className: "flash-btn flash-btn-confirm",
                },
                LanguageManager.t("common.confirm")
            );

            const cancelBtn = el(
                "button",
                {
                    className: "flash-btn flash-btn-cancel",
                },
                LanguageManager.t("common.cancel")
            );

            const buttonsContainer = el(
                "div",
                { className: "flash-buttons" },
                cancelBtn,
                confirmBtn
            );

            const messageEl = el(
                "div",
                {
                    className: "flash-message flash-confirm flash-persistent",
                },
                el("div", { className: "flash-confirm-wrapper" },
                    el("span", { className: "flash-text" }, message),
                    buttonsContainer
                )
            );

            confirmBtn.onclick = (e) => {
                e.stopPropagation();
                this._remove(messageEl);
                resolve(true);
            };

            cancelBtn.onclick = (e) => {
                e.stopPropagation();
                this._remove(messageEl);
                resolve(false);
            };

            container.appendChild(messageEl);
        });
    },

    /**
     * Shows a flash message.
     * @param {string} message - The message content.
     * @param {string} [type="success"] - The type of flash message (e.g., success, error, info).
     * @param {boolean} [persistent=false] - Whether the message should stay until explicitly closed.
     * @param {Function|null} [onClickCallback=null] - Optional callback function triggered when the message is clicked.
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
     * @param {Element} element - The DOM element of the flash message to remove.
     * @private
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
     * @returns {Element} The flash messages container.
     * @private
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
