import React, { useRef, ChangeEvent } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Upload, X, File, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';
import { useFileUpload, useImageUpload, useDocumentUpload } from '../../hooks/useFileUpload';

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  endpoint?: string;
  onUpload?: (files: File[] | File, response?: any) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  type?: 'image' | 'document' | 'any';
}

export function FileUpload({
  accept,
  maxSize,
  multiple = false,
  endpoint = '/upload',
  onUpload,
  onError,
  disabled = false,
  className = '',
  type = 'any',
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Choose appropriate hook based on type
  const uploadHook = type === 'image' 
    ? useImageUpload({ maxSize, multiple, onSuccess: onUpload, onError })
    : type === 'document'
    ? useDocumentUpload({ maxSize, multiple, onSuccess: onUpload, onError })
    : useFileUpload({ maxSize, multiple, onSuccess: onUpload, onError });

  const {
    files,
    previewUrls,
    isUploading,
    progress,
    error,
    selectFiles,
    uploadFiles,
    removeFile,
    clearFiles,
    hasFiles,
  } = uploadHook;

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList) {
      selectFiles(fileList);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('excel')) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = () => {
    uploadFiles(endpoint);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
        
        <div className="space-y-2">
          <Upload className="w-8 h-8 mx-auto text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {type === 'image' ? 'PNG, JPG, GIF up to ' : type === 'document' ? 'PDF, DOC, DOCX up to ' : 'Files up to '}
              {maxSize ? formatFileSize(maxSize) : '5MB'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            Select Files
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {hasFiles && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFiles}
                  disabled={isUploading}
                >
                  Clear all
                </Button>
              </div>

              {/* Files */}
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    {/* Preview or Icon */}
                    {previewUrls[index] ? (
                      <img
                        src={previewUrls[index]}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        {getFileIcon(file)}
                      </div>
                    )}

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Upload Button */}
              {!isUploading && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={!hasFiles}
                    className="flex-1"
                  >
                    Upload {files.length === 1 ? 'File' : 'Files'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Specific components for different file types
export function ImageUpload(props: Omit<FileUploadProps, 'type'>) {
  return <FileUpload {...props} type="image" accept="image/*" />;
}

export function DocumentUpload(props: Omit<FileUploadProps, 'type'>) {
  return <FileUpload {...props} type="document" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" />;
}
