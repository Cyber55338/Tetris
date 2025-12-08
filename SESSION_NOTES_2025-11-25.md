# Session Notes - November 25, 2025

## Project: IDEA Engine - Chat Mode Feature (Flux-style)

### Overview
Added a new "Chat" mode to the IDEA Engine node editor, inspired by the Flux app (https://github.com/paradigmxyz/flux). This creates a conversational AI tree interface with System, User, and GPT nodes.

---

## Key Files Modified

### Core Chat Files
| File | Purpose |
|------|---------|
| `chat.js` | Main chat mode logic - mode switching, panel UI, node operations |
| `chat-api.js` | Claude API integration with temperature parameter |

### Rendering Files
| File | Purpose |
|------|---------|
| `canvas.js` | Added `drawChatNode()` for Flux-style vertical tree nodes |
| `connections.js` | Added `drawVerticalConnection()` for top-to-bottom bezier curves |

### UI Files
| File | Purpose |
|------|---------|
| `styles.css` | Chat mode styles - wider panel, editable messages, sliders |
| `index.html` | Chat header/section in sidebar, script tags |
| `nodes.js` | SystemMessage, UserMessage, GPTMessage node definitions |

---

## Architecture Decisions

1. **Vertical Tree Layout**: Nodes connect from bottom (output) to top (input), not side-to-side
2. **Properties Panel**: Doubles to 500px width in chat mode, shows conversation with inline editing
3. **Auto-created Starter**: System→User nodes created automatically when entering chat mode
4. **GPT Auto-generated**: GPT nodes only appear when user clicks "Generate Response"
5. **Multiple Responses**: Support for 1-10 parallel GPT responses (spread 180px horizontally)

---

## Node Types (in `nodes.js`)

```javascript
'SystemMessage': { color: '#5F8AF7', category: 'chat' }  // Blue - no input
'UserMessage':   { color: '#A9ABAE', category: 'chat' }  // Gray
'GPTMessage':    { color: '#619F83', category: 'chat' }  // Green - no output
```

---

## Key Functions

### chat.js
- `enterChatMode()` / `exitChatMode()` - Mode switching with state preservation
- `renderConversation()` - Displays editable message lineage in properties panel
- `generateGPTResponse()` - Creates GPT nodes and calls API
- `createStarterNodes()` - Auto-creates System→User when canvas is empty
- `getNodeLineage(nodeId)` - Traverses tree to get conversation path

### canvas.js
- `drawChatNode(ctx, node)` - Renders Flux-style nodes (150px wide, vertical handles)

### connections.js
- `drawVerticalConnection(ctx, start, end, color)` - Vertical bezier curves

---

## Flux Dimensions Reference

| Element | Value |
|---------|-------|
| Node width | 150px |
| Node min-height | 38px |
| Vertical spacing | 100px |
| Horizontal sibling spacing | 180px |
| Border radius | 6px |
| Selection glow | #e73324 (orange) |
| Properties panel width | 500px |

---

## Settings (stored in localStorage)

```javascript
// Key: 'idea-engine-chat-settings'
{
    temperature: 0.7,    // 0 - 1.25, step 0.01
    numResponses: 1      // 1 - 10
}

// Key: 'idea-engine-chat-tree'
{
    nodes: [...],        // Saved chat tree
    connections: [...]
}

// Key: 'idea-engine-api-key'
// Claude API key
```

---

## CSS Classes

```css
body.chat-mode-active           /* Triggers wider panel */
.chat-panel-container           /* Main panel wrapper */
.chat-conversation              /* Scrollable message area */
.chat-message.system/user/gpt   /* Message containers */
.chat-message-textarea          /* Editable text (transparent) */
.chat-generate-btn              /* Generate Response button */
.chat-options                   /* Sliders section */
.chat-slider-group              /* Individual slider */
```

---

## Next Steps / TODO

1. **Streaming responses** - Show text as it generates (not all at once)
2. **Branch navigation** - Click on canvas node to select that branch
3. **Delete nodes** - Right-click context menu for chat nodes
4. **Export conversation** - Save chat as markdown/JSON
5. **Model selection** - Dropdown to choose Claude model
6. **Keyboard shortcuts** - Ctrl+Enter to generate

---

## Testing

Server: `node static-server.js` → http://localhost:8888/

1. Click "Chat" in left sidebar
2. System and User nodes auto-created
3. Edit System prompt in properties panel
4. Type user message
5. Adjust temperature/responses sliders
6. Click "Generate GPT response"
7. GPT node(s) appear on canvas
8. Select nodes to see conversation path

---

## Reference Repository

Flux: https://github.com/paradigmxyz/flux
- Key files studied: `App.tsx`, `Prompt.tsx`, `fluxNode.ts`, `color.ts`
- Uses ReactFlow for canvas, Chakra UI for components
- Our implementation uses vanilla JS with HTML5 Canvas
