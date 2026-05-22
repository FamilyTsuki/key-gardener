export class DeviceCapabilitiesDetector {
    constructor(targetElementIdOrSelector) {
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
    }

    initialize() {
        if (this.targetElements.length === 0) return;

        this.updateInterfaceVisibility();
        this.mediaQuery.addEventListener("change", this.handleDeviceChange);
        window.addEventListener("keydown", this.handleKeyDown, { once: true });
    }

    handleDeviceChange() {
        this.updateInterfaceVisibility();
    }

    handleKeyDown() {
        this.hasKeyboardDetected = true;
        this.updateInterfaceVisibility();
    }

    updateInterfaceVisibility() {
        this.targetElements.forEach(el => {
            if (this.mediaQuery.matches || this.hasKeyboardDetected) {
                el.classList.remove("hidden");
            } else {
                el.classList.add("hidden");
            }
        });
    }
}
