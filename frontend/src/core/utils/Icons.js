import { el } from "./DOMBuilder.js";

/**
 * Object containing reusable SVG icons.
 */
export const Icons = {
    /**
     * Creates an SVG close (X) icon.
     * @param {string} [className=""] - Additional CSS class for the icon.
     * @returns {Element} The SVG element for the icon.
     */
    close(className = "", width = "24", height = "24") {
        return el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            className: className,
            width: width,
            height: height,
            fill: "currentColor"
        }, 
        el("path", { d: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" })
        );
    },

    closeLine(className = "", width = "20", height = "20") {
        return el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: width,
            height: height,
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            className: className
        },
            el("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            el("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
        );
    },

    plus(className = "", width = "24", height = "24") {
        return el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: width,
            height: height,
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "4",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            className: className
        },
            el("line", { x1: "12", y1: "4", x2: "12", y2: "20" }),
            el("line", { x1: "4", y1: "12", x2: "20", y2: "12" })
        );
    },

    refresh(className = "", width = "16", height = "16") {
        return el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: width,
            height: height,
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            className: className
        },
            el("polyline", { points: "23 4 23 10 17 10" }),
            el("polyline", { points: "1 20 1 14 7 14" }),
            el("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
        );
    },

    enter(className = "", width = "40", height = "30") {
        return el("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: width,
            height: height,
            fill: "none",
            stroke: "white",
            "stroke-width": "3",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            className: className
        },
            el("polyline", { points: "9 10 4 15 9 20" }),
            el("path", { d: "M20 4v7a4 4 0 0 1-4 4H4" })
        );
    },

    skillTreeLines(containerW, containerH, isUnlockedFn) {
        const px = (pctX) => (pctX / 100) * containerW;
        const py = (pctY) => (pctY / 100) * containerH;

        const paths = [];

        paths.push(`
<defs>
  <linearGradient id="grad-attack" x1="0%" y1="100%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#ef4444"/>
  </linearGradient>
  <linearGradient id="grad-defense" x1="100%" y1="100%" x2="0%" y2="0%">
    <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#10b981"/>
  </linearGradient>
  <linearGradient id="grad-utility" x1="50%" y1="100%" x2="50%" y2="0%">
    <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#ffd700"/>
  </linearGradient>

  <filter id="glow-attack" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <filter id="glow-defense" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <filter id="glow-utility" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>
        `);

        const tx0 = px(50), ty0 = py(90);
        const tx1 = px(50), ty1 = py(82);

        paths.push(`<path d="M ${tx0} ${ty0} L ${tx1} ${ty1}" stroke="#475569" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>`);

        const segments = [
            {
                destId: "spark",
                color: "url(#grad-attack)",
                glowColor: "#ef4444",
                filter: "url(#glow-attack)",
                d: `M ${tx1} ${ty1} C ${px(50)} ${py(77)}, ${px(57)} ${py(74)}, ${px(62)} ${py(72)}`
            },
            {
                destId: "fireball",
                color: "#ef4444",
                glowColor: "#ef4444",
                filter: "url(#glow-attack)",
                d: `M ${px(62)} ${py(72)} C ${px(67)} ${py(70)}, ${px(70)} ${py(58)}, ${px(73)} ${py(48)}`
            },
            {
                destId: "shield",
                color: "url(#grad-defense)",
                glowColor: "#10b981",
                filter: "url(#glow-defense)",
                d: `M ${tx1} ${ty1} C ${px(50)} ${py(77)}, ${px(43)} ${py(74)}, ${px(38)} ${py(72)}`
            },
            {
                destId: "firecircle",
                color: "#10b981",
                glowColor: "#10b981",
                filter: "url(#glow-defense)",
                d: `M ${px(38)} ${py(72)} C ${px(33)} ${py(70)}, ${px(30)} ${py(58)}, ${px(27)} ${py(48)}`
            },
            {
                destId: "heal",
                color: "url(#grad-utility)",
                glowColor: "#ffd700",
                filter: "url(#glow-utility)",
                d: `M ${tx1} ${ty1} C ${px(48)} ${py(70)}, ${px(52)} ${py(55)}, ${px(50)} ${py(40)}`
            }
        ];

        for (const seg of segments) {
            const unlocked = isUnlockedFn(seg.destId);
            if (unlocked) {
                paths.push(`<path d="${seg.d}" stroke="${seg.glowColor}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.15" filter="${seg.filter}"/>`);
                paths.push(`<path d="${seg.d}" stroke="${seg.color}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9"/>`);
            } else {
                paths.push(`<path d="${seg.d}" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,5" stroke-linecap="round" fill="none" opacity="0.4"/>`);
            }
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" class="skill-tree-svg-lines">${paths.join("")}</svg>`;
    }
};
