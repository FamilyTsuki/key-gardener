export class DeviceCapabilitiesDetector {
    constructor(targetElementId) {
        this.targetElement = document.getElementById(targetElementId);
        this.mediaQuery = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );
        this.handleDeviceChange = this.handleDeviceChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.hasKeyboardDetected = false;
    }

    initialize() {
        if (!this.targetElement) return;

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
        if (this.mediaQuery.matches || this.hasKeyboardDetected) {
            this.targetElement.classList.remove("hidden");
        } else {
            this.targetElement.classList.add("hidden");
        }
    }
}
