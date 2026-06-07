/**
 * Creates an HTML or SVG element with given attributes and children.
 * @param {string} tag - The tag name of the element to create.
 * @param {Object} [attributes={}] - An object containing attributes and event listeners to apply.
 * @param {...(Node|string|number|Array)} children - Child elements, text nodes, or arrays of children.
 * @returns {Element} The created DOM element.
 */
export function el(tag, attributes = {}, ...children) {
    const isSVG = ["svg", "path", "circle", "line", "polyline", "rect", "ellipse", "polygon", "g", "filter", "feTurbulence", "feDisplacementMap", "animate"].includes(tag);
    const element = isSVG 
        ? document.createElementNS("http://www.w3.org/2000/svg", tag)
        : document.createElement(tag);

    for (const [key, value] of Object.entries(attributes)) {
        if (key.startsWith("on") && typeof value === "function") {
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else if (key === "className") {
            if (isSVG) element.setAttribute("class", value);
            else element.className = value;
        } else if (key === "dataset") {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else if (key === "value" && (tag === "input" || tag === "textarea" || tag === "select")) {
            element.value = value;
        } else {
            if (value === true) element.setAttribute(key, "");
            else if (value !== false && value != null)
                element.setAttribute(key, value);
        }
    }

    const appendChild = (child) => {
        if (child == null || child === false) return;
        if (typeof child === "string" || typeof child === "number") {
            element.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    };

    children.flat(Infinity).forEach(appendChild);

    return element;
}

/**
 * Removes all child nodes from a given element.
 * @param {Element} element - The element to clear.
 */
export function clear(element) {
    if (!element) return;
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
