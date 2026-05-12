import { el } from "../utils/DOMBuilder.js";

export default class AbstractView {
    constructor(params) {
        this.params = params;
    }

    setTitle(title) {
        document.title = title;
    }

    async render() {
        return el("div", {}, "Empty View");
    }

    getCss() {
        return [];
    }

    async init() {}
}
