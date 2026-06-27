/**
 * AmbientBackground class that handles rendering a persistent background animation.
 */
export class AmbientBackground {
    /**
     * Constructs an AmbientBackground instance.
     * @param {any} parentContainer - The parentContainer.
     */
    constructor(parentContainer) {
        this.canvas = document.createElement("canvas");
        this.canvas.className = "background-canvas-persistent";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        parentContainer.prepend(this.canvas);
        this.context = this.canvas.getContext("2d");
        this.animationId = null;
        this.runFrame = this.runFrame.bind(this);
    }

    /**
     * Starts the background animation loop.
     */
    start() {
        this.animationId = requestAnimationFrame(this.runFrame);
    }

    /**
     * Executes a single animation frame.
     */
    runFrame() {
        const ctx = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = performance.now() / 1000;

        ctx.clearRect(0, 0, w, h);

        for (let y = 0; y < h; y += 4) {
            const intensity = 0.015 + 0.008 * Math.sin(time * 0.7 + y * 0.01);
            ctx.fillStyle = `rgba(0, 255, 100, ${intensity})`;
            ctx.fillRect(0, y, w, 1);
        }

        const pulseRadius = 180 + 40 * Math.sin(time * 1.2);
        const gradient = ctx.createRadialGradient(
            w / 2,
            h / 2,
            0,
            w / 2,
            h / 2,
            pulseRadius
        );
        gradient.addColorStop(
            0,
            `rgba(0, 180, 255, ${0.04 + 0.02 * Math.sin(time * 1.5)})`
        );
        gradient.addColorStop(
            0.5,
            `rgba(100, 0, 255, ${0.02 + 0.01 * Math.cos(time)})`
        );
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        this.animationId = requestAnimationFrame(this.runFrame);
    }

    /**
     * Destroys the canvas and stops the animation.
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
            this.context = null;
        }
    }
}

/**
 * GlitchEffect class that handles rendering a glitch visual overlay.
 */
export class GlitchEffect {
    /**
     * Constructs a GlitchEffect instance.
     * @param {any} parentContainer - The parentContainer.
     */
    constructor(parentContainer) {
        this.canvas = document.createElement("canvas");
        this.canvas.className = "glitch-canvas-overlay";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        parentContainer.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        this.animationId = null;
        this.runFrame = this.runFrame.bind(this);
    }

    /**
     * Starts the glitch animation loop.
     */
    start() {
        this.animationId = requestAnimationFrame(this.runFrame);
    }

    /**
     * Executes a single animation frame for the glitch effect.
     */
    runFrame() {
        const ctx = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const sliceCount = Math.floor(Math.random() * 6) + 2;
        for (let i = 0; i < sliceCount; i++) {
            const y = Math.random() * h;
            const sliceH = Math.floor(Math.random() * 12) + 2;
            const offsetX = (Math.random() - 0.5) * 60;

            ctx.fillStyle = `rgba(255, 0, 60, ${Math.random() * 0.18 + 0.04})`;
            ctx.fillRect(offsetX - 4, y, w, sliceH);

            ctx.fillStyle = `rgba(0, 255, 200, ${Math.random() * 0.15 + 0.04})`;
            ctx.fillRect(-offsetX + 4, y, w, sliceH);
        }

        if (Math.random() < 0.25) {
            const by = Math.random() * h;
            const bh = Math.floor(Math.random() * 6) + 1;
            ctx.fillStyle = `rgba(0, 255, 80, ${Math.random() * 0.25 + 0.08})`;
            ctx.fillRect(0, by, w, bh);
        }

        if (Math.random() < 0.15) {
            const bx = Math.random() * w;
            const by = Math.random() * h;
            const bw = Math.random() * 120 + 20;
            const bh = Math.random() * 10 + 3;
            const colors = [
                "rgba(0,255,100,0.12)",
                "rgba(255,0,80,0.1)",
                "rgba(0,200,255,0.12)",
            ];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(bx, by, bw, bh);
        }

        ctx.strokeStyle = "rgba(0, 255, 100, 0.025)";
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 3) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        this.animationId = requestAnimationFrame(this.runFrame);
    }

    /**
     * Destroys the canvas and stops the glitch animation.
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
            this.context = null;
        }
    }
}
