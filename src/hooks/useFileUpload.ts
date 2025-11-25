import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../services/apiService';

interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
  onSuccess?: (files: File[] | File, response?: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  files: File[];
  previewUrls: string[];
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    multiple = false,
    onSuccess,
    onError,
    onProgress,
  } = options;

  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    files: [],
    previewUrls: [],
  });

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`;
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }

    return null;
  }, [maxSize, allowedTypes]);

  const createPreviewUrl = useCallback((file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }, []);

  const selectFiles = useCallback((fileList: FileList) => {
    const files = Array.from(fileList);
    const validFiles: File[] = [];
    const errors: string[] = [];
    const previewUrls: string[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
        const previewUrl = createPreviewUrl(file);
        if (previewUrl) {
          previewUrls.push(previewUrl);
        }
      }
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return false;
    }

    if (!multiple && validFiles.length > 1) {
      toast.error('Only one file is allowed');
      return false;
    }

    setState(prev => ({
      ...prev,
      files: multiple ? [...prev.files, ...validFiles] : validFiles,
      previewUrls: multiple ? [...prev.previewUrls, ...previewUrls] : previewUrls,
      error: null,
    }));

    return true;
  }, [validateFile, createPreviewUrl, multiple]);

  const uploadFiles = useCallback(async (endpoint: string = '/upload') => {
    if (state.files.length === 0) {
      toast.error('No files selected');
      return;
    }

    setState(prev => ({ ...prev, isUploading: true, progress: 0, error: null }));

    try {
      const formData = new FormData();
      
      state.files.forEach((file, index) => {
        formData.append(multiple ? `files[${index}]` : 'file', file);
      });

      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setState(prev => ({ ...prev, progress }));
            onProgress(progress);
          }
        });
      }

      // Promise wrapper for XHR
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));
      });

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.open('POST', `${API_BASE_URL}${endpoint}`);
      xhr.send(formData);

      const response = await uploadPromise;
      
      setState(prev => ({ ...prev, isUploading: false, progress: 100 }));
      
      onSuccess?.(multiple ? state.files : state.files[0], response);
      toast.success('File(s) uploaded successfully');

      // Clear files after successful upload
      setState(prev => ({ ...prev, files: [], previewUrls: [] }));

    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, isUploading: false, error: err.message }));
      onError?.(err);
      toast.error(`Upload failed: ${err.message}`);
    }
  }, [state.files, multiple, onSuccess, onError, onProgress]);

  const removeFile = useCallback((index: number) => {
    setState(prev => {
      const newFiles = [...prev.files];
      const newPreviewUrls = [...prev.previewUrls];
      
      // Revoke object URL to prevent memory leaks
      if (newPreviewUrls[index]) {
        URL.revokeObjectURL(newPreviewUrls[index]);
      }
      
      newFiles.splice(index, 1);
      newPreviewUrls.splice(index, 1);
      
      return {
        ...prev,
        files: newFiles,
        previewUrls: newPreviewUrls,
      };
    });
  }, []);

  const clearFiles = useCallback(() => {
    // Revoke all object URLs
    state.previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      files: [],
      previewUrls: [],
    });
  }, [state.previewUrls]);

  const reset = useCallback(() => {
    clearFiles();
  }, [clearFiles]);

  return {
    // State
    ...state,
    
    // Actions
    selectFiles,
    uploadFiles,
    removeFile,
    clearFiles,
    reset,
    
    // Helpers
    hasFiles: state.files.length > 0,
    totalSize: state.files.reduce((sum, file) => sum + file.size, 0),
  };
}

// Hook for image uploads with preview
export function useImageUpload(options: Omit<FileUploadOptions, 'allowedTypes'> = {}) {
  return useFileUpload({
    ...options,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });
}

// Hook for document uploads
export function useDocumentUpload(options: Omit<FileUploadOptions, 'allowedTypes'> = {}) {
  return useFileUpload({
    ...options,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
  });
}
