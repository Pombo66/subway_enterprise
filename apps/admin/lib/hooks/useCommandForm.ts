/**
 * Hook that integrates Command pattern with form submission
 */

import { useCallback, useState } from 'react';
import { FormCommand } from '../commands/menu-item.commands';
import { useToast } from '../../app/components/ToastProvider';
import { useFormState, FormStateHelpers } from './useFormState';

export const useCommandForm = () => {
  const [formState, formActions] = useFormState();
  const { showSuccess, showError } = useToast();
  const [lastCommand, setLastCommand] = useState<FormCommand | null>(null);

  const executeCommand = useCallback(async (
    command: FormCommand,
    successMessage?: string,
    onSuccess?: () => void
  ) => {
    if (!command.canExecute()) {
      formActions.setError('Command cannot be executed');
      showError('Invalid operation');
      return false;
    }

    formActions.setSubmitting();
    setLastCommand(command);

    try {
      await command.execute();
      formActions.setSuccess();
      if (successMessage) {
        showSuccess(successMessage);
      }
      if (onSuccess) {
        onSuccess();
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      formActions.setError(errorMessage);
      showError(errorMessage);
      return false;
    }
  }, [formActions, showSuccess, showError]);

  const retryLastCommand = useCallback(async () => {
    if (lastCommand) {
      return executeCommand(lastCommand);
    }
    return false;
  }, [lastCommand, executeCommand]);

  const canRetry = useCallback(() => {
    return lastCommand !== null && FormStateHelpers.isError(formState);
  }, [lastCommand, formState]);

  return {
    executeCommand,
    retryLastCommand,
    canRetry,
    formState,
    isLoading: FormStateHelpers.isLoading(formState),
    isError: FormStateHelpers.isError(formState),
    isSuccess: FormStateHelpers.isSuccess(formState)
  };
};