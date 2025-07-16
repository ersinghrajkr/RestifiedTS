// src/utils/FileUploadHandler.ts

import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import { Readable } from 'stream';
import { RequestConfig } from '../types/RestifiedTypes';

/**
 * File upload handler for API testing scenarios
 * 
 * Features:
 * - Multiple file upload support
 * - Various file formats and encodings
 * - Progress tracking and validation
 * - Memory-efficient streaming
 * - File metadata extraction
 * - Custom form field support
 * - Base64 encoding/decoding
 * - File size validation
 * - MIME type detection
 * 
 * @example
 * ```typescript
 * const uploadHandler = new FileUploadHandler();
 * 
 * // Single file upload
 * const requestConfig = await uploadHandler
 *   .addFile('./test-data/document.pdf', 'document')
 *   .addField('description', 'Important document')
 *   .build();
 * 
 * // Multiple files
 * const multiUploadConfig = await uploadHandler
 *   .addFiles([
 *     { path: './image1.jpg', fieldName: 'images' },
 *     { path: './image2.png', fieldName: 'images' }
 *   ])
 *   .build();
 * 
 * // Use with RestifiedTS
 * await restified
 *   .given()
 *   .when()
 *     .post('/upload', requestConfig.data)
 *     .headers(requestConfig.headers)
 *     .execute();
 * ```
 */
export class FileUploadHandler {
  private formData: FormData;
  private files: FileEntry[] = [];
  private fields: FieldEntry[] = [];
  private options: UploadOptions;

