/**
 * Enhanced Page Object Model with comprehensive testing utilities
 */

import { RenderResult, fireEvent, waitFor, screen } from '@testing-library/react';
import { CreateMenuItemData } from '../types';

export class EnhancedItemDrawerPageObject {
  constructor(private component: RenderResult) {}

  // Element getters with better error handling
  get nameInput(): HTMLInputElement {
    const element = this.component.getByLabelText('Item Name *');
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('Name input is not an HTMLInputElement');
    }
    return element;
  }

  get priceInput(): HTMLInputElement {
    const element = this.component.getByLabelText('Price ($) *');
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('Price input is not an HTMLInputElement');
    }
    return element;
  }

  get storeSelect(): HTMLSelectElement {
    const element = this.component.getByLabelText('Store *');
    if (!(element instanceof HTMLSelectElement)) {
      throw new Error('Store select is not an HTMLSelectElement');
    }
    return element;
  }

  get activeCheckbox(): HTMLInputElement {
    const element = this.component.getByRole('checkbox', { name: 'Active' });
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('Active checkbox is not an HTMLInputElement');
    }
    return element;
  }

  get submitButton(): HTMLButtonElement {
    return this.component.getByText('Create Item') as HTMLButtonElement;
  }

  get createAnotherButton(): HTMLButtonElement {
    return this.component.getByText('Create & Add Another') as HTMLButtonElement;
  }

  get cancelButton(): HTMLButtonElement {
    return this.component.getByText('Cancel') as HTMLButtonElement;
  }

  get closeButton(): HTMLButtonElement {
    return this.component.getByLabelText('Close dialog') as HTMLButtonElement;
  }

  // Form interaction methods
  async fillName(name: string): Promise<void> {
    fireEvent.change(this.nameInput, { target: { value: name } });
    await this.waitForValidation();
  }

  async fillPrice(price: string): Promise<void> {
    fireEvent.change(this.priceInput, { target: { value: price } });
    await this.waitForValidation();
  }

  async selectStore(storeId: string): Promise<void> {
    fireEvent.change(this.storeSelect, { target: { value: storeId } });
    await this.waitForValidation();
  }

  async toggleActive(): Promise<void> {
    fireEvent.click(this.activeCheckbox);
  }

  async fillForm(data: Partial<CreateMenuItemData>): Promise<void> {
    if (data.name !== undefined) {
      await this.fillName(data.name);
    }
    if (data.price !== undefined) {
      await this.fillPrice(data.price);
    }
    if (data.storeId !== undefined) {
      await this.selectStore(data.storeId);
    }
    if (data.active !== undefined && data.active !== this.activeCheckbox.checked) {
      await this.toggleActive();
    }
  }

  // Action methods
  async submit(): Promise<void> {
    fireEvent.click(this.submitButton);
    await this.waitForSubmission();
  }

  async submitAndCreateAnother(): Promise<void> {
    fireEvent.click(this.createAnotherButton);
    await this.waitForSubmission();
  }

  async cancel(): Promise<void> {
    fireEvent.click(this.cancelButton);
  }

  async close(): Promise<void> {
    fireEvent.click(this.closeButton);
  }

  // State checking methods
  isSubmitting(): boolean {
    return this.component.queryByText('Creating...') !== null;
  }

  isDisabled(): boolean {
    return this.submitButton.disabled;
  }

  hasError(field?: string): boolean {
    if (field) {
      return this.getErrorMessage(field) !== null;
    }
    return this.component.queryByText(/error/i) !== null;
  }

  getErrorMessage(field: string): HTMLElement | null {
    const fieldMap: Record<string, string> = {
      name: 'name-error',
      price: 'price-error',
      store: 'store-error',
      general: 'general-error'
    };
    
    const errorId = fieldMap[field];
    if (errorId) {
      return this.component.queryByTestId(errorId);
    }
    
    return this.component.queryByText(new RegExp(field, 'i'));
  }

  getFormValues(): Partial<CreateMenuItemData> {
    return {
      name: this.nameInput.value,
      price: this.priceInput.value,
      storeId: this.storeSelect.value,
      active: this.activeCheckbox.checked
    };
  }

  // Validation helpers
  async waitForValidation(timeout: number = 1000): Promise<void> {
    await waitFor(() => {
      // Wait for any validation indicators to appear/disappear
      expect(this.component.queryByText('Validating...')).not.toBeInTheDocument();
    }, { timeout });
  }

  async waitForSubmission(timeout: number = 5000): Promise<void> {
    await waitFor(() => {
      expect(this.isSubmitting()).toBe(false);
    }, { timeout });
  }

  async waitForSuccess(timeout: number = 5000): Promise<void> {
    await waitFor(() => {
      expect(screen.queryByText(/created successfully/i)).toBeInTheDocument();
    }, { timeout });
  }

  async waitForError(timeout: number = 5000): Promise<void> {
    await waitFor(() => {
      expect(this.hasError()).toBe(true);
    }, { timeout });
  }

  // Accessibility helpers
  checkAccessibility(): void {
    // Check for proper labels
    expect(this.nameInput).toHaveAttribute('aria-describedby');
    expect(this.priceInput).toHaveAttribute('aria-describedby');
    expect(this.storeSelect).toHaveAttribute('aria-describedby');
    
    // Check for proper roles
    expect(this.component.getByRole('dialog')).toBeInTheDocument();
    
    // Check for keyboard navigation
    expect(this.submitButton).toHaveAttribute('type', 'submit');
  }

  // Performance helpers
  async measureFormFillTime(): Promise<number> {
    const startTime = performance.now();
    
    await this.fillForm({
      name: 'Test Item',
      price: '12.99',
      storeId: 'store-1'
    });
    
    return performance.now() - startTime;
  }

  // Snapshot testing
  takeSnapshot(): string {
    return this.component.container.innerHTML;
  }

  // Custom matchers
  expectFormToBeValid(): void {
    expect(this.canSubmit()).toBe(true);
    expect(this.hasError()).toBe(false);
  }

  expectFormToBeInvalid(): void {
    expect(this.canSubmit()).toBe(false);
    expect(this.hasError()).toBe(true);
  }

  private canSubmit(): boolean {
    return !this.submitButton.disabled && !this.isSubmitting();
  }
}

