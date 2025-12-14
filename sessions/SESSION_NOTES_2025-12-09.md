# Session Notes - 2025-12-09

## Summary
Focused on improving the Journals mode annotation system and extending annotations to Design Flow mode.

---

## Completed Tasks

### 1. Annotation Copy/Paste (Ctrl+C/V)
- Added `copySelectedAnnotations()` and `pasteAnnotations()` methods to `AnnotationManager`
- Modified `onKeyDown()` in `comfyui.js` to handle annotation copy/paste
- Pastes at mouse position or canvas center

### 2. Journals Mode Toolbar Buttons
- Added "Text" and "Arrow" buttons in Journals mode header
- Hidden Save/Clear/Load/Download buttons in Journals mode
- Buttons dynamically created/removed on mode enter/exit
- Functions: `createJournalToolbarButtons()`, `removeJournalToolbarButtons()`, `hideWorkflowToolbarButtons()`, `showWorkflowToolbarButtons()`

### 3. Context Menu Consistency
- Updated `#annotation-context-menu` CSS to match node context menu styling
- All menu items now have white text (removed colored text for convert-to/delete)
- Inherits from `.context-menu` base class

### 4. Click Outside to Deselect
- Clicking on empty canvas now deselects annotations
- Clicking on a node deselects annotations
- Clicking on an annotation deselects nodes
- Standard UI/UX pattern for selection management

### 5. Tight Selection Box for Text
- Added `calculateActualTextWidth()` method
- Selection box now fits actual text content (not fixed 200px width)
- Hit detection and resize handles also use actual text width

### 6. Text Scaling vs Layout (Resize Handles)
- **Corner handles (nw, ne, sw, se)** → Scale font size (10px-72px bounds)
- **Edge handles (e, w)** → Change box width (text wrapping/layout)
- **Edge handles (n, s)** → No effect (height auto-calculated)

### 7. Multi-Selection for Annotations
- **Shift+Click** → Add to selection (changed from Ctrl)
- **Marquee selection** (drag box) → Selects both nodes AND annotations
- Added `selectAnnotationsInRect()` method to `AnnotationManager`

### 8. Annotations in Design Flow Mode
- Created `isAnnotationEnabled()` helper function
- Annotations now work in both Journals AND Design Flow modes
- Disabled in Chat, Agent, and Tasks modes
- No header buttons added for Design Flow (only Journals has Text/Arrow buttons)
- Exported `isTasksMode` to window in `tasks.js`

---

## Files Modified

| File | Changes |
|------|---------|
| `annotations.js` | Copy/paste methods, `calculateActualTextWidth()`, `selectAnnotationsInRect()`, resize logic for scaling vs layout |
| `comfyui.js` | `isAnnotationEnabled()` helper, keyboard handlers, mouse handlers, marquee selection |
| `journals.js` | Toolbar button management functions |
| `canvas.js` | Render annotations in annotation-enabled modes |
| `styles.css` | Context menu consistency |
| `tasks.js` | Export `isTasksMode` to window |

---

## How Annotations Work Now

### In Journals Mode
- **Text button** in header → Create text at canvas center
- **Arrow button** in header → Create arrow at canvas center
- **Double-click** on canvas → Create text annotation
- **Shift+Drag** on canvas → Draw arrow

### In Design Flow Mode
- **Double-click** on canvas → Create text annotation
- **Shift+Drag** on canvas → Draw arrow
- No header buttons (cleaner UI)

### Common Controls (Both Modes)
- **Click** → Select annotation
- **Shift+Click** → Multi-select
- **Drag box** → Marquee select
- **Drag corners** → Scale font size
- **Drag left/right edges** → Change text layout/width
- **Ctrl+C/V** → Copy/paste
- **Right-click** → Context menu
- **Click outside** → Deselect

---

## Technical Notes

### isAnnotationEnabled() Logic
```javascript
function isAnnotationEnabled() {
    const isChatMode = typeof window.isChatMode === 'function' && window.isChatMode();
    const isAgentMode = typeof window.isAgentMode === 'function' && window.isAgentMode();
    const isTasksMode = typeof window.isTasksMode === 'function' && window.isTasksMode();
    return !isChatMode && !isAgentMode && !isTasksMode;
}
```

### Font Size Bounds
- Minimum: 10px
- Maximum: 72px
- Default: 18px