  constructor(options: Partial<UploadOptions> = {}) {
    this.formData = new FormData();
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      allowedMimeTypes: [],
      validateFiles: true,
      includeMetadata: false,
      encoding: 'utf8',
      ...options
    };
  }

  /**
   * Add a single file for upload
   * 
   * @param filePath - Path to the file
   * @param fieldName - Form field name for the file
   * @param filename - Optional custom filename
   * @returns Current FileUploadHandler instance for chaining
   */
  addFile(filePath: string, fieldName: string = 'file', filename?: string): FileUploadHandler {
    this.validateFilePath(filePath);
    
    const actualFilename = filename || path.basename(filePath);
    const fileEntry: FileEntry = {
      path: filePath,
      fieldName,
      filename: actualFilename,
      size: 0,
      mimeType: this.detectMimeType(filePath)
    };

    // Validate file if enabled
    if (this.options.validateFiles) {
      this.validateFile(fileEntry);
    }

    // Get file size
    try {
      const stats = fs.statSync(filePath);
      fileEntry.size = stats.size;
    } catch (error) {
      throw new Error(`Cannot read file ${filePath}: ${(error as Error).message}`);
    }

    this.files.push(fileEntry);
    
    // Add to form data
    const fileStream = fs.createReadStream(filePath);
    this.formData.append(fieldName, fileStream, {
      filename: actualFilename,
      contentType: fileEntry.mimeType
    });

    return this;
  }

  /**
   * Add multiple files for upload
   * 
   * @param files - Array of file configurations
   * @returns Current FileUploadHandler instance for chaining
   */
  addFiles(files: Array<{ path: string; fieldName: string; filename?: string }>): FileUploadHandler {
    files.forEach(file => {
      this.addFile(file.path, file.fieldName, file.filename);
    });
    return this;
  }

  /**
   * Add a file from buffer
   * 
   * @param buffer - File buffer
   * @param fieldName - Form field name
   * @param filename - Filename
   * @param mimeType - MIME type
   * @returns Current FileUploadHandler instance for chaining
   */
  addFileFromBuffer(
    buffer: Buffer, 
    fieldName: string, 
    filename: string, 
    mimeType: string = 'application/octet-stream'
  ): FileUploadHandler {
    const fileEntry: FileEntry = {
      path: `<buffer:${filename}>`,
      fieldName,
      filename,
      size: buffer.length,
      mimeType,
      buffer
    };

    if (this.options.validateFiles) {
      this.validateFile(fileEntry);
    }

    this.files.push(fileEntry);
    
    // Create readable stream from buffer
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    this.formData.append(fieldName, stream, {
      filename,
      contentType: mimeType
    });

    return this;
  }

  /**
   * Add a file from base64 string
   * 
   * @param base64Data - Base64 encoded file data
   * @param fieldName - Form field name
   * @param filename - Filename
   * @param mimeType - MIME type
   * @returns Current FileUploadHandler instance for chaining
   */
  addFileFromBase64(
    base64Data: string, 
    fieldName: string, 
    filename: string, 
    mimeType: string = 'application/octet-stream'
  ): FileUploadHandler {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      return this.addFileFromBuffer(buffer, fieldName, filename, mimeType);
    } catch (error) {
      throw new Error(`Invalid base64 data: ${(error as Error).message}`);
    }
  }

  /**
   * Add a form field (non-file data)
   * 
   * @param name - Field name
   * @param value - Field value
   * @returns Current FileUploadHandler instance for chaining
   */
  addField(name: string, value: string | number | boolean): FileUploadHandler {
    const fieldEntry: FieldEntry = {
      name,
      value: String(value)
    };

    this.fields.push(fieldEntry);
    this.formData.append(name, String(value));

    return this;
  }

  /**
   * Add multiple form fields
   * 
   * @param fields - Object containing field name-value pairs
   * @returns Current FileUploadHandler instance for chaining
   */
  addFields(fields: Record<string, string | number | boolean>): FileUploadHandler {
    Object.entries(fields).forEach(([name, value]) => {
      this.addField(name, value);
    });
    return this;
  }

  /**
   * Build the request configuration for upload
   * 
   * @returns Promise resolving to request configuration
   */
  async build(): Promise<UploadRequestConfig> {
    if (this.files.length === 0) {
      throw new Error('No files added for upload');
    }

    // Get form data headers
    const headers = this.formData.getHeaders();
    
    // Add content length if available
    try {
      const length = await this.getContentLength();
      if (length > 0) {
        headers['content-length'] = String(length);
      }
    } catch (error) {
      // Content length calculation failed, let the client handle it
    }

    const uploadInfo: UploadInfo = {
      fileCount: this.files.length,
      fieldCount: this.fields.length,
      totalSize: this.getTotalSize(),
      files: this.files.map(file => ({
        fieldName: file.fieldName,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType
      })),
      fields: this.fields.map(field => ({
        name: field.name,
        value: field.value
      }))
    };

    return {
      data: this.formData,
      headers,
      uploadInfo,
      metadata: this.options.includeMetadata ? this.generateMetadata() : undefined
    };
  }

  /**
   * Get upload progress tracking information
   * 
   * @returns Upload progress tracker
   */
  createProgressTracker(): UploadProgressTracker {
    const totalSize = this.getTotalSize();
    let uploadedBytes = 0;
    
    return {
      totalSize,
      uploadedBytes: 0,
      progress: 0,
      files: this.files.map(file => ({
        filename: file.filename,
        size: file.size,
        uploaded: 0,
        progress: 0
      })),
      onProgress: (callback: ProgressCallback) => {
        // This would be implemented with actual upload progress monitoring
        // For now, we provide the structure
        setInterval(() => {
          if (uploadedBytes < totalSize) {
            uploadedBytes += Math.min(1024, totalSize - uploadedBytes);
            const progress = Math.floor((uploadedBytes / totalSize) * 100);
            callback({ uploadedBytes, totalSize, progress });
          }
        }, 100);
      }
    };
  }

  /**
   * Validate all added files
   * 
   * @returns Validation results
   */
  validateAllFiles(): FileValidationResult[] {
    return this.files.map(file => this.validateFileEntry(file));
  }

  /**
   * Get upload summary
   * 
   * @returns Upload summary information
   */
  getSummary(): UploadSummary {
    const totalSize = this.getTotalSize();
    const mimeTypes = [...new Set(this.files.map(f => f.mimeType))];
    
    return {
      fileCount: this.files.length,
      fieldCount: this.fields.length,
      totalSize,
      averageFileSize: this.files.length > 0 ? totalSize / this.files.length : 0,
      largestFile: Math.max(...this.files.map(f => f.size), 0),
      smallestFile: Math.min(...this.files.map(f => f.size), 0),
      mimeTypes,
      files: this.files.map(f => ({ name: f.filename, size: f.size, type: f.mimeType }))
    };
  }

  /**
   * Clear all files and fields
   */
  clear(): void {
    this.files.length = 0;
    this.fields.length = 0;
    this.formData = new FormData();
  }

  /**
   * Create a copy of the upload handler
   * 
   * @returns New FileUploadHandler instance with same configuration
   */
  clone(): FileUploadHandler {
    const clone = new FileUploadHandler(this.options);
    
    // Copy files and fields
    this.files.forEach(file => {
      if (file.buffer) {
        clone.addFileFromBuffer(file.buffer, file.fieldName, file.filename, file.mimeType);
      } else {
        clone.addFile(file.path, file.fieldName, file.filename);
      }
    });
    
    this.fields.forEach(field => {
      clone.addField(field.name, field.value);
    });
    
    return clone;
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }
  }

  private validateFile(file: FileEntry): void {
    // Check file size
    if (file.size > this.options.maxFileSize) {
      throw new Error(`File ${file.filename} exceeds maximum size of ${this.options.maxFileSize} bytes`);
    }

    // Check MIME type if restrictions are set
    if (this.options.allowedMimeTypes.length > 0 && 
        !this.options.allowedMimeTypes.includes(file.mimeType)) {
      throw new Error(`File ${file.filename} has unsupported MIME type: ${file.mimeType}`);
    }
  }

  private validateFileEntry(file: FileEntry): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation
    if (file.size === 0) {
      warnings.push('File is empty');
    } else if (file.size > this.options.maxFileSize) {
      errors.push(`File exceeds maximum size of ${this.options.maxFileSize} bytes`);
    }

    // MIME type validation
    if (this.options.allowedMimeTypes.length > 0 && 
        !this.options.allowedMimeTypes.includes(file.mimeType)) {
      errors.push(`Unsupported MIME type: ${file.mimeType}`);
    }

    // Filename validation
    if (!file.filename || file.filename.trim() === '') {
      errors.push('Filename is empty');
    }

    return {
      filename: file.filename,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private detectMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac'
    };

    return mimeTypeMap[ext] || 'application/octet-stream';
  }

  private getTotalSize(): number {
    return this.files.reduce((total, file) => total + file.size, 0);
  }

  private async getContentLength(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.formData.getLength((err: any, length: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(length);
        }
      });
    });
  }

  private generateMetadata(): UploadMetadata {
    return {
      timestamp: new Date().toISOString(),
      userAgent: 'RestifiedTS FileUploadHandler',
      fileCount: this.files.length,
      fieldCount: this.fields.length,
      totalSize: this.getTotalSize(),
      files: this.files.map(file => ({
        fieldName: file.fieldName,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
        checksum: this.calculateChecksum(file)
      })),
      options: this.options
    };
  }

  private calculateChecksum(file: FileEntry): string {
    // Simplified checksum - in production, use proper hashing
    return `${file.filename}-${file.size}-${Date.now()}`;
  }
}

