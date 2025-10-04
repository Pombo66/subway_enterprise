/**
 * Command pattern implementation for menu item operations
 */

import { CreateMenuItemData } from '../types';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { ValidationError } from '../errors';
import { ValidationStrategy, MenuItemValidationStrategy } from '../validation/strategies';

export interface FormCommand {
  execute(): Promise<void>;
  canExecute(): boolean;
}

export class CreateMenuItemCommand implements FormCommand {
  private validator: ValidationStrategy<CreateMenuItemData>;

  constructor(
    private data: CreateMenuItemData,
    private repository: MenuItemRepository,
    private onSuccess: () => void,
    private onError: (error: string) => void,
    validator?: ValidationStrategy<CreateMenuItemData>
  ) {
    this.validator = validator || new MenuItemValidationStrategy();
  }

  canExecute(): boolean {
    const result = this.validator.validate(this.data);
    return result.success;
  }

  async execute(): Promise<void> {
    const validationResult = this.validator.validate(this.data);
    
    if (!validationResult.success) {
      const firstError = Object.values(validationResult.errors)[0];
      this.onError(firstError || 'Invalid form data');
      return;
    }

    try {
      await this.repository.create(this.data);
      this.onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.onError(errorMessage);
    }
  }
}

export class UpdateMenuItemCommand implements FormCommand {
  constructor(
    private id: string,
    private data: Partial<CreateMenuItemData>,
    private repository: MenuItemRepository,
    private onSuccess: () => void,
    private onError: (error: string) => void
  ) {}

  canExecute(): boolean {
    return !!this.id && Object.keys(this.data).length > 0;
  }

  async execute(): Promise<void> {
    if (!this.canExecute()) {
      this.onError('Invalid update data');
      return;
    }

    try {
      await this.repository.update(this.id, this.data);
      this.onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.onError(errorMessage);
    }
  }
}

export class DeleteMenuItemCommand implements FormCommand {
  constructor(
    private id: string,
    private repository: MenuItemRepository,
    private onSuccess: () => void,
    private onError: (error: string) => void
  ) {}

  canExecute(): boolean {
    return !!this.id;
  }

  async execute(): Promise<void> {
    if (!this.canExecute()) {
      this.onError('Invalid item ID');
      return;
    }

    try {
      await this.repository.delete(this.id);
      this.onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.onError(errorMessage);
    }
  }
}