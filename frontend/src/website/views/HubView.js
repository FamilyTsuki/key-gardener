import AbstractView from "./AbstractView.js";
import { el } from "../utils/DOMBuilder.js";

export default class HubView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Community Hub - Keyboard Survivor");
    }

    async render() {
        this.postsContainer = el("div", { id: "posts-container" },
            el("p", {}, "Loading posts...")
        );

        return el("div", {},
            el("h1", {}, "Community Hub"),
            el("p", {}, "Welcome to the community! Share your progress and interact with other players."),
            this.postsContainer
        );
    }

    async init() {
        if (!this.postsContainer) return;

        try {
            const response = await fetch('/api/posts');
            const data = await response.json();

            this.postsContainer.innerHTML = "";

            if (!data.success || data.posts.length === 0) {
                this.postsContainer.appendChild(el("p", {}, "Aucun post pour le moment. Soyez le premier !"));
                return;
            }

            data.posts.forEach((post) => {
                this.postsContainer.appendChild(
                    el("div", { className: "hub-post" },
                        el("strong", {}, post.username + ": "),
                        el("span", {}, post.content)
                    )
                );
            });
        } catch (error) {
            console.error("Erreur lors du chargement des posts:", error);
            this.postsContainer.innerHTML = "";
            this.postsContainer.appendChild(el("p", {}, "Erreur lors du chargement des messages communautaires."));
        }
    }

    getCss() {
        return ["/asset/css/hub.css"];
    }
}
