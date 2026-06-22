import { el, clear } from '../../core/utils/DOMBuilder.js';
import { LanguageManager } from '../../core/utils/LanguageManager.js';
import { AdminLevelManager } from '../components/admin/AdminLevelManager.js';
import { AdminReportManager } from '../components/admin/AdminReportManager.js';

export class AdminView {
    constructor() {
        this.container = el("div", { className: "view-container" });
        this.currentView = 'levels';
        
        this.sidebarContent = el("div", { id: "sidebar-content", className: "sidebar-content-wrapper" });
        this.detailContainer = el("div", { id: "level-detail-container" });
        
        this.levelManager = new AdminLevelManager(this.sidebarContent, this.detailContainer);
        this.reportManager = new AdminReportManager(this.sidebarContent, this.detailContainer);
    }

    getCss() {
        return ["/asset/css/admin.css"];
    }

    async init() {
        clear(this.container);

        this.container.appendChild(
            el("div", { className: "admin-dashboard" },
                el("aside", { className: "admin-sidebar" },
                    this.renderSidebarToggles(),
                    this.sidebarContent
                ),
                el("main", { className: "admin-main" },
                    this.detailContainer
                )
            )
        );

        if (this.currentView === 'levels') {
            await this.levelManager.init();
        } else {
            await this.reportManager.init();
        }
    }

    renderSidebarToggles() {
        return el("div", { className: "sidebar-toggle-group" },
            el("button", { 
                className: `btn-secondary ${this.currentView === 'levels' ? 'active' : ''}`,
                onclick: () => this.switchView('levels')
            }, LanguageManager.t("admin.title")),
            el("button", { 
                className: `btn-secondary ${this.currentView === 'reports' ? 'active' : ''}`,
                onclick: () => this.switchView('reports')
            }, LanguageManager.t("admin.reportedPosts"))
        );
    }

    switchView(view) {
        this.currentView = view;
        this.init();
    }

    async render() {
        return this.container;
    }

    destroy() {
        if (this.levelManager && typeof this.levelManager.destroy === "function") {
            this.levelManager.destroy();
        }
        if (this.reportManager && typeof this.reportManager.destroy === "function") {
            this.reportManager.destroy();
        }
        this.container.querySelectorAll(".custom-select-container").forEach(el => {
            if (typeof el.destroy === "function") {
                el.destroy();
            }
        });
    }
}