// Test data builders with validation
export class TestDataBuilder {
  private data: Partial<CreateMenuItemData> = {};

  static create(): TestDataBuilder {
    return new TestDataBuilder();
  }

  withName(name: string): TestDataBuilder {
    this.data.name = name;
    return this;
  }

  withPrice(price: string): TestDataBuilder {
    this.data.price = price;
    return this;
  }

  withStore(storeId: string): TestDataBuilder {
    this.data.storeId = storeId;
    return this;
  }

  withActive(active: boolean): TestDataBuilder {
    this.data.active = active;
    return this;
  }

  // Preset builders
  validItem(): TestDataBuilder {
    return this
      .withName('Test Menu Item')
      .withPrice('12.99')
      .withStore('store-1')
      .withActive(true);
  }

  invalidItem(): TestDataBuilder {
    return this
      .withName('')
      .withPrice('-5.00')
      .withStore('')
      .withActive(true);
  }

  expensiveItem(): TestDataBuilder {
    return this
      .withName('Premium Item')
      .withPrice('999.99')
      .withStore('store-1')
      .withActive(true);
  }

  build(): CreateMenuItemData {
    return {
      name: this.data.name || '',
      price: this.data.price || '',
      storeId: this.data.storeId || '',
      active: this.data.active ?? true
    };
  }
}

// Test scenario helpers
export class TestScenarios {
  static async fillValidForm(pageObject: EnhancedItemDrawerPageObject): Promise<void> {
    const data = TestDataBuilder.create().validItem().build();
    await pageObject.fillForm(data);
  }

  static async fillInvalidForm(pageObject: EnhancedItemDrawerPageObject): Promise<void> {
    const data = TestDataBuilder.create().invalidItem().build();
    await pageObject.fillForm(data);
  }

  static async testFormValidation(pageObject: EnhancedItemDrawerPageObject): Promise<void> {
    // Test empty form
    await pageObject.fillForm({ name: '', price: '', storeId: '' });
    pageObject.expectFormToBeInvalid();

    // Test valid form
    await TestScenarios.fillValidForm(pageObject);
    pageObject.expectFormToBeValid();
  }

  static async testSuccessfulSubmission(pageObject: EnhancedItemDrawerPageObject): Promise<void> {
    await TestScenarios.fillValidForm(pageObject);
    await pageObject.submit();
    await pageObject.waitForSuccess();
  }

  static async testFormReset(pageObject: EnhancedItemDrawerPageObject): Promise<void> {
    await TestScenarios.fillValidForm(pageObject);
    await pageObject.cancel();
    
    // Verify form is reset
    const values = pageObject.getFormValues();
    expect(values.name).toBe('');
    expect(values.price).toBe('');
    expect(values.storeId).toBe('');
  }
}