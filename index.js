const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

const BRAVE_AUTH = {
    id: "08c72b0ff3497d44280d6e0e6f523bb46b9b",
    symmetric_key: "ZwHmuY9BW-9k44lNB_w0vPbmSJRz7PhdmIfj_ilAey4"
};

app.use(cors());
app.use(express.json());

app.post('/proxy-stream', async (req, res) => {
    const userQuery = req.body.q;
    const systemPrompt = req.body.system_prompt || "";
    const enableFollowups = req.body.followups !== false;
    const language = req.body.language || "en";
    const safesearch = req.body.safesearch || "moderate";
    const history = req.body.history || [];

    if (!userQuery) return res.status(400).send("Missing query parameter 'q'");

    let finalQuery = "";

    if (systemPrompt.trim() !== "") {
        finalQuery += `[System Instructions: ${systemPrompt}]\n\n`;
    }

    if (history.length > 0) {
        finalQuery += `[Conversation History]\n`;
        history.forEach(msg => {
            finalQuery += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
        finalQuery += `\n[Current Query]\nUser: ${userQuery}`;
    } else {
        finalQuery += userQuery;
    }

    const braveUrl = `https://search.brave.com/api/tap/v1/stream?language=${language}&country=us&ui_lang=en-us&safesearch=${safesearch}&force_safesearch=0&units_of_measurement=metric&use_location=0&premium_cookie_name=__Secure-sku%23brave-search-premium&id=${BRAVE_AUTH.id}&symmetric_key=${BRAVE_AUTH.symmetric_key}&enable_followups=${enableFollowups}&query=${encodeURIComponent(finalQuery)}`;

    try {
        const response = await fetch(braveUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).send(`Brave API Error: ${response.statusText}`);
        }

        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});