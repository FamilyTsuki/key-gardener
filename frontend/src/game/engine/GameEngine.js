export class GameEngine {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d");
        
        this.isRunning = false;
        this.lastTime = 0;
        
        this.entities = [];
        this.systems = [];

        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.isRunning = false;
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    addSystem(system) {
        this.systems.push(system);
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(deltaTime) {
        for (const system of this.systems) {
            if (typeof system.update === "function") {
                system.update(this.entities, deltaTime);
            }
        }

        for (const entity of this.entities) {
            if (typeof entity.update === "function") {
                entity.update(deltaTime);
            }
        }
    }

    render() {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const entity of this.entities) {
            if (typeof entity.draw === "function") {
                entity.draw(this.ctx);
            }
        }
    }
}