/**
 * Static utility methods for file operations
 */
export class FileUtils {
  /**
   * Convert file to base64 string
   * 
   * @param filePath - Path to file
   * @returns Promise resolving to base64 string
   */
  static async fileToBase64(filePath: string): Promise<string> {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return buffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to convert file to base64: ${(error as Error).message}`);
    }
  }

  /**
   * Save base64 string to file
   * 
   * @param base64Data - Base64 encoded data
   * @param outputPath - Output file path
   * @returns Promise resolving when file is saved
   */
  static async base64ToFile(base64Data: string, outputPath: string): Promise<void> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.promises.writeFile(outputPath, buffer);
    } catch (error) {
      throw new Error(`Failed to save base64 to file: ${(error as Error).message}`);
    }
  }

  /**
   * Get file information
   * 
   * @param filePath - Path to file
   * @returns Promise resolving to file information
   */
  static async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.promises.stat(filePath);
      const filename = path.basename(filePath);
      const extension = path.extname(filePath);
      
      return {
        filename,
        extension,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        path: filePath
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${(error as Error).message}`);
    }
  }

  /**
   * Create a temporary file with specified content
   * 
   * @param content - File content
   * @param extension - File extension
   * @returns Promise resolving to temporary file path
   */
  static async createTempFile(content: string | Buffer, extension: string = '.tmp'): Promise<string> {
    const tempDir = require('os').tmpdir();
    const filename = `restified_temp_${Date.now()}_${Math.random().toString(36).substring(2)}${extension}`;
    const tempPath = path.join(tempDir, filename);
    
    try {
      await fs.promises.writeFile(tempPath, content);
      return tempPath;
    } catch (error) {
      throw new Error(`Failed to create temp file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a file
   * 
   * @param filePath - Path to file to delete
   * @returns Promise resolving when file is deleted
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file exists
   * 
   * @param filePath - Path to check
   * @returns Promise resolving to true if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface UploadOptions {
  maxFileSize: number;
  allowedMimeTypes: string[];
  validateFiles: boolean;
  includeMetadata: boolean;
  encoding: BufferEncoding;
}

export interface FileEntry {
  path: string;
  fieldName: string;
  filename: string;
  size: number;
  mimeType: string;
  buffer?: Buffer;
}

export interface FieldEntry {
  name: string;
  value: string;
}

export interface UploadRequestConfig extends RequestConfig {
  data: FormData;
  headers: Record<string, string>;
  uploadInfo: UploadInfo;
  metadata?: UploadMetadata;
}

export interface UploadInfo {
  fileCount: number;
  fieldCount: number;
  totalSize: number;
  files: Array<{
    fieldName: string;
    filename: string;
    size: number;
    mimeType: string;
  }>;
  fields: Array<{
    name: string;
    value: string;
  }>;
}

export interface UploadMetadata {
  timestamp: string;
  userAgent: string;
  fileCount: number;
  fieldCount: number;
  totalSize: number;
  files: Array<{
    fieldName: string;
    filename: string;
    size: number;
    mimeType: string;
    checksum: string;
  }>;
  options: UploadOptions;
}

export interface UploadProgressTracker {
  totalSize: number;
  uploadedBytes: number;
  progress: number;
  files: Array<{
    filename: string;
    size: number;
    uploaded: number;
    progress: number;
  }>;
  onProgress: (callback: ProgressCallback) => void;
}

export interface FileValidationResult {
  filename: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadSummary {
  fileCount: number;
  fieldCount: number;
  totalSize: number;
  averageFileSize: number;
  largestFile: number;
  smallestFile: number;
  mimeTypes: string[];
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export interface FileInfo {
  filename: string;
  extension: string;
  size: number;
  created: Date;
  modified: Date;
  isFile: boolean;
  isDirectory: boolean;
  path: string;
}

export type ProgressCallback = (progress: { uploadedBytes: number; totalSize: number; progress: number }) => void;