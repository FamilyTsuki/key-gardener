import { gsap } from "/node_modules/gsap/index.js";
import { ScrollTrigger } from "/node_modules/gsap/ScrollTrigger.js";

export class CaveScrollController {
    constructor(camera) {
        this.camera = camera;
        this.scrollTween = null;
        this.hasInitializedTimeout = false;
        gsap.registerPlugin(ScrollTrigger);
    }

    /**
     * Initializes the scroll trigger.
     */
    setupScrollTrigger() {
        if (this.scrollTween) {
            this.scrollTween.kill();
        }

        const selectors = [
            ".home-contaner-1",
            ".home-contaner-2",
            ".home-contaner-3",
            ".home-contaner-4",
            ".home-footer"
        ];
        
        const containers = selectors
            .map(selector => document.querySelector(selector))
            .filter(Boolean);

        if (containers.length === 0) {
            return;
        }

        const images = document.querySelectorAll(".content img");
        images.forEach(img => {
            if (!img.complete && !img.dataset.hasLoadListener) {
                img.dataset.hasLoadListener = "true";
                img.addEventListener("load", () => {
                    this.setupScrollTrigger();
                });
            }
        });

        if (!this.hasInitializedTimeout) {
            this.hasInitializedTimeout = true;
            setTimeout(() => this.setupScrollTrigger(), 500);
        }

        const appElement = document.getElementById("app");
        const maxScroll = appElement ? (appElement.scrollHeight - appElement.clientHeight) : (document.documentElement.scrollHeight - window.innerHeight);
        if (maxScroll <= 0) {
            return;
        }

        const scrollTop = appElement ? appElement.scrollTop : window.scrollY;
        const containerData = containers.map(container => {
            const rect = container.getBoundingClientRect();
            const topEdge = rect.top + scrollTop;
            const bottomEdge = rect.bottom + scrollTop;
            return { topEdge, bottomEdge };
        });

        const numSamples = 100;
        const cameraPositions = [100];
        let cumulativeIntegral = 0;
        const integrals = [0];

        for (let j = 1; j <= numSamples; j++) {
            const y = (j / numSamples) * maxScroll;
            const viewportCenter = y + window.innerHeight / 2;

            let minDistance = Infinity;
            containerData.forEach(data => {
                let dist = 0;
                if (viewportCenter < data.topEdge) {
                    dist = data.topEdge - viewportCenter;
                } else if (viewportCenter > data.bottomEdge) {
                    dist = viewportCenter - data.bottomEdge;
                } else {
                    dist = 0;
                }
                if (dist < minDistance) {
                    minDistance = dist;
                }
            });

            let localSpeed = 1400;
            if (containerData.length > 0) {
                const minThreshold = 150;
                const maxThreshold = 600;
                if (minDistance <= minThreshold) {
                    localSpeed = 350;
                } else if (minDistance >= maxThreshold) {
                    localSpeed = 1400;
                } else {
                    const t = (minDistance - minThreshold) / (maxThreshold - minThreshold);
                    localSpeed = 350 + t * (1400 - 350);
                }
            } else {
                localSpeed = 350;
            }

            cumulativeIntegral += localSpeed * (maxScroll / numSamples);
            integrals.push(cumulativeIntegral);
        }

        const totalIntegral = integrals[numSamples];
        for (let j = 1; j <= numSamples; j++) {
            const cameraY = 100 - (integrals[j] / totalIntegral) * 1050;
            cameraPositions.push(cameraY);
        }

        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: ".content",
                scroller: appElement ? "#app" : window,
                start: 0,
                end: "bottom bottom",
                scrub: true
            }
        });

        this.camera.position.y = 100;

        for (let j = 1; j <= numSamples; j++) {
            const startProgress = (j - 1) / numSamples;
            timeline.to(this.camera.position, {
                y: cameraPositions[j],
                duration: 1 / numSamples,
                ease: "none"
            }, startProgress);
        }

        this.scrollTween = timeline;
    }

    /**
     * Cleans up the scroll controller listeners.
     */
    cleanup() {
        if (this.scrollTween) {
            this.scrollTween.kill();
            this.scrollTween = null;
        }
    }
}
