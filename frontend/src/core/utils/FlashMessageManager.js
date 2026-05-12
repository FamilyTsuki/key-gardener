import { el } from "./DOMBuilder.js";
import { Icons } from "./Icons.js";

export const FlashMessageManager = {
    show(
        message,
        type = "success",
        persistent = false,
        onClickCallback = null,
    ) {
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
            messageEl.style.cursor = "pointer";
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

    _getOrCreateContainer() {
        let container = document.getElementById("flash-container");
        if (!container) {
            container = el("div", { id: "flash-container" });
            document.body.appendChild(container);
        }
        return container;
    },
};
