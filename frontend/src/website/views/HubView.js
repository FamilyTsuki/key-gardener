import AbstractView from "./AbstractView.js";

export default class HubView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Community Hub - Keyboard Survivor");
    }

    async getHtml() {
        return `
            <h1>Community Hub</h1>
            <p>Welcome to the community! Share your progress and interact with other players.</p>
            <div id="posts-container">
                <p>Loading posts...</p>
            </div>
        `;
    }

    async init() {
        const container = document.getElementById("posts-container");

        try {
            const response = await fetch('/api/posts');
            const data = await response.json();

            container.innerHTML = "";

            if (!data.success || data.posts.length === 0) {
                container.innerHTML = "<p>Aucun post pour le moment. Soyez le premier !</p>";
                return;
            }

            data.posts.forEach((post) => {
                const postEl = document.createElement("div");
                postEl.className = "hub-post";

                const userEl = document.createElement("strong");
                userEl.textContent = post.username + ": ";

                const textEl = document.createElement("span");
                textEl.textContent = post.content;

                postEl.appendChild(userEl);
                postEl.appendChild(textEl);
                container.appendChild(postEl);
            });
        } catch (error) {
            console.error("Erreur lors du chargement des posts:", error);
            container.innerHTML = "<p>Erreur lors du chargement des messages communautaires.</p>";
        }
    }

    getCss() {
        return ["/asset/css/hub.css"];
    }
}

