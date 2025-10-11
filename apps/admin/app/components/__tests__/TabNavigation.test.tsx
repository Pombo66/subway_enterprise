import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import TabNavigation, { TabItem } from '../TabNavigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

const mockTabs: TabItem[] = [
  {
    key: 'items',
    label: 'Items',
    href: '/menu/items',
    icon: <span data-testid="items-icon">📄</span>
  },
  {
    key: 'categories',
    label: 'Categories',
    href: '/menu/categories',
    icon: <span data-testid="categories-icon">📁</span>
  },
  {
    key: 'modifiers',
    label: 'Modifiers',
    href: '/menu/modifiers'
  }
];

describe('TabNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/menu/items');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders all tabs with correct labels', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Modifiers')).toBeInTheDocument();
  });

  test('renders icons when provided', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    expect(screen.getByTestId('items-icon')).toBeInTheDocument();
    expect(screen.getByTestId('categories-icon')).toBeInTheDocument();
  });

  test('sets correct active tab based on pathname', () => {
    mockUsePathname.mockReturnValue('/menu/categories');
    render(<TabNavigation tabs={mockTabs} />);
    
    const categoriesTab = screen.getByRole('tab', { name: /categories/i });
    expect(categoriesTab).toHaveClass('active');
    expect(categoriesTab).toHaveAttribute('aria-selected', 'true');
  });

  test('uses explicit activeTab prop when provided', () => {
    render(<TabNavigation tabs={mockTabs} activeTab="modifiers" />);
    
    const modifiersTab = screen.getByRole('tab', { name: /modifiers/i });
    expect(modifiersTab).toHaveClass('active');
    expect(modifiersTab).toHaveAttribute('aria-selected', 'true');
  });

  test('sets correct ARIA attributes', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Section navigation');
    
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab, index) => {
      expect(tab).toHaveAttribute('aria-controls', `tabpanel-${mockTabs[index].key}`);
    });
  });

  test('handles keyboard navigation - arrow right', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const firstTab = screen.getByRole('tab', { name: /items/i });
    const secondTab = screen.getByRole('tab', { name: /categories/i });
    
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    
    expect(secondTab).toHaveFocus();
  });

  test('handles keyboard navigation - arrow left', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const firstTab = screen.getByRole('tab', { name: /items/i });
    const secondTab = screen.getByRole('tab', { name: /categories/i });
    
    secondTab.focus();
    fireEvent.keyDown(secondTab, { key: 'ArrowLeft' });
    
    expect(firstTab).toHaveFocus();
  });

  test('handles keyboard navigation - home key', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const firstTab = screen.getByRole('tab', { name: /items/i });
    const lastTab = screen.getByRole('tab', { name: /modifiers/i });
    
    lastTab.focus();
    fireEvent.keyDown(lastTab, { key: 'Home' });
    
    expect(firstTab).toHaveFocus();
  });

  test('handles keyboard navigation - end key', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const firstTab = screen.getByRole('tab', { name: /items/i });
    const lastTab = screen.getByRole('tab', { name: /modifiers/i });
    
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'End' });
    
    expect(lastTab).toHaveFocus();
  });

  test('wraps around when navigating with arrow keys', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const firstTab = screen.getByRole('tab', { name: /items/i });
    const lastTab = screen.getByRole('tab', { name: /modifiers/i });
    
    // Navigate right from last tab should wrap to first
    lastTab.focus();
    fireEvent.keyDown(lastTab, { key: 'ArrowRight' });
    expect(firstTab).toHaveFocus();
    
    // Navigate left from first tab should wrap to last
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
    expect(lastTab).toHaveFocus();
  });

  test('sets correct tabIndex for active and inactive tabs', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const activeTab = screen.getByRole('tab', { name: /items/i });
    const inactiveTabs = [
      screen.getByRole('tab', { name: /categories/i }),
      screen.getByRole('tab', { name: /modifiers/i })
    ];
    
    expect(activeTab).toHaveAttribute('tabIndex', '0');
    inactiveTabs.forEach(tab => {
      expect(tab).toHaveAttribute('tabIndex', '-1');
    });
  });

  test('applies custom className when provided', () => {
    const { container } = render(
      <TabNavigation tabs={mockTabs} className="custom-class" />
    );
    
    const tabNavigation = container.querySelector('.tab-navigation');
    expect(tabNavigation).toHaveClass('custom-class');
  });

  test('ignores non-navigation keys', () => {
    render(<TabNavigation tabs={mockTabs} />);
    
    const firstTab = screen.getByRole('tab', { name: /items/i });
    firstTab.focus();
    
    // These keys should not change focus
    fireEvent.keyDown(firstTab, { key: 'Enter' });
    fireEvent.keyDown(firstTab, { key: 'Space' });
    fireEvent.keyDown(firstTab, { key: 'Escape' });
    
    expect(firstTab).toHaveFocus();
  });
});