import { useEffect, useRef } from 'react';

/**
 * Design Guard Hook - Enforces Subway UI design consistency
 * 
 * This hook validates that interactive elements use proper Subway UI classes:
 * - Buttons must include .s-btn (with optional variants like .s-btn--primary, .s-btn--ghost, .s-btn--sm, .s-btn--md, .s-btn--lg)
 * - Inputs must include .s-input
 * - Select elements must include .s-select
 * - Textareas must include .s-textarea
 * - Links acting as buttons (a[role="button"]) must include .s-btn
 * 
 * To mute warnings for specific elements:
 * - Add data-allow-unstyled="true" to allow elements without Subway classes
 * - Add data-design-guard="off" to completely disable checking for an element
 * - Use markDesignGuardSilenced() to globally disable warnings
 * 
 * Only runs in non-production environments for performance.
 */

interface DesignGuardConfig {
  enabled: boolean;
}

// Global state for silencing warnings
let isGloballySilenced = false;
const warnedElements = new WeakSet<Element>();

/**
 * Globally disable design guard warnings
 * Useful for testing or when you need to temporarily disable validation
 */
export function markDesignGuardSilenced(): void {
  isGloballySilenced = true;
  console.log('🎨 Design Guard: Warnings globally silenced');
}

/**
 * Re-enable design guard warnings
 */
export function unmarkDesignGuardSilenced(): void {
  isGloballySilenced = false;
  console.log('🎨 Design Guard: Warnings re-enabled');
}

/**
 * Check if an element should be validated
 */
function shouldValidateElement(element: Element): boolean {
  // Skip if globally silenced
  if (isGloballySilenced) return false;
  
  // Skip if already warned about this element
  if (warnedElements.has(element)) return false;
  
  // Skip if element has opt-out attributes
  if (element.getAttribute('data-design-guard') === 'off') return false;
  if (element.getAttribute('data-allow-unstyled') === 'true') return false;
  
  return true;
}

/**
 * Validate button elements
 */
function validateButton(button: HTMLButtonElement): void {
  if (!shouldValidateElement(button)) return;
  
  const classList = Array.from(button.classList);
  const hasSubwayBtn = classList.some(cls => cls.startsWith('s-btn'));
  
  if (!hasSubwayBtn) {
    console.warn(
      '🎨 Design Guard: Button missing Subway UI class',
      {
        element: button,
        suggestion: 'Add .s-btn class (variants: .s-btn--primary, .s-btn--ghost, .s-btn--sm, .s-btn--md, .s-btn--lg)',
        muteWith: 'data-allow-unstyled="true" or data-design-guard="off"'
      }
    );
    warnedElements.add(button);
  }
}

/**
 * Validate input elements
 */
function validateInput(input: HTMLInputElement): void {
  if (!shouldValidateElement(input)) return;
  
  const hasSubwayInput = input.classList.contains('s-input');
  
  if (!hasSubwayInput) {
    console.warn(
      '🎨 Design Guard: Input missing Subway UI class',
      {
        element: input,
        suggestion: 'Add .s-input class',
        muteWith: 'data-allow-unstyled="true" or data-design-guard="off"'
      }
    );
    warnedElements.add(input);
  }
}

/**
 * Validate select elements
 */
function validateSelect(select: HTMLSelectElement): void {
  if (!shouldValidateElement(select)) return;
  
  const hasSubwaySelect = select.classList.contains('s-select');
  
  if (!hasSubwaySelect) {
    console.warn(
      '🎨 Design Guard: Select missing Subway UI class',
      {
        element: select,
        suggestion: 'Add .s-select class',
        muteWith: 'data-allow-unstyled="true" or data-design-guard="off"'
      }
    );
    warnedElements.add(select);
  }
}

/**
 * Validate textarea elements
 */
function validateTextarea(textarea: HTMLTextAreaElement): void {
  if (!shouldValidateElement(textarea)) return;
  
  const hasSubwayTextarea = textarea.classList.contains('s-textarea');
  
  if (!hasSubwayTextarea) {
    console.warn(
      '🎨 Design Guard: Textarea missing Subway UI class',
      {
        element: textarea,
        suggestion: 'Add .s-textarea class',
        muteWith: 'data-allow-unstyled="true" or data-design-guard="off"'
      }
    );
    warnedElements.add(textarea);
  }
}

/**
 * Validate anchor elements acting as buttons
 */
function validateButtonLink(link: HTMLAnchorElement): void {
  if (!shouldValidateElement(link)) return;
  
  const classList = Array.from(link.classList);
  const hasSubwayBtn = classList.some(cls => cls.startsWith('s-btn'));
  
  if (!hasSubwayBtn) {
    console.warn(
      '🎨 Design Guard: Button link missing Subway UI class',
      {
        element: link,
        suggestion: 'Add .s-btn class (variants: .s-btn--primary, .s-btn--ghost, .s-btn--sm, .s-btn--md, .s-btn--lg)',
        muteWith: 'data-allow-unstyled="true" or data-design-guard="off"'
      }
    );
    warnedElements.add(link);
  }
}

/**
 * Scan and validate all interactive elements in the document
 */
function scanAndValidateElements(): void {
  // Guard against SSR
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Validate buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => validateButton(button));
  
  // Validate inputs
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => validateInput(input));
  
  // Validate selects
  const selects = document.querySelectorAll('select');
  selects.forEach(select => validateSelect(select));
  
  // Validate textareas
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => validateTextarea(textarea));
  
  // Validate button links
  const buttonLinks = document.querySelectorAll('a[role="button"]');
  buttonLinks.forEach(link => validateButtonLink(link as HTMLAnchorElement));
}

/**
 * Design Guard Hook
 * 
 * Monitors the DOM for interactive elements and validates they use proper Subway UI classes.
 * Only runs in non-production environments.
 */
export function useDesignGuard(config: DesignGuardConfig): void {
  const observerRef = useRef<MutationObserver | null>(null);
  
  useEffect(() => {
    // Only run in non-production environments
    if (!config.enabled || process.env.NODE_ENV === 'production') {
      return;
    }
    
    // Guard against SSR
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    console.log('🎨 Design Guard: Monitoring DOM for design consistency');
    
    // Initial scan
    scanAndValidateElements();
    
    // Set up MutationObserver to watch for DOM changes
    observerRef.current = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        // Check for added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if the added element or its children contain interactive elements
            const hasInteractiveElements = 
              element.matches('button, input, select, textarea, a[role="button"]') ||
              element.querySelector('button, input, select, textarea, a[role="button"]');
            
            if (hasInteractiveElements) {
              shouldRescan = true;
            }
          }
        });
      });
      
      if (shouldRescan) {
        // Debounce rescans to avoid excessive validation
        setTimeout(scanAndValidateElements, 100);
      }
    });
    
    // Start observing
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
    
    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [config.enabled]);
}