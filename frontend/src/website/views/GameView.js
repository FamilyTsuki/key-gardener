import AbstractView from "../../core/views/AbstractView.js";
import { AuthService } from "../../core/services/auth.service.js";
import { el } from "../../core/utils/DOMBuilder.js";
import { FlashMessageManager } from "../../core/utils/FlashMessageManager.js";
import { GameEngine } from "../../game/engine/GameEngine.js";

export default class GameView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Game - Keyboard Survivor");
        this.engine = null;
    }

    async render() {
        this.canvas = el("canvas", { className: "game-canvas" });
        return el("div", { className: "game-container" }, this.canvas);
    }

    async init() {
        this.engine = new GameEngine(this.canvas);
        
        this.engine.addEntity({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            radius: 50,
            update: function(dt) {
            },
            draw: function(ctx) {
                ctx.fillStyle = "#3ff312";
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        this.engine.start();
    }

    destroy() {
        if (this.engine) {
            this.engine.stop();
        }
    }

    getCss() {
        return ["/asset/css/game.css"];
    }
}

