/**
 * Page Object Model for component testing
 */

import { RenderResult } from '@testing-library/react';
import { fireEvent, waitFor } from '@testing-library/react';
import { CreateMenuItemData } from '../types';

export class ItemDrawerPageObject {
  constructor(private component: RenderResult) {}

  get nameInput() {
    return this.component.getByLabelText('Item Name *');
  }

  get priceInput() {
    return this.component.getByLabelText('Price ($) *');
  }

  get storeSelect() {
    return this.component.getByLabelText('Store *');
  }

  get activeCheckbox() {
    return this.component.getByRole('checkbox', { name: 'Active' });
  }

  get submitButton() {
    return this.component.getByText('Create Item');
  }

  get createAnotherButton() {
    return this.component.getByText('Create & Add Another');
  }

  get cancelButton() {
    return this.component.getByText('Cancel');
  }

  get closeButton() {
    return this.component.getByLabelText('Close dialog');
  }

  async fillForm(data: Partial<CreateMenuItemData>) {
    if (data.name !== undefined) {
      fireEvent.change(this.nameInput, { target: { value: data.name } });
    }
    if (data.price !== undefined) {
      fireEvent.change(this.priceInput, { target: { value: data.price } });
    }
    if (data.storeId !== undefined) {
      fireEvent.change(this.storeSelect, { target: { value: data.storeId } });
    }
    if (data.active !== undefined) {
      if (data.active !== this.activeCheckbox.checked) {
        fireEvent.click(this.activeCheckbox);
      }
    }
  }

  async submit() {
    fireEvent.click(this.submitButton);
  }

  async submitAndCreateAnother() {
    fireEvent.click(this.createAnotherButton);
  }

  async cancel() {
    fireEvent.click(this.cancelButton);
  }

  async close() {
    fireEvent.click(this.closeButton);
  }

  getErrorMessage(field: string) {
    return this.component.queryByText(new RegExp(field, 'i'));
  }

  async waitForSubmission() {
    await waitFor(() => {
      expect(this.component.queryByText('Creating...')).not.toBeInTheDocument();
    });
  }

  isSubmitting() {
    return this.component.queryByText('Creating...') !== null;
  }
}

export const createMockMenuItemData = (overrides?: Partial<CreateMenuItemData>): CreateMenuItemData => ({
  name: 'Test Item',
  price: '12.99',
  active: true,
  storeId: 'store-1',
  ...overrides
});