(function () {
    var savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.setAttribute("data-theme", "light");
    } else if (savedTheme === "dark") {
        document.body.removeAttribute("data-theme");
    } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
        document.body.setAttribute("data-theme", "light");
    }

    if (window.location.pathname === "/game") {
        document.body.classList.add("in-game");
        document.addEventListener("DOMContentLoaded", function () {
            var overlay = document.getElementById("page-transition");
            if (overlay) overlay.classList.add("fade-in");
        });
    }
})();

