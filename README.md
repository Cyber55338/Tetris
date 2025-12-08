# ComfyUI Clone

A fully functional node-based workflow editor inspired by ComfyUI, built with vanilla JavaScript, HTML5 Canvas, and CSS.

## Features

### Core Functionality
- **Node-based Workflow Editor** - Visual programming interface with drag-and-drop nodes
- **Type-safe Connections** - Color-coded ports with automatic type checking
- **Real-time Canvas Manipulation** - Pan, zoom, and navigate large workflows
- **Intuitive UX** - Modern dark theme with smooth interactions

### Node System
- **Multiple Node Categories**:
  - Loaders (Checkpoint, VAE, LoRA)
  - Conditioning (CLIP Text Encode)
  - Sampling (KSampler)
  - Latent (Empty Latent Image, VAE Encode/Decode)
  - Image (Load, Save, Scale)
  - Math & Utils (Math Operations, Constants)

- **Smart Connections**:
  - Type-safe port connections with visual feedback
  - Color-coded data types (IMAGE, LATENT, MODEL, VAE, etc.)
  - Automatic connection validation
  - Bezier curves for connection visualization

### Canvas Features
- **Pan & Zoom** - Navigate large workflows easily
  - Mouse wheel zoom
  - Zoom buttons (+, -, Reset)
  - Middle-click or space+drag to pan
- **Grid Background** - Visual reference for alignment
- **Node Selection** - Single and multi-select (Ctrl+Click)
- **Drag & Drop** - Add nodes from library or drag existing nodes

### Workflow Management
- **Save/Load** - Export and import workflows as JSON
- **Auto-save** - Automatic saving to browser localStorage
- **Copy/Paste** - Duplicate nodes and connections (Ctrl+C/V)
- **Workflow Validation** - Detect cycles and missing connections

### User Interface
- **Node Library Panel** - Browse and search available nodes
  - Categorized node list
  - Search functionality
  - Click or drag to add nodes
- **Properties Panel** - Configure node parameters
  - Dynamic property editors
  - Support for text, number, select inputs
  - Real-time updates
- **Toolbar** - Quick access to common actions
  - New, Save, Load, Execute, Clear
  - Zoom controls
  - Node count display

### Keyboard Shortcuts
- `Ctrl+N` - New workflow
- `Ctrl+S` - Save workflow
- `Ctrl+O` - Open workflow
- `Ctrl+A` - Select all nodes
- `Ctrl+C` - Copy selected nodes
- `Ctrl+V` - Paste nodes
- `Ctrl+D` - Duplicate selected nodes
- `Delete/Backspace` - Delete selected nodes
- `+/-` - Zoom in/out
- `0` - Reset zoom
- `Esc` - Deselect all

## Usage

1. **Adding Nodes**:
   - Click on a node in the left sidebar to add it to the center of the canvas
   - Or drag a node from the sidebar and drop it on the canvas
   - Use the search box to quickly find nodes

2. **Connecting Nodes**:
   - Click and drag from an output port (right side) to an input port (left side)
   - Connections are color-coded by data type
   - Only compatible types can be connected
   - Double-click a connection to delete it

3. **Configuring Nodes**:
   - Click a node to select it
   - View and edit properties in the right sidebar
   - Changes are applied in real-time

4. **Canvas Navigation**:
   - Drag on empty space to pan the canvas
   - Use mouse wheel or zoom buttons to zoom in/out
   - Press `0` to reset zoom to 100%

5. **Workflow Operations**:
   - Click "Save" to download workflow as JSON
   - Click "Load" to import a saved workflow
   - Click "Execute" to simulate workflow execution
   - Click "Clear" to remove all nodes

## Technical Details

### Architecture
- **Pure JavaScript** - No frameworks, vanilla ES6+
- **HTML5 Canvas** - High-performance rendering
- **Modular Design** - Separate concerns for maintainability

### Files Structure
- `index.html` - Main HTML structure
- `styles.css` - Complete styling and theme
- `nodes.js` - Node definitions and types
- `canvas.js` - Canvas rendering and manipulation
- `connections.js` - Connection management and validation
- `workflow.js` - Save/load functionality
- `comfyui.js` - Main application and event handling

### Data Types
- IMAGE (Purple) - Image data
- LATENT (Pink) - Latent representations
- MODEL (Orange) - AI models
- CONDITIONING (Green) - Conditioning vectors
- CLIP (Blue) - CLIP models
- VAE (Red) - VAE models
- CONTROL_NET (Cyan) - ControlNet data
- NUMBER (Indigo) - Numeric values
- STRING (Lime) - Text strings
- ANY (Gray) - Universal type

## Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Future Enhancements
- Backend integration for actual execution
- More node types
- Custom node creation
- Workflow templates
- Minimap for large workflows
- Node grouping
- Comments and annotations
- Performance optimizations for large workflows

## License
MIT License

## Credits
Inspired by ComfyUI - The most powerful and modular diffusion model GUI