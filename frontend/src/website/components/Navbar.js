export default class Navbar {
    static getHtml() {
        return `
            <nav>
                <div class="nav-page">
                    <a href="/" data-link>Home</a>
                    <a href="/hub" data-link>Community Hub</a>
                </div>
                <a href="/login" data-link class="login">Login</a>
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
