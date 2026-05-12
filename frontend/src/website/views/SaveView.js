import AbstractView from "./AbstractView.js";
import { el } from "../utils/DOMBuilder.js";

export default class SaveView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Save - Keyboard Survivor");
    }

    async render() {
        return el("div", { className: "save-container" },
            el("h2", {}, "Save"),
            el("div", { className: "save-content save-1" }, "Save 1"),
            el("div", { className: "save-content save-2" }, "Save 2"),
            el("div", { className: "save-content save-3" }, "Save 3"),
        );
    }

    getCss() {
        return ["/asset/css/save.css"];
    }
}