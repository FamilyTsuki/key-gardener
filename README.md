# Keyboard Survivor: Tentacle Siege

## Features
- **3D Typing Game**: Explore and fight using your keyboard as the primary controller.
- **User Space**: Manage your game saves and profile.
- **Community Hub**: Share progress and interact with other players.

## Tech Stack
- **Frontend**: Three.js, Vanilla JS, HTML5, CSS3.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL.

## Getting Started

### Prerequisites
- Node.js (v14+)
- PostgreSQL

<button id="logout-btn" class="nav-logout">Logout</button>

static addListeners() {
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
logoutBtn.addEventListener("click", () => {
AuthService.logout();
window.location.href = "/";
});
}
}
