// UI Components Module
// Handles modal creation, highlighting, and UI interactions

import { SLIConfig } from './config.js';
import { SLIStyles } from './styles.js';
import { SLIUtils } from './utils.js';
import { SLIDOMHierarchy } from './hierarchy.js';

export class SLIUIComponents {
    // Create the floating modal with robust CSS
    static createModal() {
        const config = SLIConfig.getConfig();
        const state = SLIConfig.getState();
        
        const modal = document.createElement('div');
        modal.id = config.modalId;
        modal.className = 'sli-modal';
        
        modal.innerHTML = `
            <div class="sli-header">
                <span class="sli-title">🎯 Smart Locator Inspector</span>
                <button class="sli-close" onclick="window.SLI.toggle()" title="Hide (ESC)">×</button>
            </div>
            <div class="sli-content">
                <div class="sli-loading">Hover over an element...</div>
            </div>
        `;

        // Inject comprehensive styles
        SLIStyles.injectStyles();
        
        // Add to page
        document.documentElement.appendChild(modal);
        
        // Make draggable
        this.makeDraggable(modal);
        
        // Update state
        SLIConfig.setState({ modal });
        
        return modal;
    }

    // Create the highlight box
    static createHighlightBox() {
        const config = SLIConfig.getConfig();
        
        // Remove any existing highlight box first
        const existing = document.getElementById(config.highlightId);
        if (existing) {
            existing.remove();
        }
        
        const highlightBox = document.createElement('div');
        highlightBox.id = config.highlightId;
        highlightBox.className = 'sli-highlight';
        
        // Set initial styles directly
        highlightBox.style.position = 'fixed';
        highlightBox.style.top = '0px';
        highlightBox.style.left = '0px';
        highlightBox.style.width = '0px';
        highlightBox.style.height = '0px';
        highlightBox.style.pointerEvents = 'none';
        highlightBox.style.zIndex = '999999999';
        highlightBox.style.border = '4px solid #FF0000';
        highlightBox.style.background = 'rgba(255, 0, 0, 0.2)';
        highlightBox.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.8)';
        highlightBox.style.display = 'none';
        highlightBox.style.opacity = '0.8';
        
        document.body.appendChild(highlightBox);
        console.log('[SLI] Highlight box created and appended to body:', highlightBox);
        
        // Update state
        SLIConfig.setState({ highlightBox });
        
