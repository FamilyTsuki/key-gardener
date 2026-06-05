/**
 * Utility to detect device capabilities and adjust UI accordingly.
 */
export class DeviceCapabilitiesDetector {
    /**
     * Initializes the detector for a set of target elements.
     * @param {string} targetElementIdOrSelector - The ID or CSS selector of the target elements to toggle visibility.
     */
    constructor(targetElementIdOrSelector, additionalCheck = () => true) {
        this.targetElements = [];
        const elById = document.getElementById(targetElementIdOrSelector);
        if (elById) {
            this.targetElements.push(elById);
        } else {
            try {
                const els = document.querySelectorAll(targetElementIdOrSelector);
                this.targetElements = Array.from(els);
            } catch (e) {
                // ignore
            }
        }

        this.mediaQuery = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );
        this.handleDeviceChange = this.handleDeviceChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.hasKeyboardDetected = false;
        this.additionalCheck = additionalCheck;
    }

    /**
     * Sets up event listeners and applies the initial visibility state.
     */
    initialize() {
        if (this.targetElements.length === 0) return;

        this.updateInterfaceVisibility();
        this.mediaQuery.addEventListener("change", this.handleDeviceChange);
        window.addEventListener("keydown", this.handleKeyDown, { once: true });
    }

    /**
     * Handles changes in device input capabilities (e.g., hover support).
     */
    handleDeviceChange() {
        this.updateInterfaceVisibility();
    }

    /**
     * Handles keyboard events to detect keyboard presence.
     */
    handleKeyDown() {
        this.hasKeyboardDetected = true;
        this.updateInterfaceVisibility();
    }

    /**
     * Updates the visibility of the target elements based on detected capabilities.
     */
    updateInterfaceVisibility() {
        this.targetElements.forEach(el => {
            if ((this.mediaQuery.matches || this.hasKeyboardDetected) && this.additionalCheck()) {
                el.classList.remove("hidden");
            } else {
                el.classList.add("hidden");
            }
        });
    }
}
