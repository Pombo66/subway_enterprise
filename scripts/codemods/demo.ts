#!/usr/bin/env ts-node

/**
 * Demo script for the Subway UI class codemod
 * Shows examples of what the codemod will do without making changes
 */

import * as path from 'path';

interface DemoExample {
  title: string;
  description: string;
  before: string;
  after: string;
  explanation: string;
}

const DEMO_EXAMPLES: DemoExample[] = [
  {
    title: 'Basic Button',
    description: 'Adding base classes to a simple button',
    before: '<button onClick={handleSubmit}>Submit</button>',
    after: '<button className="s-btn s-btn--md" onClick={handleSubmit}>Submit</button>',
    explanation: 'Adds the base Subway button classes for consistent styling'
  },
  {
    title: 'Button with Existing Classes',
    description: 'Preserving existing Tailwind classes',
    before: '<button className="bg-blue-500 hover:bg-blue-700 text-white">Save</button>',
    after: '<button className="s-btn s-btn--md bg-blue-500 hover:bg-blue-700 text-white">Save</button>',
    explanation: 'Prepends base classes while keeping existing utility classes'
  },
  {
    title: 'Form Input',
    description: 'Adding base classes to form inputs',
    before: '<input type="email" placeholder="Enter your email" />',
    after: '<input className="s-input" type="email" placeholder="Enter your email" />',
    explanation: 'Adds consistent input styling across the application'
  },
  {
    title: 'Select Dropdown',
    description: 'Styling select elements',
    before: '<select name="country"><option value="us">United States</option></select>',
    after: '<select className="s-select" name="country"><option value="us">United States</option></select>',
    explanation: 'Ensures consistent dropdown styling'
  },
  {
    title: 'Textarea',
    description: 'Adding base classes to textarea elements',
    before: '<textarea placeholder="Enter your message" rows={4}></textarea>',
    after: '<textarea className="s-textarea" placeholder="Enter your message" rows={4}></textarea>',
    explanation: 'Applies consistent textarea styling'
  },
  {
    title: 'Link Button',
    description: 'Styling anchors that act as buttons',
    before: '<a role="button" onClick={handleAction}>Action Link</a>',
    after: '<a className="s-btn s-btn--md" role="button" onClick={handleAction}>Action Link</a>',
    explanation: 'Treats anchors with role="button" as buttons for styling'
  },
  {
    title: 'Dynamic Classes',
    description: 'Handling JSX expressions in className',
    before: '<button className={isActive ? "active" : "inactive"}>Toggle</button>',
    after: '<button className={"s-btn s-btn--md" + " " + (isActive ? "active" : "inactive")}>Toggle</button>',
    explanation: 'Safely prepends base classes to dynamic className expressions'
  },
  {
    title: 'Skip Unstyled Elements',
    description: 'Respecting the data-allow-unstyled attribute',
    before: '<button data-allow-unstyled="true">Custom Styled Button</button>',
    after: '<button data-allow-unstyled="true">Custom Styled Button</button>',
    explanation: 'Elements with data-allow-unstyled="true" are left unchanged'
  }
];

class CodemodDemo {
  async showDemo(): Promise<void> {
    console.log('🎨 Subway UI Class Codemod Demo');
    console.log('===============================\\n');

    console.log('This codemod automatically adds Subway UI base classes to JSX elements');
    console.log('to ensure consistent styling across the admin application.\\n');

    console.log('📋 What it does:');
    console.log('• Adds "s-btn s-btn--md" to <button> and <a role="button"> elements');
    console.log('• Adds "s-input" to <input> elements (except type="hidden")');
    console.log('• Adds "s-select" to <select> elements');
    console.log('• Adds "s-textarea" to <textarea> elements');
    console.log('• Preserves existing className values');
    console.log('• Respects data-allow-unstyled="true" attribute');
    console.log('• Handles both string literals and JSX expressions\\n');

    console.log('🔍 Examples:');
    console.log('=============\\n');

    for (let i = 0; i < DEMO_EXAMPLES.length; i++) {
      const example = DEMO_EXAMPLES[i];

      console.log(`${i + 1}. ${example.title}`);
      console.log(`   ${example.description}\\n`);

      console.log('   Before:');
      console.log(`   ${example.before}\\n`);

      console.log('   After:');
      console.log(`   ${example.after}\\n`);

      console.log(`   💡 ${example.explanation}\\n`);

      if (i < DEMO_EXAMPLES.length - 1) {
        console.log('   ' + '-'.repeat(60) + '\\n');
      }
    }

    console.log('🚀 Usage:');
    console.log('=========\\n');

    console.log('# Dry run (see what would change):');
    console.log('pnpm design:fix:dry\\n');

    console.log('# Apply changes:');
    console.log('pnpm design:fix\\n');

    console.log('# Run on specific files:');
    console.log('pnpm design:fix:dry --include="apps/admin/app/components/**/*.tsx"\\n');

    console.log('# Run on files changed since main branch:');
    console.log('pnpm design:fix:dry --since=main\\n');

    console.log('# Exclude certain patterns:');
    console.log('pnpm design:fix:dry --exclude="**/*.test.tsx"\\n');

    console.log('🛡️ Safety Features:');
    console.log('===================\\n');

    console.log('• Dry run by default - no changes without --write flag');
    console.log('• Preserves all existing className values');
    console.log('• Skips elements with data-allow-unstyled="true"');
    console.log('• Handles TypeScript/JSX parsing safely');
    console.log('• Provides detailed before/after output for review');
    console.log('• Can be run multiple times safely (idempotent)');
    console.log('• Works with git integration for targeted changes\\n');

    console.log('📊 Output:');
    console.log('==========\\n');

    console.log('The codemod provides a detailed summary showing:');
    console.log('• Files processed and changes made');
    console.log('• Before/after snippets for each change');
    console.log('• Line numbers for easy review');
    console.log('• Total count of modifications');
    console.log('• Clear indication of dry run vs actual changes\\n');

    console.log('Ready to improve your UI consistency! 🎯');
  }
}

async function main() {
  const demo = new CodemodDemo();
  await demo.showDemo();
}

if (require.main === module) {
  main().catch(console.error);
}

export { CodemodDemo };