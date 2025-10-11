#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TSX files in the admin app
const files = glob.sync('apps/admin/**/*.tsx', { ignore: 'node_modules/**' });

console.log(`Found ${files.length} TSX files to check`);

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix malformed className attributes like: className={s-btn s-btn--md ...}
    // Should be: className="s-btn s-btn--md ..."
    content = content.replace(/className=\{([^}]*s-btn[^}]*)\}/g, (match, classes) => {
      // Remove any existing quotes and clean up the classes
      const cleanClasses = classes.replace(/['"]/g, '').trim();
      modified = true;
      return `className="${cleanClasses}"`;
    });
    
    // Fix broken onChange handlers like: onChange={e=>.value)}
    // Should be: onChange={(e) => setEmail(e.target.value)}
    content = content.replace(/onChange=\{e=>[^}]*\}/g, (match) => {
      if (match.includes('.value)')) {
        modified = true;
        return 'onChange={(e) => /* FIXME: complete handler */}';
      }
      return match;
    });
    
    // Fix broken input type attributes like: type="<input className="s-input" type="password"
    content = content.replace(/type="<input[^"]*"/g, () => {
      modified = true;
      return 'type="text"';
    });
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Done!');