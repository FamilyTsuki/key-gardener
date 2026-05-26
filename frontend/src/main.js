/**
 * Main application entry point.
 * Initializes the UI and sets up the router.
 */
import Router from "./core/Router.js";
import Navbar from "./website/components/Navbar.js";

console.log("Website UI initialized");

Navbar.render();

const appRouter = new Router();
