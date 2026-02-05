'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string; // base64 encoded
}

interface FileDropzoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
}

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/gif',
];

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function FileDropzone({
  onFilesChange,
  files,
  maxFiles = 10,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    // Check file type
    if (!acceptedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      setError(`File type not supported: ${file.type || file.name}`);
      return null;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File too large: ${file.name} (max ${Math.round(maxSizeBytes / 1024 / 1024)}MB)`);
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve({
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          content: base64.split(',')[1] || base64, // Remove data URL prefix if present
        });
      };
      reader.onerror = () => {
        setError(`Failed to read file: ${file.name}`);
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }, [acceptedTypes, maxSizeBytes]);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setError(null);
    const newFiles: UploadedFile[] = [];
    const filesArray = Array.from(fileList);

    // Check max files
    if (files.length + filesArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    for (const file of filesArray) {
      const processed = await processFile(file);
      if (processed) {
        // Check for duplicate names
        if (!files.some(f => f.name === processed.name) && !newFiles.some(f => f.name === processed.name)) {
          newFiles.push(processed);
        }
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, maxFiles, onFilesChange, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = useCallback((fileName: string) => {
    onFilesChange(files.filter(f => f.name !== fileName));
    setError(null);
  }, [files, onFilesChange]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    if (type.includes('image')) return 'IMG';
    if (type.includes('markdown') || type.includes('text')) return 'TXT';
    return 'FILE';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-2">
          <div className="text-2xl">
            {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
          </div>
          <p className="text-sm text-muted-foreground">
            PDF, Word, Markdown, images, or text files (max {Math.round(maxSizeBytes / 1024 / 1024)}MB each)
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''} attached</p>
          <ul className="space-y-1">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">
                    {getFileIcon(file.type)}
                  </span>
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.name)}
                  className="ml-2 px-2 py-1 text-destructive hover:bg-destructive/10 rounded shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
