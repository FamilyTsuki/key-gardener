import { el } from "../utils/DOMBuilder.js";

/**
 * Base class for all application views.
 */
export default class AbstractView {
    /**
     * Initializes the view with routing parameters.
     * @param {Object} params - The routing parameters.
     */
    constructor(params) {
        this.params = params;
    }

    /**
     * Sets the document title.
     * @param {string} title - The title for the page.
     */
    setTitle(title) {
        const gameName = window.GAME_NAME || "Keyboard Survivor";
        document.title = title.replace(/Keyboard Survivor/g, gameName);
    }

    /**
     * Sets the meta description for SEO.
     * @param {string} description - The description for the page.
     */
    setMetaDescription(description) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = "description";
            document.head.appendChild(meta);
        }
        meta.content = description;
    }

    /**
     * Renders the view's HTML content.
     * @returns {Promise<Element>} A promise resolving to the view's DOM element.
     */
    async render() {
        return el("div", {}, "Empty View");
    }

    /**
     * Retrieves an array of CSS file paths required by this view.
     * @returns {Array<string>} An array of CSS paths.
     */
    getCss() {
        return [];
    }

    /**
     * Optional initialization method called after the view is rendered and inserted into the DOM.
     * @returns {Promise<void>}
     */
    async init() {}

    /**
     * Cleans up any resources or event listeners before the view is destroyed.
     */
    destroy() {
    }
}
