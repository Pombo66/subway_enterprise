module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce UI class conventions for consistent design system usage',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      missingButtonClass: 'Button elements must include "s-btn" class. Add className="s-btn s-btn--md"',
      missingInputClass: 'Input elements must include "s-input" class. Add className="s-input"',
      missingSelectClass: 'Select elements must include "s-select" class. Add className="s-select"',
      missingTextareaClass: 'Textarea elements must include "s-textarea" class. Add className="s-textarea"',
    },
  },

  create(context) {
    function getClassNameValue(node) {
      const classNameAttr = node.attributes.find(
        attr => attr.type === 'JSXAttribute' && attr.name.name === 'className'
      );
      
      if (!classNameAttr || !classNameAttr.value) return null;
      
      // Handle string literals
      if (classNameAttr.value.type === 'Literal') {
        return classNameAttr.value.value;
      }
      
      // Handle JSX expressions - be conservative, only check simple cases
      if (classNameAttr.value.type === 'JSXExpressionContainer') {
        const expression = classNameAttr.value.expression;
        
        // Simple template literals
        if (expression.type === 'TemplateLiteral' && expression.quasis.length === 1) {
          return expression.quasis[0].value.cooked;
        }
        
        // Simple string literals in expressions
        if (expression.type === 'Literal' && typeof expression.value === 'string') {
          return expression.value;
        }
        
        // For complex expressions (clsx, conditional, etc.), return null to avoid false positives
        return null;
      }
      
      return null;
    }

    function hasOptOut(node) {
      return node.attributes.some(
        attr => 
          attr.type === 'JSXAttribute' && 
          attr.name.name === 'data-allow-unstyled' &&
          attr.value &&
          ((attr.value.type === 'Literal' && attr.value.value === true) ||
           (attr.value.type === 'JSXExpressionContainer' && 
            attr.value.expression.type === 'Literal' && 
            attr.value.expression.value === true))
      );
    }

    function checkElement(node, elementName, requiredClass, messageId) {
      if (hasOptOut(node)) return;
      
      const className = getClassNameValue(node);
      
      // Only report if we can confidently determine the className is missing the required class
      if (className !== null && !className.includes(requiredClass)) {
        context.report({
          node,
          messageId,
        });
      }
    }

    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name;
        
        // Handle button elements
        if (elementName === 'button') {
          checkElement(node, 'button', 's-btn', 'missingButtonClass');
        }
        
        // Handle input elements (exclude hidden inputs)
        else if (elementName === 'input') {
          const typeAttr = node.attributes.find(
            attr => attr.type === 'JSXAttribute' && attr.name.name === 'type'
          );
          
          const isHidden = typeAttr && 
            typeAttr.value && 
            typeAttr.value.type === 'Literal' && 
            typeAttr.value.value === 'hidden';
            
          if (!isHidden) {
            checkElement(node, 'input', 's-input', 'missingInputClass');
          }
        }
        
        // Handle select elements
        else if (elementName === 'select') {
          checkElement(node, 'select', 's-select', 'missingSelectClass');
        }
        
        // Handle textarea elements
        else if (elementName === 'textarea') {
          checkElement(node, 'textarea', 's-textarea', 'missingTextareaClass');
        }
        
        // Handle anchor elements with role="button"
        else if (elementName === 'a') {
          const roleAttr = node.attributes.find(
            attr => attr.type === 'JSXAttribute' && attr.name.name === 'role'
          );
          
          const isButton = roleAttr && 
            roleAttr.value && 
            roleAttr.value.type === 'Literal' && 
            roleAttr.value.value === 'button';
            
          if (isButton) {
            checkElement(node, 'a', 's-btn', 'missingButtonClass');
          }
        }
      },
    };
  },
};