        return highlightBox;
    }

    // Make modal draggable
    static makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const header = element.querySelector('.sli-header');
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            element.style.left = (initialX + deltaX) + 'px';
            element.style.top = (initialY + deltaY) + 'px';
            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'default';
            }
        });
    }

    // Highlight an element
    static highlightElement(element) {
        const state = SLIConfig.getState();
        
        if (!state.highlightBox || !element) return;
        
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        state.highlightBox.style.display = 'block';
        state.highlightBox.style.left = (rect.left + scrollLeft - 4) + 'px';
        state.highlightBox.style.top = (rect.top + scrollTop - 4) + 'px';
        state.highlightBox.style.width = (rect.width + 8) + 'px';
        state.highlightBox.style.height = (rect.height + 8) + 'px';
        
        // Add frozen class if in frozen mode
        if (state.isFrozen) {
            state.highlightBox.classList.add('frozen');
        } else {
            state.highlightBox.classList.remove('frozen');
        }
    }

    // Hide highlight
    static hideHighlight() {
        const state = SLIConfig.getState();
        if (state.highlightBox) {
            state.highlightBox.style.display = 'none';
        }
    }

    // Update modal content
    static updateModal(data) {
        const state = SLIConfig.getState();
        if (!state.modal) return;

        const content = state.modal.querySelector('.sli-content');
        if (!content) return;

        if (data.message) {
            content.innerHTML = `
                <div class="sli-message">${data.message}</div>
                ${data.instructions ? data.instructions.map(inst => `<div class="sli-instruction">💡 ${inst}</div>`).join('') : ''}
            `;
            return;
        }

        const fields = [];

        // Basic element info
        fields.push(this.createField('Tag', data.tag.toUpperCase(), 'HTML element tag name'));
        
        if (data.id) fields.push(this.createField('ID', data.id, 'Element ID attribute'));
        if (data.name) fields.push(this.createField('Name', data.name, 'Name attribute'));
        if (data.className) fields.push(this.createField('Class', data.className, 'CSS classes'));
        if (data.text) fields.push(this.createField('Text', data.text, 'Visible text content'));

        // Primary locators
        fields.push(this.createField('CSS Selector', data.css, 'CSS selector for this element'));

        // Smart XPath suggestions
        if (data.smartXPaths && data.smartXPaths.length > 0) {
            console.log('[SLI] All smartXPaths:', data.smartXPaths.map(x => ({type: x.type, xpath: x.xpath})));
            
            // Log the actual type values to debug
            console.log('[SLI] All types debug:', data.smartXPaths.map(x => x.type));
            
            // Group locators by type  
            const playwrightLocators = data.smartXPaths.filter(xpath => {
                if (!xpath.type) {
                    console.log('[SLI] Locator with no type:', xpath);
                    return false;
                }
                const isPlaywright = xpath.type.toLowerCase().includes('playwright');
                console.log(`[SLI] Checking "${xpath.type}" - isPlaywright: ${isPlaywright}`);
                return isPlaywright;
            });
            const traditionalLocators = data.smartXPaths.filter(xpath => !playwrightLocators.includes(xpath));
            
            console.log('[SLI] Playwright locators found:', playwrightLocators.length, playwrightLocators.map(x => x.type));
            console.log('[SLI] Traditional locators found:', traditionalLocators.length, traditionalLocators.map(x => x.type));
            
            // Show Playwright locators first if any
            if (playwrightLocators.length > 0) {
                fields.push('<div class="sli-xpath-header">🎭 Playwright Locators</div>');
                playwrightLocators.slice(0, 8).forEach(xpath => {
                    fields.push(this.createSmartXPathField(xpath));
                });
            }
            
            // Then show traditional XPath locators
            if (traditionalLocators.length > 0) {
                fields.push('<div class="sli-xpath-header">🧠 Traditional XPath Suggestions</div>');
                traditionalLocators.slice(0, 5).forEach(xpath => {
                    fields.push(this.createSmartXPathField(xpath));
                });
            }
        } else {
            fields.push(this.createField('XPath', data.xpath, 'XPath locator for this element'));
        }

        // DOM Hierarchy
        if (data.hierarchy) {
            fields.push(SLIDOMHierarchy.createHierarchySection(data.hierarchy));
        }

        content.innerHTML = fields.join('');

        // Attach click handlers for copying
        this.attachCopyHandlers(content);
    }

    // Create a field in the modal
    static createField(label, value, description, options = {}) {
        const classes = ['sli-field'];
        if (options.unique) classes.push('sli-unique');
        if (options.nonUnique) classes.push('sli-non-unique');
        if (options.isSmartXPath) classes.push('sli-smart-xpath');
        if (options.isPlaywrightXPath) classes.push('sli-playwright-xpath');
        if (options.isTableXPath) classes.push('sli-table-xpath');

        let scoreSection = '';
        if (options.score !== undefined) {
            const scoreColor = SLIUtils.getScoreColor(options.score);
            const scoreBar = SLIUtils.generateScoreBar(options.score);
            const uniqueness = options.unique ? 'UNIQUE' : 'NON-UNIQUE';
            
            scoreSection = `
                <div class="sli-score-container">
                    <div class="sli-uniqueness" style="color: ${scoreColor};">${uniqueness}</div>
                    <div class="sli-score" style="color: ${scoreColor};">${options.score}/100</div>
                    <div class="sli-score-bar">${scoreBar}</div>
                </div>
            `;
        }

        return `
            <div class="${classes.join(' ')}" data-copy="${SLIUtils.escapeHtml(value)}">
                <div class="sli-field-header">
                    <span class="sli-field-label">${label}</span>
                    ${scoreSection}
                </div>
                ${description ? `<div class="sli-field-description">${description}</div>` : ''}
                <div class="sli-field-value">${SLIUtils.escapeHtml(value)}</div>
            </div>
        `;
    }

    // Create smart XPath field with scoring
    static createSmartXPathField(xpath) {
        const isTableXPath = xpath.type && xpath.type.includes('📊');
        const isPlaywrightXPath = xpath.type && (
            xpath.type.includes('🎭') || 
            xpath.type.includes('📝') ||
            xpath.type.includes('🏷️') ||
            xpath.type.includes('🧪') ||
            xpath.type.includes('🖼️') ||
            xpath.type.includes('📋') ||
            xpath.type.includes('🎯')
        );
        
        return this.createField(
            xpath.type || 'XPath',
            xpath.xpath,
            xpath.description,
            {
                score: xpath.score,
                unique: xpath.isUnique,
                nonUnique: !xpath.isUnique,
                isSmartXPath: !isTableXPath && !isPlaywrightXPath,
                isPlaywrightXPath: isPlaywrightXPath,
                isTableXPath: isTableXPath
            }
        );
    }

    // Attach copy handlers to modal content
    static attachCopyHandlers(content) {
        const copyFields = content.querySelectorAll('[data-copy]');
        copyFields.forEach(field => {
            field.addEventListener('click', async (e) => {
                e.preventDefault();
                const textToCopy = field.getAttribute('data-copy');
                const success = await SLIUtils.copyToClipboard(textToCopy);
                
                if (success) {
                    // Visual feedback
                    const originalBg = field.style.background;
                    field.style.background = 'rgba(152, 195, 121, 0.3)';
                    setTimeout(() => {
                        field.style.background = originalBg;
                    }, 200);
                    
                    console.log('[SLI] Copied to clipboard:', textToCopy);
                }
            });
        });

        // Hierarchy item click handlers
        const hierarchyItems = content.querySelectorAll('.sli-hierarchy-item');
        hierarchyItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const locator = item.getAttribute('data-locator');
                if (locator) {
                    await SLIUtils.copyToClipboard(locator);
                    
                    // Visual feedback
                    const originalBg = item.style.background;
                    item.style.background = 'rgba(152, 195, 121, 0.3)';
                    setTimeout(() => {
                        item.style.background = originalBg;
                    }, 300);
                }
            });
        });
    }

    // Toggle modal visibility
    static toggle() {
        const state = SLIConfig.getState();
        
        if (state.modal) {
            state.modal.style.display = state.modal.style.display === 'none' ? 'block' : 'none';
        }
        
        SLIConfig.setState({ isActive: !state.isActive });
        
        if (!state.isActive) {
            this.hideHighlight();
        }
    }

    // Set frozen state
    static setFrozenState(frozen) {
        const state = SLIConfig.getState();
        
        SLIConfig.setState({ isFrozen: frozen });
        
        if (state.modal) {
            if (frozen) {
                state.modal.classList.add('sli-frozen');
            } else {
                state.modal.classList.remove('sli-frozen');
            }
        }
        
        if (state.highlightBox) {
            if (frozen) {
                state.highlightBox.classList.add('frozen');
            } else {
                state.highlightBox.classList.remove('frozen');
            }
        }
    }

    // Clean up UI elements
    static cleanup() {
        const config = SLIConfig.getConfig();
        
        // Remove modal
        const modal = document.getElementById(config.modalId);
        if (modal) modal.remove();
        
        // Remove highlight box
        const highlight = document.getElementById(config.highlightId);
        if (highlight) highlight.remove();
        
        // Remove styles
        const styles = document.getElementById('sli-styles');
        if (styles) styles.remove();
        
        // Reset state
        SLIConfig.resetState();
    }
}