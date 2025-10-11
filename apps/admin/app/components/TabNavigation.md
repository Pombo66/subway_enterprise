# TabNavigation Component

A reusable tab navigation component for section-level navigation in the Subway Enterprise admin dashboard.

## Features

- **Consistent Styling**: Matches existing design patterns and theme variables
- **Keyboard Navigation**: Full keyboard accessibility support
- **Responsive Design**: Adapts to mobile screens with vertical layout
- **ARIA Compliance**: Proper accessibility attributes for screen readers
- **Active State Management**: Automatic active tab detection based on current route
- **Icon Support**: Optional icons for each tab

## Usage

### Basic Usage

```tsx
import TabNavigation, { TabItem } from '@/app/components/TabNavigation';

const tabs: TabItem[] = [
  {
    key: 'items',
    label: 'Items',
    href: '/menu/items'
  },
  {
    key: 'categories',
    label: 'Categories',
    href: '/menu/categories'
  }
];

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TabNavigation tabs={tabs} />
      {children}
    </div>
  );
}
```

### With Icons

```tsx
const tabsWithIcons: TabItem[] = [
  {
    key: 'items',
    label: 'Items',
    href: '/menu/items',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 2h10l3 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7l3-5Z"/>
      </svg>
    )
  }
];
```

### With Explicit Active Tab

```tsx
<TabNavigation tabs={tabs} activeTab="categories" />
```

## Props

### TabNavigationProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tabs` | `TabItem[]` | Yes | - | Array of tab configuration objects |
| `activeTab` | `string` | No | Auto-detected from pathname | Key of the currently active tab |
| `className` | `string` | No | `''` | Additional CSS classes to apply |

### TabItem

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | Yes | Unique identifier for the tab |
| `label` | `string` | Yes | Display text for the tab |
| `href` | `string` | Yes | Navigation URL for the tab |
| `icon` | `ReactNode` | No | Optional icon element |

## Keyboard Navigation

The component supports full keyboard navigation:

- **Arrow Left/Right**: Navigate between tabs
- **Home**: Jump to first tab
- **End**: Jump to last tab
- **Tab**: Standard focus navigation
- **Enter/Space**: Activate focused tab (handled by Next.js Link)

Navigation wraps around (last tab → first tab and vice versa).

## Accessibility Features

- **ARIA Roles**: Uses `tablist` and `tab` roles
- **ARIA Attributes**: Proper `aria-selected`, `aria-controls`, and `aria-label` attributes
- **Focus Management**: Correct `tabIndex` values for keyboard navigation
- **Screen Reader Support**: Clear labeling and navigation context

## Styling

The component uses CSS classes that integrate with the existing theme:

- `.tab-navigation`: Main container
- `.tab-link`: Individual tab links
- `.tab-link.active`: Active tab styling
- `.tab-icon`: Icon container
- `.tab-label`: Label text

### CSS Variables Used

- `--s-panel`: Background colors
- `--s-border`: Border colors
- `--s-text`, `--s-muted`, `--s-head`: Text colors
- `--s-accent`: Active tab accent color

## Responsive Behavior

- **Desktop**: Horizontal layout with bottom accent line for active tab
- **Mobile (≤640px)**: Vertical layout with left accent border for active tab

## Examples

### Menu Section Navigation

```tsx
const menuTabs: TabItem[] = [
  {
    key: 'items',
    label: 'Items',
    href: '/menu/items',
    icon: <ItemsIcon />
  },
  {
    key: 'categories',
    label: 'Categories',
    href: '/menu/categories',
    icon: <CategoriesIcon />
  },
  {
    key: 'modifiers',
    label: 'Modifiers',
    href: '/menu/modifiers',
    icon: <ModifiersIcon />
  },
  {
    key: 'pricing',
    label: 'Pricing',
    href: '/menu/pricing',
    icon: <PricingIcon />
  }
];
```

### Settings Section Navigation

```tsx
const settingsTabs: TabItem[] = [
  {
    key: 'users',
    label: 'Users & Roles',
    href: '/settings/users',
    icon: <UsersIcon />
  },
  {
    key: 'audit',
    label: 'Audit Log',
    href: '/settings/audit',
    icon: <AuditIcon />
  },
  {
    key: 'flags',
    label: 'Feature Flags',
    href: '/settings/flags',
    icon: <FlagsIcon />
  }
];
```

## Integration with Next.js

The component automatically detects the active tab based on the current pathname using Next.js `usePathname()` hook. It works seamlessly with Next.js routing and Link components.

## Testing

The component includes comprehensive unit tests covering:

- Rendering and display
- Active state management
- Keyboard navigation
- ARIA attributes
- Responsive behavior
- Edge cases

Run tests with:
```bash
pnpm test TabNavigation.test.tsx
```

## Design Consistency

The TabNavigation component maintains consistency with the existing Subway Enterprise design system:

- Uses established color variables and spacing
- Follows existing interaction patterns
- Integrates with current typography and iconography
- Maintains visual hierarchy and accessibility standards