export default class Navbar {
    static getHtml() {
        return `
            <nav>
                <a href="/" data-link>Home</a> |
                <a href="/hub" data-link>Community Hub</a>
            </nav>
        `;
    }

    static render() {
        const container = document.getElementById("nav-container");
        if (container) {
            container.innerHTML = this.getHtml();
        }
    }
}
