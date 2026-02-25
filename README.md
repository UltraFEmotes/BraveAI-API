# Brave AI Stream

A Node.js proxy server and polished chat UI that taps directly into Brave Search's undocumented live-streaming AI API. The server bypasses browser CORS restrictions and pipes real-time NDJSON responses to a frontend that renders markdown, inline citations, source chips, and follow-up suggestions.

---

## Features

**Server**
- Proxies requests to Brave's undocumented streaming AI endpoint
- Conversation history injection — sends prior turns as context with each request
- System prompt injection — prepends custom instructions to every query
- Configurable safesearch, language, and country parameters
- Simple CORS handling so the frontend can connect from any local origin

**Chat UI**
- Real-time streaming text with an animated typing indicator
- Full markdown rendering via `marked.js` — headings, bold, italics, code blocks, lists, blockquotes
- Inline citation badges linked to source URLs with favicons
- Sources bar beneath each response showing all cited pages at a glance
- Clickable follow-up question pills for continuing the conversation
- Multi-turn conversation memory — recent turns are sent as context automatically
- Auto-resizing textarea input with Shift+Enter for newlines
- Quick follow-ups toggle in the input bar
- Clear conversation button with confirmation toast
- Welcome screen with starter prompt cards
- Settings panel — configure language, safesearch level, follow-ups, and system prompt at runtime without restarting the server

---

## Getting Started

### Prerequisites

- Node.js (any reasonably recent version)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/brave-ai-stream.git
   cd brave-ai-stream
   ```

2. Install dependencies:

   ```bash
   npm install express cors
   ```

3. Update your Brave session keys (see [Obtaining API Keys](#obtaining-api-keys) below).

4. Start the server:

   ```bash
   node index.js
   ```

5. Open `chat.html` in your browser.

---

## Obtaining API Keys

Brave's streaming endpoint requires a session `id` and `symmetric_key` that are tied to your browser session. These expire periodically and must be refreshed manually.

1. Go to [search.brave.com](https://search.brave.com) and sign in.
2. Open browser Developer Tools and go to the **Network** tab.
3. Perform any AI search query.
4. Find the request to the `stream?` endpoint.
5. Copy the `id` and `symmetric_key` values from the request URL.
6. Paste them into the `BRAVE_AUTH` object in `index.js`:

   ```js
   const BRAVE_AUTH = {
       id: "your_id_here",
       symmetric_key: "your_key_here"
   };
   ```

7. Restart the server.

---

## System Prompt

Brave's API has no native system prompt support. This project handles it by injecting a prefix into every query before it is sent upstream.

You can set a persistent system prompt in two ways:

**Hardcoded in `index.js`** — edit the default value in the destructured request body:

```js
const systemPrompt = req.body.system_prompt || "Your instructions here.";
```

**At runtime via the UI** — open the Settings panel in the chat interface and enter a system prompt. It will be sent with every request for the duration of that session without requiring a server restart.

---

## Conversation History

The frontend automatically tracks the conversation and sends recent turns to the server with each new message. The server injects them into the query as a formatted history block so the AI has context for follow-up questions. The number of turns retained is controlled by `MAX_HISTORY_TURNS` in `chat.html` (default: 3 turns).

---

## API Reference

The server exposes a single endpoint.

### `POST /proxy-stream`

Streams an NDJSON response from Brave's AI endpoint.

**Request body:**

| Field | Type | Default | Description |
|---|---|---|---|
| `q` | string | required | The user's query |
| `system_prompt` | string | `""` | Instructions prepended to the query |
| `history` | array | `[]` | Prior conversation turns `[{ role, content }]` |
| `language` | string | `"en"` | Response language code |
| `safesearch` | string | `"moderate"` | `"off"`, `"moderate"`, or `"strict"` |
| `followups` | boolean | `true` | Whether to request follow-up suggestions |

**Response:** chunked NDJSON stream. Each line is a JSON object with a `type` field.

| Event type | Description |
|---|---|
| `text_delta` | Incremental text chunk. Contains a `delta` string field. |
| `augment_with_inline_citation` | A citation. Contains `url`, `title`, and `favicon`. |
| `followups` | Suggested follow-up questions. Contains a `followups` string array. |

---

## Usage Examples

### cURL

```bash
curl -s -X POST http://localhost:3000/proxy-stream \
  -H "Content-Type: application/json" \
  -d '{"q": "Explain black holes"}' \
  | while IFS= read -r line; do
      echo "$line" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('delta',''), end='')" 2>/dev/null
    done
```

### Python

```python
import requests
import json

url = "http://localhost:3000/proxy-stream"
payload = {"q": "What is quantum computing?"}

with requests.post(url, json=payload, stream=True) as r:
    for line in r.iter_lines():
        if line:
            data = json.loads(line.decode("utf-8"))
            if data.get("type") == "text_delta":
                print(data["delta"], end="", flush=True)
```

### JavaScript

```js
const response = await fetch("http://localhost:3000/proxy-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: "Hello!" })
});

const reader = response.body.getReader();
const decoder = new TextDecoder("utf-8");

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "text_delta") process.stdout.write(event.delta);
    }
}
```

---

## Project Structure

```
brave-ai-stream/
├── index.js       — Express proxy server
└── chat.html      — Chat UI (self-contained, no build step)
```

---

## Disclaimer

This project uses an undocumented, unofficial API from Brave Search. It is intended for personal and educational use only. Session keys expire regularly and must be manually refreshed. Do not use in production or for any commercial purpose. This project is not affiliated with or endorsed by Brave Software.
