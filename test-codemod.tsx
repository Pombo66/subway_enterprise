// Test file for codemod functionality
export default function TestComponent() {
  return (
    <div>
      {/* Should get s-btn s-btn--md */}
      <button onClick={() => console.log('click')}>
        Click me
      </button>
      
      {/* Should get s-input */}
      <input type="text" placeholder="Enter text" />
      
      {/* Should be skipped - hidden input */}
      <input type="hidden" value="secret" />
      
      {/* Should be skipped - has data-allow-unstyled */}
      <button data-allow-unstyled={true} onClick={() => {}}>
        Custom styled
      </button>
      
      {/* Should get s-select */}
      <select>
        <option>Option 1</option>
      </select>
      
      {/* Should get s-textarea */}
      <textarea placeholder="Enter message" />
      
      {/* Should get s-btn s-btn--md - role button */}
      <a role="button" onClick={() => {}}>
        Link button
      </a>
      
      {/* Should be skipped - regular link without role */}
      <a href="/home">Home</a>
      
      {/* Should preserve existing classes */}
      <button className="bg-red-500 text-white">
        Existing classes
      </button>
      
      {/* Should skip - already has base classes */}
      <button className="s-btn s-btn--md bg-blue-500">
        Already styled
      </button>
    </div>
  );
}