/**
 * Annotation Manager for IDEA Engine
 * Handles text and arrow annotations with hand-drawn style using RoughJS
 * Journals Mode only
 */

class AnnotationManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rough = rough.canvas(canvas);
        this.annotations = [];
        this.selectedAnnotation = null;
        this.selectedAnnotations = []; // Multi-selection support
        this.hoveredAnnotation = null;

        // Drawing state
        this.isDrawingArrow = false;
        this.tempArrow = null;
        this.isDraggingAnnotation = false;
        this.dragOffsets = new Map(); // Map of annotation -> offset for multi-drag

        // Editing state
        this.editingTextAnnotation = null;
        this.textEditor = null;

        // Endpoint editing for arrows
        this.editingEndpoint = null; // 'start' or 'end'

        // Text box resize state
        this.isResizingText = false;
        this.resizeHandle = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        this.resizeStartBounds = null; // { x, y, width, height }
        this.resizeStartMouse = null; // { x, y }

        // Hand-drawn font (fallback to system fonts)
        this.fontFamily = "'Segoe Print', 'Bradley Hand', 'Chilanka', cursive, sans-serif";
    }

    // ============================================
    // ANNOTATION CREATION
    // ============================================

    /**
     * Create a text annotation at the given canvas position
     */
    createTextAnnotation(x, y) {
        const annotation = {
            id: `ann_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'text',
            x: x,
            y: y,
            text: '',
            fontSize: 18,
            color: '#ffffff',
            width: 200,   // default box width
            height: null, // auto-calculated from content
            selected: true
        };

        this.annotations.push(annotation);
        this.selectAnnotation(annotation);
        this.openTextEditor(annotation);
        return annotation;
    }

    /**
     * Start drawing an arrow from the given position
     */
    startArrowDrawing(x, y) {
        this.isDrawingArrow = true;
        this.tempArrow = {
            startX: x,
            startY: y,
            endX: x,
            endY: y
        };
    }

    /**
     * Update the temporary arrow endpoint during drawing
     */
    updateArrowDrawing(x, y) {
        if (this.isDrawingArrow && this.tempArrow) {
            this.tempArrow.endX = x;
            this.tempArrow.endY = y;
        }
    }

    /**
     * Finish drawing the arrow and create the annotation
     */
    finishArrowDrawing() {
        if (this.isDrawingArrow && this.tempArrow) {
            const { startX, startY, endX, endY } = this.tempArrow;

            // Only create if arrow has meaningful length (> 20px)
            const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
            if (length > 20) {
                const arrow = {
                    id: `ann_arrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'arrow',
                    startX: startX,
                    startY: startY,
                    endX: endX,
                    endY: endY,
                    strokeColor: '#ffffff',
                    strokeWidth: 2,
                    arrowheadStart: false,
                    arrowheadEnd: true,
                    roughness: 1.5,
                    selected: false
                };
                this.annotations.push(arrow);
                this.selectAnnotation(arrow);
            }

            this.isDrawingArrow = false;
            this.tempArrow = null;
            return true;
        }
        return false;
    }

    /**
     * Cancel arrow drawing
     */
    cancelArrowDrawing() {
        this.isDrawingArrow = false;
        this.tempArrow = null;
    }

    // ============================================
    // TEXT EDITING
    // ============================================

    /**
     * Open the inline text editor for a text annotation
     */
    openTextEditor(annotation) {
        if (annotation.type !== 'text') return;

        this.editingTextAnnotation = annotation;

        // Create textarea element if it doesn't exist
        if (!this.textEditor) {
            this.textEditor = document.createElement('textarea');
            this.textEditor.className = 'annotation-text-editor';
            this.textEditor.placeholder = 'Type here...';
            document.querySelector('.canvas-container').appendChild(this.textEditor);

            // Event handlers
            this.textEditor.addEventListener('input', () => this.onTextInput());
            this.textEditor.addEventListener('blur', () => this.closeTextEditor());
            this.textEditor.addEventListener('keydown', (e) => this.onTextKeyDown(e));
        }

        // Position and show the editor
        this.updateTextEditorPosition();
        this.textEditor.value = annotation.text;
        this.textEditor.style.display = 'block';
        this.textEditor.focus();

        // Auto-resize
        this.autoResizeTextEditor();

        // Re-render canvas to hide the text (since editingTextAnnotation is now set)
        if (window.canvasRenderer) {
            window.canvasRenderer.render();
        }
    }

    /**
     * Update text editor position to match canvas transform
     */
    updateTextEditorPosition() {
        if (!this.editingTextAnnotation || !this.textEditor) return;

        const canvasRenderer = window.canvasRenderer;
        if (!canvasRenderer) return;

        const screenPos = canvasRenderer.canvasToScreen(
            this.editingTextAnnotation.x,
            this.editingTextAnnotation.y
        );

        const scale = canvasRenderer.scale;
        const fontSize = this.editingTextAnnotation.fontSize * scale;
        const boxWidth = (this.editingTextAnnotation.width || 200) * scale;

        this.textEditor.style.left = `${screenPos.x}px`;
        this.textEditor.style.top = `${screenPos.y}px`;
        this.textEditor.style.fontSize = `${fontSize}px`;
        this.textEditor.style.fontFamily = this.fontFamily;
        this.textEditor.style.width = `${boxWidth}px`;
        this.textEditor.style.transform = 'none';
    }

    /**
     * Handle text input changes
     */
    onTextInput() {
        if (this.editingTextAnnotation) {
            this.editingTextAnnotation.text = this.textEditor.value;
            this.autoResizeTextEditor();

            // Trigger save
            if (typeof saveCurrentJournalCanvas === 'function') {
                saveCurrentJournalCanvas();
            }
        }
    }

    /**
     * Handle keyboard events in text editor
     */
    onTextKeyDown(e) {
        if (e.key === 'Escape') {
            this.closeTextEditor();
        }
    }

    /**
     * Auto-resize textarea height based on content (width is fixed by annotation)
     */
    autoResizeTextEditor() {
        if (!this.textEditor || !this.editingTextAnnotation) return;

        const canvasRenderer = window.canvasRenderer;
        const scale = canvasRenderer ? canvasRenderer.scale : 1;
        const boxWidth = (this.editingTextAnnotation.width || 200) * scale;

        // Set width from annotation
        this.textEditor.style.width = `${boxWidth}px`;

        // Reset height to auto to get scroll height
        this.textEditor.style.height = 'auto';
        this.textEditor.style.height = `${this.textEditor.scrollHeight}px`;
    }

    /**
     * Close the text editor
     */
    closeTextEditor() {
        if (this.textEditor) {
            this.textEditor.style.display = 'none';
        }

        // Remove empty text annotations
        if (this.editingTextAnnotation && this.editingTextAnnotation.text.trim() === '') {
            this.removeAnnotation(this.editingTextAnnotation);
        }

        this.editingTextAnnotation = null;

        // Re-render canvas
        if (window.canvasRenderer) {
            window.canvasRenderer.render();
        }
    }

    // ============================================
    // SELECTION & MANIPULATION
    // ============================================

    /**
     * Select an annotation
     * @param {Object} annotation - The annotation to select
     * @param {boolean} multi - If true, add to selection instead of replacing
     */
    selectAnnotation(annotation, multi = false) {
        if (!multi) {
            // Deselect all previous
            this.selectedAnnotations.forEach(ann => ann.selected = false);
            this.selectedAnnotations = [];
        }

        // Select new
        this.selectedAnnotation = annotation;
        if (annotation) {
            annotation.selected = true;
            if (!this.selectedAnnotations.includes(annotation)) {
                this.selectedAnnotations.push(annotation);
            }
        }
    }

    /**
     * Toggle annotation selection (for Ctrl+click)
     */
    toggleAnnotationSelection(annotation) {
        if (annotation.selected) {
            // Deselect
            annotation.selected = false;
            this.selectedAnnotations = this.selectedAnnotations.filter(a => a !== annotation);
            // Update selectedAnnotation to last in array or null
            this.selectedAnnotation = this.selectedAnnotations.length > 0
                ? this.selectedAnnotations[this.selectedAnnotations.length - 1]
                : null;
        } else {
            // Add to selection
            annotation.selected = true;
            this.selectedAnnotations.push(annotation);
            this.selectedAnnotation = annotation;
        }
    }

    /**
     * Deselect all annotations
     */
    deselectAll() {
        this.annotations.forEach(ann => ann.selected = false);
        this.selectedAnnotation = null;
        this.selectedAnnotations = [];
    }

    /**
     * Start dragging annotations (supports multi-selection)
     * @param {Object} annotation - The clicked annotation
     * @param {number} canvasX - Mouse X in canvas coords
     * @param {number} canvasY - Mouse Y in canvas coords
     * @param {boolean} multi - If Ctrl/Cmd is held
     */
    startDragging(annotation, canvasX, canvasY, multi = false) {
        this.isDraggingAnnotation = true;

        // If clicking on unselected annotation without Ctrl, select only it
        // If clicking on unselected annotation with Ctrl, add to selection
        // If clicking on already selected annotation, drag all selected
        if (!annotation.selected) {
            if (multi) {
                this.toggleAnnotationSelection(annotation);
            } else {
                this.selectAnnotation(annotation);
            }
        }

        // Store offsets for ALL selected annotations
        this.dragOffsets.clear();
        this.selectedAnnotations.forEach(ann => {
            if (ann.type === 'text') {
                this.dragOffsets.set(ann, {
                    x: canvasX - ann.x,
                    y: canvasY - ann.y
                });
            } else if (ann.type === 'arrow') {
                this.dragOffsets.set(ann, {
                    startX: canvasX - ann.startX,
                    startY: canvasY - ann.startY,
                    endX: canvasX - ann.endX,
                    endY: canvasY - ann.endY
                });
            }
        });
    }

    /**
     * Update annotation positions during drag (all selected)
     */
    updateDragging(canvasX, canvasY) {
        if (!this.isDraggingAnnotation || this.selectedAnnotations.length === 0) return;

        // Move all selected annotations
        this.selectedAnnotations.forEach(ann => {
            const offset = this.dragOffsets.get(ann);
            if (!offset) return;

            if (ann.type === 'text') {
                ann.x = canvasX - offset.x;
                ann.y = canvasY - offset.y;
            } else if (ann.type === 'arrow') {
                ann.startX = canvasX - offset.startX;
                ann.startY = canvasY - offset.startY;
                ann.endX = canvasX - offset.endX;
                ann.endY = canvasY - offset.endY;
            }
        });
    }

    /**
     * Stop dragging
     */
    stopDragging() {
        this.isDraggingAnnotation = false;
        this.dragOffset = { x: 0, y: 0 };

        // Save changes
        if (typeof saveCurrentJournalCanvas === 'function') {
            saveCurrentJournalCanvas();
        }
    }

    /**
     * Start editing an arrow endpoint
     */
    startEndpointEdit(annotation, endpoint) {
        this.editingEndpoint = endpoint; // 'start' or 'end'
        this.selectAnnotation(annotation);
    }

    /**
     * Update arrow endpoint position
     */
    updateEndpoint(canvasX, canvasY) {
        if (!this.editingEndpoint || !this.selectedAnnotation) return;
        if (this.selectedAnnotation.type !== 'arrow') return;

        if (this.editingEndpoint === 'start') {
            this.selectedAnnotation.startX = canvasX;
            this.selectedAnnotation.startY = canvasY;
        } else {
            this.selectedAnnotation.endX = canvasX;
            this.selectedAnnotation.endY = canvasY;
        }
    }

    /**
     * Stop endpoint editing
     */
    stopEndpointEdit() {
        this.editingEndpoint = null;

        // Save changes
        if (typeof saveCurrentJournalCanvas === 'function') {
            saveCurrentJournalCanvas();
        }
    }

    /**
     * Start resizing a text annotation
     */
    startTextResize(annotation, handle, mousePos) {
        if (annotation.type !== 'text') return;

        this.isResizingText = true;
        this.resizeHandle = handle;
        this.resizeStartMouse = { x: mousePos.x, y: mousePos.y };

        // Store original bounds
        const boxWidth = annotation.width || 200;
        const boxHeight = annotation.height || this.calculateTextHeight(annotation.text, boxWidth, annotation.fontSize);

        this.resizeStartBounds = {
            x: annotation.x,
            y: annotation.y,
            width: boxWidth,
            height: boxHeight
        };

        this.selectAnnotation(annotation);
    }

    /**
     * Update text annotation size during resize drag
     */
    updateTextResize(mouseX, mouseY) {
        if (!this.isResizingText || !this.selectedAnnotation || !this.resizeStartBounds) return;

        const ann = this.selectedAnnotation;
        const start = this.resizeStartBounds;
        const dx = mouseX - this.resizeStartMouse.x;
        const dy = mouseY - this.resizeStartMouse.y;
        const minWidth = 50;
        const minHeight = ann.fontSize * 1.2;

        // Apply resize based on handle position
        switch (this.resizeHandle) {
            case 'e':
                ann.width = Math.max(minWidth, start.width + dx);
                break;
            case 'w':
                const newWidthW = Math.max(minWidth, start.width - dx);
                ann.x = start.x + (start.width - newWidthW);
                ann.width = newWidthW;
                break;
            case 's':
                // Height is auto-calculated based on content, so just widen slightly
                break;
            case 'n':
                // Height is auto-calculated, so this is a no-op for now
                break;
            case 'se':
                ann.width = Math.max(minWidth, start.width + dx);
                break;
            case 'sw':
                const newWidthSW = Math.max(minWidth, start.width - dx);
                ann.x = start.x + (start.width - newWidthSW);
                ann.width = newWidthSW;
                break;
            case 'ne':
                ann.width = Math.max(minWidth, start.width + dx);
                break;
            case 'nw':
                const newWidthNW = Math.max(minWidth, start.width - dx);
                ann.x = start.x + (start.width - newWidthNW);
                ann.width = newWidthNW;
                break;
        }

        // Recalculate height based on new width
        ann.height = this.calculateTextHeight(ann.text, ann.width, ann.fontSize);
    }

    /**
     * Stop text resize operation
     */
    stopTextResize() {
        this.isResizingText = false;
        this.resizeHandle = null;
        this.resizeStartBounds = null;
        this.resizeStartMouse = null;

        // Save changes
        if (typeof saveCurrentJournalCanvas === 'function') {
            saveCurrentJournalCanvas();
        }
    }

    /**
     * Remove an annotation
     */
    removeAnnotation(annotation) {
        const index = this.annotations.indexOf(annotation);
        if (index !== -1) {
            this.annotations.splice(index, 1);
        }
        if (this.selectedAnnotation === annotation) {
            this.selectedAnnotation = null;
        }

        // Save changes
        if (typeof saveCurrentJournalCanvas === 'function') {
            saveCurrentJournalCanvas();
        }
    }

    /**
     * Delete selected annotation
     */
    deleteSelected() {
        if (this.selectedAnnotation) {
            this.removeAnnotation(this.selectedAnnotation);
            return true;
        }
        return false;
    }

    // ============================================
    // HIT DETECTION
    // ============================================

    /**
     * Get annotation at canvas position
     */
    getAnnotationAtPosition(x, y) {
        // Check in reverse order (topmost first)
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const ann = this.annotations[i];
            if (ann.type === 'text' && this.isPointInText(x, y, ann)) {
                return ann;
            }
            if (ann.type === 'arrow' && this.isPointNearArrow(x, y, ann)) {
                return ann;
            }
        }
        return null;
    }

    /**
     * Check if point is inside a text annotation
     */
    isPointInText(x, y, annotation) {
        const boxWidth = annotation.width || 200;
        const boxHeight = annotation.height || this.calculateTextHeight(annotation.text, boxWidth, annotation.fontSize);
        const padding = 5;

        return x >= annotation.x - padding &&
               x <= annotation.x + boxWidth + padding &&
               y >= annotation.y - padding &&
               y <= annotation.y + boxHeight + padding;
    }

    /**
     * Check if point is near an arrow line
     */
    isPointNearArrow(x, y, annotation, threshold = 10) {
        const { startX, startY, endX, endY } = annotation;

        // Distance from point to line segment
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) {
            return Math.sqrt((x - startX) ** 2 + (y - startY) ** 2) <= threshold;
        }

        let t = Math.max(0, Math.min(1, ((x - startX) * dx + (y - startY) * dy) / lengthSq));
        const projX = startX + t * dx;
        const projY = startY + t * dy;

        return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2) <= threshold;
    }

    /**
     * Get arrow endpoint handle at position
     */
    getArrowEndpointHandle(x, y, annotation, handleSize = 10) {
        if (annotation.type !== 'arrow') return null;

        const { startX, startY, endX, endY } = annotation;

        if (Math.abs(x - startX) < handleSize && Math.abs(y - startY) < handleSize) {
            return 'start';
        }
        if (Math.abs(x - endX) < handleSize && Math.abs(y - endY) < handleSize) {
            return 'end';
        }
        return null;
    }

    /**
     * Get text box resize handle at position
     * Returns: 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w' or null
     */
    getTextResizeHandle(x, y, annotation, handleSize = 10) {
        if (annotation.type !== 'text') return null;
        if (!annotation.selected) return null;

        const { x: ax, y: ay, width, height, fontSize } = annotation;
        const boxWidth = width || 200;
        const boxHeight = height || this.calculateTextHeight(annotation.text, boxWidth, fontSize);
        const padding = 4;

        // Calculate bounds
        const left = ax - padding;
        const right = ax + boxWidth + padding;
        const top = ay - padding;
        const bottom = ay + boxHeight + padding;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        // Define handles with their positions
        const handles = [
            { pos: 'nw', hx: left, hy: top },
            { pos: 'n', hx: centerX, hy: top },
            { pos: 'ne', hx: right, hy: top },
            { pos: 'e', hx: right, hy: centerY },
            { pos: 'se', hx: right, hy: bottom },
            { pos: 's', hx: centerX, hy: bottom },
            { pos: 'sw', hx: left, hy: bottom },
            { pos: 'w', hx: left, hy: centerY }
        ];

        // Check each handle
        for (const handle of handles) {
            if (Math.abs(x - handle.hx) < handleSize && Math.abs(y - handle.hy) < handleSize) {
                return handle.pos;
            }
        }

        return null;
    }

    // ============================================
    // TEXT WRAPPING
    // ============================================

    /**
     * Wrap text to fit within a given width
     * Returns array of lines
     */
    wrapText(text, maxWidth, fontSize) {
        const ctx = this.ctx;
        ctx.font = `${fontSize}px ${this.fontFamily}`;

        const paragraphs = text.split('\n');
        const lines = [];

        paragraphs.forEach(paragraph => {
            if (paragraph === '') {
                lines.push('');
                return;
            }

            const words = paragraph.split(' ');
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });

            if (currentLine) {
                lines.push(currentLine);
            }
        });

        return lines.length > 0 ? lines : [''];
    }

    /**
     * Calculate the height needed for wrapped text
     */
    calculateTextHeight(text, width, fontSize) {
        const lines = this.wrapText(text, width, fontSize);
        const lineHeight = fontSize * 1.2;
        return lines.length * lineHeight;
    }

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Render all annotations
     */
    render(ctx) {
        // Draw annotations
        this.annotations.forEach(ann => {
            if (ann.type === 'text') {
                this.renderTextAnnotation(ctx, ann);
            } else if (ann.type === 'arrow') {
                this.renderArrowAnnotation(ctx, ann);
            }
        });

        // Draw temporary arrow during drawing
        if (this.isDrawingArrow && this.tempArrow) {
            this.renderTempArrow(ctx);
        }
    }

    /**
     * Render a text annotation
     */
    renderTextAnnotation(ctx, annotation) {
        // Don't render if being edited (textarea is visible)
        if (this.editingTextAnnotation === annotation) return;

        const { x, y, text, fontSize, color, selected, width } = annotation;

        if (!text || text.trim() === '') return;

        ctx.save();

        // Set font
        ctx.font = `${fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';

        // Use text wrapping based on box width
        const boxWidth = width || 200;
        const lines = this.wrapText(text, boxWidth, fontSize);
        const lineHeight = fontSize * 1.2;
        const textHeight = lines.length * lineHeight;

        // Update annotation height for hit detection
        annotation.height = textHeight;

        // Draw text line by line
        lines.forEach((line, i) => {
            ctx.fillText(line, x, y + i * lineHeight);
        });

        // Draw selection box and resize handles if selected
        if (selected) {
            const padding = 4;

            // Hand-drawn selection rectangle using RoughJS
            this.rough.rectangle(
                x - padding,
                y - padding,
                boxWidth + padding * 2,
                textHeight + padding * 2,
                {
                    stroke: '#5a9fd4',
                    strokeWidth: 1.5,
                    roughness: 1.5,
                    fill: 'rgba(90, 159, 212, 0.1)',
                    fillStyle: 'solid'
                }
            );

            // Draw resize handles
            this.drawTextResizeHandles(ctx, annotation, boxWidth, textHeight);
        }

        ctx.restore();
    }

    /**
     * Draw resize handles for a text annotation
     */
    drawTextResizeHandles(ctx, annotation, width, height) {
        const { x, y } = annotation;
        const handleSize = 6;
        const padding = 4;

        // Calculate handle positions
        const left = x - padding;
        const right = x + width + padding;
        const top = y - padding;
        const bottom = y + height + padding;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        const handles = [
            { pos: 'nw', x: left, y: top },
            { pos: 'n', x: centerX, y: top },
            { pos: 'ne', x: right, y: top },
            { pos: 'e', x: right, y: centerY },
            { pos: 'se', x: right, y: bottom },
            { pos: 's', x: centerX, y: bottom },
            { pos: 'sw', x: left, y: bottom },
            { pos: 'w', x: left, y: centerY }
        ];

        ctx.save();
        ctx.fillStyle = '#5a9fd4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.rect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    /**
     * Render an arrow annotation
     */
    renderArrowAnnotation(ctx, annotation) {
        const { startX, startY, endX, endY, strokeColor, strokeWidth, roughness,
                arrowheadStart, arrowheadEnd, selected } = annotation;

        // Draw the main line with RoughJS
        this.rough.line(startX, startY, endX, endY, {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            roughness: roughness
        });

        // Draw arrowheads
        if (arrowheadEnd) {
            this.drawArrowhead(startX, startY, endX, endY, strokeColor, strokeWidth, roughness);
        }
        if (arrowheadStart) {
            this.drawArrowhead(endX, endY, startX, startY, strokeColor, strokeWidth, roughness);
        }

        // Draw selection handles if selected
        if (selected) {
            this.drawEndpointHandles(ctx, annotation);
        }
    }

    /**
     * Draw an arrowhead at the end point
     */
    drawArrowhead(fromX, fromY, toX, toY, color, width, roughness) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const headLength = 15;
        const headAngle = Math.PI / 6;

        const x1 = toX - headLength * Math.cos(angle - headAngle);
        const y1 = toY - headLength * Math.sin(angle - headAngle);
        const x2 = toX - headLength * Math.cos(angle + headAngle);
        const y2 = toY - headLength * Math.sin(angle + headAngle);

        // Draw arrowhead lines with RoughJS
        this.rough.line(toX, toY, x1, y1, {
            stroke: color,
            strokeWidth: width,
            roughness: roughness
        });
        this.rough.line(toX, toY, x2, y2, {
            stroke: color,
            strokeWidth: width,
            roughness: roughness
        });
    }

    /**
     * Draw endpoint handles for selected arrows
     */
    drawEndpointHandles(ctx, annotation) {
        const { startX, startY, endX, endY } = annotation;
        const handleSize = 6;

        ctx.save();

        // Start handle
        ctx.fillStyle = '#5a9fd4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(startX, startY, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // End handle
        ctx.beginPath();
        ctx.arc(endX, endY, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Render temporary arrow during drawing
     */
    renderTempArrow(ctx) {
        const { startX, startY, endX, endY } = this.tempArrow;

        // Draw with RoughJS for consistency
        this.rough.line(startX, startY, endX, endY, {
            stroke: 'rgba(255, 255, 255, 0.7)',
            strokeWidth: 2,
            roughness: 1.5
        });

        // Draw arrowhead
        this.drawArrowhead(startX, startY, endX, endY, 'rgba(255, 255, 255, 0.7)', 2, 1.5);
    }

    // ============================================
    // SERIALIZATION
    // ============================================

    /**
     * Convert annotations to JSON for saving
     */
    toJSON() {
        return this.annotations.map(ann => {
            const copy = { ...ann };
            delete copy.selected; // Don't persist selection state
            return copy;
        });
    }

    /**
     * Load annotations from JSON
     */
    fromJSON(data) {
        this.annotations = data.map(ann => ({
            ...ann,
            selected: false
        }));
        this.selectedAnnotation = null;
    }

    /**
     * Clear all annotations
     */
    clearAnnotations() {
        this.annotations = [];
        this.selectedAnnotation = null;
        this.hoveredAnnotation = null;
        this.closeTextEditor();
    }
}

// Export globally
window.AnnotationManager = AnnotationManager;
