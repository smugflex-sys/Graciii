import { useEffect, useRef } from 'react';

/**
 * Custom hook for auto-saving form data to localStorage
 * Automatically saves form data every 2 seconds and on unmount
 * 
 * @param formKey - Unique key to identify the form in localStorage
 * @param formData - The form data object to save
 * @param enabled - Whether auto-save is enabled (default: true)
 * @returns Object with clearSavedData function
 */
export function useFormAutoSave<T>(
  formKey: string,
  formData: T,
  enabled: boolean = true
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialLoadRef = useRef<boolean>(true);

  // Auto-save form data to localStorage
  useEffect(() => {
    if (!enabled || initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce save - wait 2 seconds after last change
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(formKey, JSON.stringify(formData));
        console.log(`Form auto-saved: ${formKey}`);
      } catch (error) {
        console.error('Error auto-saving form:', error);
      }
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, formKey, enabled]);

  // Save immediately on unmount (when user navigates away)
  useEffect(() => {
    return () => {
      if (enabled) {
        try {
          localStorage.setItem(formKey, JSON.stringify(formData));
          console.log(`Form saved on unmount: ${formKey}`);
        } catch (error) {
          console.error('Error saving form on unmount:', error);
        }
      }
    };
  }, [formData, formKey, enabled]);

  // Function to clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(formKey);
      console.log(`Cleared saved form: ${formKey}`);
    } catch (error) {
      console.error('Error clearing saved form:', error);
    }
  };

  // Function to get saved data
  const getSavedData = (): T | null => {
    try {
      const saved = localStorage.getItem(formKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error retrieving saved form:', error);
      return null;
    }
  };

  return {
    clearSavedData,
    getSavedData,
  };
}

/**
 * Hook to restore saved form data on component mount
 * 
 * @param formKey - Unique key to identify the form in localStorage
 * @returns The saved form data or null
 */
export function useRestoreFormData<T>(formKey: string): T | null {
  try {
    const saved = localStorage.getItem(formKey);
    if (saved) {
      console.log(`Restored form data: ${formKey}`);
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error restoring form data:', error);
  }
  return null;
}
