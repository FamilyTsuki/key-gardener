const fs = require("fs");
const path = require("path");
const vision = require("@google-cloud/vision");

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
        __dirname,
        "../../../",
        process.env.GOOGLE_APPLICATION_CREDENTIALS
    );
}

class ImageModerator {
    constructor() {
        try {
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                this.visionClient = new vision.ImageAnnotatorClient();
            }
        } catch (error) {
            console.error("Failed to initialize Google Vision client:", error);
        }
    }

    /**
     * Analyzes the image.
     * @param {any} imagePath - The imagePath.
     */
    async analyzeImage(imagePath) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            try {
                if (fs.existsSync(imagePath)) {
                    const fileBuffer = fs.readFileSync(imagePath);
                    const base64Image = fileBuffer.toString("base64");
                    const ext = path.extname(imagePath).toLowerCase().replace(".", "");
                    const mimeType = ext === "png" ? "image/png" : "image/jpeg";

                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Analyze this image very strictly for any inappropriate content (including adult content, nudity, suggestive poses, gore, violence, weapons, hate symbols, or offensive gestures). Answer with exactly 'true' if the image contains ANY potentially inappropriate or unsafe content, or 'false' if it is completely safe for all audiences."
                                        },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                url: `data:${mimeType};base64,${base64Image}`
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens: 5
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.choices && data.choices[0]) {
                            const resultText = data.choices[0].message.content.trim().toLowerCase();
                            return resultText.includes("true");
                        }
                    }
                }
            } catch (error) {
                console.error("OpenAI image moderation failed:", error);
            }
        }

        if (this.visionClient) {
            const [result] = await this.visionClient.safeSearchDetection(imagePath);
            return result.safeSearchAnnotation;
        }

        return false;
    }

    /**
     * Is the image inappropriate.
     * @param {any} safeSearchData - The safeSearchData.
     */
    isImageInappropriate(safeSearchData) {
        if (typeof safeSearchData === "boolean") {
            return safeSearchData;
        }

        if (!safeSearchData) {
            return false;
        }

        const inappropriateLikelihoods = ["LIKELY", "VERY_LIKELY"];
        return (
            inappropriateLikelihoods.includes(safeSearchData.adult) ||
            inappropriateLikelihoods.includes(safeSearchData.violence)
        );
    }
}

module.exports = new ImageModerator();
