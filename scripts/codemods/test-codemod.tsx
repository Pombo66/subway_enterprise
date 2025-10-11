/**
 * Test file for the Subway UI codemod
 * This file contains various JSX elements that should be transformed
 */

import React from 'react';

export function TestComponent() {
  return (
    <div>
      {/* These elements should get base classes added */}
      <button onClick={() => {}}>Click me</button>
      <input type="text" placeholder="Enter text" />
      <select>
        <option>Option 1</option>
      </select>
      <textarea placeholder="Enter description" />
      <a role="button" href="#" onClick={() => {}}>Link Button</a>

      {/* These should be skipped */}
      <input type="hidden" value="secret" />
      <button data-allow-unstyled={true}>Unstyled Button</button>
      <a href="/link">Regular Link</a>

      {/* These already have classes and should get base classes prepended */}
      <button className="custom-btn">Custom Button</button>
      <input className="large" type="email" />
      
      {/* Complex className expressions */}
      <button className={`btn ${isActive ? 'active' : ''}`}>Dynamic Button</button>
      <input className={inputClasses} type="text" />
      
      {/* Self-closing elements */}
      <input type="text" />
      <input type="checkbox" />
    </div>
  );
}

export function AlreadyStyledComponent() {
  return (
    <div>
      {/* These already have the base classes */}
      <button className="s-btn s-btn--md primary">Already Styled</button>
      <input className="s-input large" type="text" />
      <select className="s-select">
        <option>Already Styled Select</option>
      </select>
    </div>
  );
}