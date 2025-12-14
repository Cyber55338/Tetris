# Session Notes - December 4, 2025

## Project: IDEA Engine - Lottie Animations & Architecture Discussion

---

## What Was Implemented This Session

### 1. Download Button Added to Design Flow
- Added "Download" button next to "Send" in toolbar
- Triggers `workflowManager.saveWorkflow()` to export workflow as JSON

**Files Modified:**
- `index.html` - Added button HTML
- `comfyui.js` - Added click handler

### 2. Simulation Flow Bug Fixed
- **Problem:** Clicking Simulate showed ALL nodes from ALL disconnected flows
- **Solution:** Added `getConnectedComponent()` to find nodes in selected flow only
- Now user must select a node → Simulate only shows that connected flow

**Files Modified:**
- `connections.js` - Added `getConnectedComponent()` method
- `comfyui.js` - Modified `showSmartWatchSimulator()` to filter by selected flow

### 3. Lottie Animations - Text Editor (Journals Mode)
- Added Lottie animations that play when opening nodes in text editor
- Animations display in header next to node type label
- Size: 56px

**Node → Animation Mapping:**
| Node | Animation File |
|------|----------------|
| Thought | Tetrahedron.json |
| Imagination | Octahedron.json |
| Action | Dodecahedron.json |
| Belief | Icosahedron.json |
| Emotion | Cube.json |
| Dreams | dreams.json |
| Goals | goals.json |
| Rules | rules.json |
| Memories | memories.json |
| Questions | questions.json |
| Danger | dangers.json |
| Expressions | heart.json |
| Problem | question.json |
| Instructions | idea.json |

**Files Modified:**
- `comfyui.js` - `nodeAnimations` mapping in `openNodeTextEditor()`
- `styles.css` - `.text-editor-lottie` styles (56px size)

### 4. Canvas Mode Lottie Animations
- **Design Flow mode:** Spyglass animation (top-left corner)
- **Chat mode:** Diamond animation (top-left corner)

**Files Modified:**
- `index.html` - Added `#canvas-mode-lottie` container
- `styles.css` - `.canvas-mode-lottie` positioning
- `comfyui.js` - Load spyglass on app init
- `chat.js` - Load diamond on enterChatMode, spyglass on exitChatMode

### 5. Lottie Animations on Canvas Nodes
- Animations display directly on node headers in canvas
- DOM overlay approach - positioned divs over canvas
- Scales with zoom, moves with pan/drag
- Size: 24px inside 28px node header

**Files Modified:**
- `index.html` - Added `#canvas-lottie-overlay` container
- `styles.css` - `.canvas-lottie-overlay`, `.node-lottie` styles
- `canvas.js` - Added `nodeAnimationPaths`, `updateNodeLottieAnimations()`, `clearNodeLottieAnimations()`
- `canvas.js` - Modified `drawNode()` to offset title text for animation space

### 6. Sidebar Lottie Animations
- Animations next to node names in sidebar lists
- Both Journals mode and Design Flow mode
- Size: 20px

**Files Modified:**
- `journals.js` - Added `sidebarNodeAnimations`, modified `createDraggableNodeItem()`
- `comfyui.js` - Added `sidebarAnimations` in `setupNodeLibrary()`
- `styles.css` - `.sidebar-node-lottie` styles, updated `.node-item` to flex

### 7. Asset Files Copied
Copied from `clone/assets/` to `Tetris/assets/`:
- Tetrahedron.json, Octahedron.json, Dodecahedron.json, Icosahedron.json, Cube.json
- dreams.json, goals.json, rules.json, memories.json, questions.json, dangers.json
- heart.json, question.json, idea.json

---

## Architecture Discussion

### Question: Can this be published as beta in HTML?
**Answer: YES**

- Pure vanilla JS, HTML5 Canvas, CSS - no build step required
- All client-side code - runs directly in browser
- Can host on GitHub Pages, Netlify, Vercel, etc.
- LocalStorage for data persistence

**For public beta needs:**
- API proxy (serverless function) to hide Claude API key
- HTTPS (free via Cloudflare/Netlify)

### Question: Can IPFS and NFT minting be added?
**Answer: YES**

- Ethers.js/Web3.js work via CDN - no Node.js needed
- IPFS pinning via REST APIs (Pinata, Web3.Storage)
- Wallet connection is browser-native
- ~200-300 lines of JS for full Web3 integration

### Question: Is vanilla JS safer than Node.js/frameworks?
**Answer: Generally YES for supply chain security**

- 0 dependencies vs 500-2000+ npm packages
- No transitive dependency vulnerabilities
- No build-time injection attacks
- Code is auditable - what you see is what runs

### Question: Cons of vanilla JS?
- No hot module reload
- No TypeScript (without build step)
- Harder to scale with large team (5+ devs)
- No automatic code splitting/tree-shaking
- Fewer Stack Overflow answers for patterns

### MetaCognitive Flow Analysis Result
**Recommendation: Ship vanilla JS now**

- Opportunity cost of rewriting: 3-6 months delay
- Web3 features can be added incrementally (~200-300 lines)
- Rewrite decision is procrastination disguised as professionalism
- Let problems emerge before solving them

---

## Files Summary

| File | Changes |
|------|---------|
| `index.html` | Download button, canvas-mode-lottie, canvas-lottie-overlay |
| `styles.css` | Lottie styles for text-editor, canvas-mode, node-lottie, sidebar-node-lottie |
| `comfyui.js` | Download handler, simulation flow fix, nodeAnimations, sidebarAnimations, canvas mode lottie |
| `canvas.js` | nodeAnimationPaths, updateNodeLottieAnimations(), title offset for animations |
| `connections.js` | getConnectedComponent() |
| `chat.js` | Diamond/spyglass animations on mode switch |
| `journals.js` | sidebarNodeAnimations, createDraggableNodeItem() with Lottie |

---

## Created Files

- `assets/preview.html` - Lottie animation preview page (served on port 8889)

---

## Testing

- Static server: `node static-server.js` → http://localhost:8888/
- Assets preview: `python -m http.server 8889` in assets folder → http://localhost:8889/preview.html
- Playwright used for visual testing

---

## Next Session TODO

- [ ] Consider adding Web3 wallet connect button
- [ ] IPFS export functionality
- [ ] NFT minting integration
- [ ] Deploy beta to Netlify/Vercel
- [ ] Set up serverless API proxy for Claude

---

## Key Decisions Made

1. **Ship vanilla JS** - No framework rewrite needed
2. **14 nodes now have Lottie animations** - Full coverage
3. **Simulation respects flow selection** - Bug fixed
4. **DOM overlay for canvas animations** - Works with pan/zoom
