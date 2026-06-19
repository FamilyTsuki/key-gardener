import { el } from "../../core/utils/DOMBuilder.js";

/**
 * Creates a custom stylized select dropdown.
 * 
 * @param {Array<{value: string, label: string}>} options - The options for the dropdown.
 * @param {string} selectedValue - The initially selected value.
 * @param {Function} onChange - Callback function triggered when a new option is selected.
 * @param {string} className - Optional additional CSS classes.
 * @returns {HTMLElement} The custom select DOM element.
 */
export function createCustomSelect(options, selectedValue, onChange, className = "") {
    let selectedOption = options.find(opt => opt.value === selectedValue) || options[0];

    const displaySpan = el("span", { className: "custom-select-display" }, selectedOption.label);
    const arrowSpan = el("span", { className: "custom-select-arrow" }, "▼");
    
    const trigger = el("div", { className: "custom-select-trigger" }, displaySpan, arrowSpan);
    
    const optionsContainer = el("div", { className: "custom-select-options" });
    
    const container = el("div", { 
        className: `custom-select-container ${className}`,
        tabIndex: 0
    }, trigger, optionsContainer);

    options.forEach(opt => {
        const optEl = el("div", { 
            className: `custom-option ${opt.value === selectedValue ? "selected" : ""}`,
            dataset: { value: opt.value }
        }, opt.label);
        
        optEl.onclick = (e) => {
            e.stopPropagation();
            displaySpan.textContent = opt.label;
            
            Array.from(optionsContainer.children).forEach(child => child.classList.remove("selected"));
            optEl.classList.add("selected");
            
            container.classList.remove("open");
            
            if (selectedOption.value !== opt.value) {
                selectedOption = opt;
                if (onChange) onChange(opt.value);
                
                const changeEvent = new Event("change", { bubbles: true });
                container.dispatchEvent(changeEvent);
            }
        };
        optionsContainer.appendChild(optEl);
    });

    trigger.onclick = () => {
        container.classList.toggle("open");
    };

    document.addEventListener("click", (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove("open");
        }
    });

    container.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            container.classList.toggle("open");
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const currentIndex = options.findIndex(o => o.value === selectedOption.value);
            let nextIndex;
            if (e.key === "ArrowRight") {
                nextIndex = (currentIndex + 1) % options.length;
            } else {
                nextIndex = (currentIndex - 1 + options.length) % options.length;
            }
            
            const nextOpt = options[nextIndex];
            displaySpan.textContent = nextOpt.label;
            
            Array.from(optionsContainer.children).forEach(child => child.classList.remove("selected"));
            if (optionsContainer.children[nextIndex]) {
                optionsContainer.children[nextIndex].classList.add("selected");
            }
            
            if (selectedOption.value !== nextOpt.value) {
                selectedOption = nextOpt;
                if (onChange) onChange(nextOpt.value);
                container.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
    });

    Object.defineProperty(container, 'value', {
        get: () => selectedOption.value,
        set: (newValue) => {
            const opt = options.find(o => o.value === newValue);
            if (opt) {
                selectedOption = opt;
                displaySpan.textContent = opt.label;
                Array.from(optionsContainer.children).forEach(child => {
                    if (child.dataset.value === newValue) {
                        child.classList.add("selected");
                    } else {
                        child.classList.remove("selected");
                    }
                });
            }
        }
    });

    return container;
}
