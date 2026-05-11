import AbstractView from "./AbstractView.js";
import { TunnelAnimation } from "../components/TunnelAnimation.js";

export default class HomeView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Home - Keyboard Survivor");
    }

    async getHtml() {
        return `
            <canvas id="bg-canvas"></canvas>
            <div id="tunnel-container"></div>
            <div class="content">
                <div class="home-contaner-1">
                    <div class="home-presantation-container">
                        <h1 class="home-title">Keyboard Survivor</h1>
                        <p class="home-description">Gamify your typing skills. Explore and fight using your keyboard as the primary controller.</p>
                        <p>
                            <a href="/game" data-link class="start-btn">Start Game</a>
                        </p>
                    </div>
                    <img src="/asset/img/home.jpg" alt="Game Image" class="first-home-img">
                </div>

                <div class="home-contaner-2">
                    <img src="/asset/img/home.jpg" alt="Game Image" class="first-home-img">
                    <div class="home-info-container">
                        <h2 class="home-title">why</h2>
                        <p class="home-info">Discover the unique gameplay experience that combines typing challenges with exciting adventures.</p>
                    </div>
                
                </div>

                <div class="home-footer">
                    
                    <p class="home-footer-info">Contact us: <a href="mailto:info@keyboard-survivor.com">info@keyboard-survivor.com</a></p>
                    <p class="home-footer-info">Follow us on social media:
                        <a href="https://www.facebook.com/keyboardsurvivor" target="_blank">Facebook</a>,
                        <a href="https://www.twitter.com/keyboardsurvivor" target="_blank">Twitter</a>,
                        <a href="https://www.instagram.com/keyboardsurvivor" target="_blank">Instagram</a>
                    </p>
                    <p class="footer-thx">Special Thank</p>
                    <p class="home-footer-info">to all our supporters and players who make Keyboard Survivor possible!</p>
                    <p class="home-footer-info">&copy; 2024 Keyboard Survivor. All rights reserved.</p>
                </div>
            </div>
            
        `;
    }

    async init() {
        const tunnelContainer = document.getElementById("tunnel-container");
        if (tunnelContainer) {
            TunnelAnimation.init(tunnelContainer);
        }
    }

    getCss() {
        return ["/asset/css/home.css"];
    }
}
