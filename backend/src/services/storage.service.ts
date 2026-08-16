import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { cloudinary } from '../config/cloudinary';
import { logger } from '../config/logger';

export interface StoredFile {
  url: string;
  storageKey: string;
  storageDriver: 'local' | 'cloudinary';
}

export interface FileToStore {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Storage abstraction so business logic (attachment.service.ts) never
 * talks to Cloudinary or the filesystem directly. Swap STORAGE_DRIVER in
 * .env to change the backing store without touching callers.
 */
export interface StorageDriver {
  save(file: FileToStore, folder: string): Promise<StoredFile>;
  remove(storageKey: string): Promise<void>;
}

class LocalStorageDriver implements StorageDriver {
  async save(file: FileToStore, folder: string): Promise<StoredFile> {
    const dir = path.join(UPLOADS_DIR, folder);
    await fs.mkdir(dir, { recursive: true });
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalName)}`;
    const filePath = path.join(dir, uniqueName);
    await fs.writeFile(filePath, file.buffer);
    const storageKey = path.join(folder, uniqueName).replace(/\\/g, '/');
    return { url: `/uploads/${storageKey}`, storageKey, storageDriver: 'local' };
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, storageKey));
    } catch (err) {
      logger.warn({ err, storageKey }, 'Failed to remove local file (may already be gone)');
    }
  }
}

class CloudinaryStorageDriver implements StorageDriver {
  async save(file: FileToStore, folder: string): Promise<StoredFile> {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `flowdesk/${folder}`, resource_type: 'auto' },
        (err, res) => {
          if (err || !res) return reject(err ?? new Error('Cloudinary upload failed'));
          resolve(res as { secure_url: string; public_id: string });
        }
      );
      uploadStream.end(file.buffer);
    });
    return { url: result.secure_url, storageKey: result.public_id, storageDriver: 'cloudinary' };
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey);
    } catch (err) {
      logger.warn({ err, storageKey }, 'Failed to remove Cloudinary asset');
    }
  }
}

export const storageDriver: StorageDriver =
  env.storageDriver === 'cloudinary' ? new CloudinaryStorageDriver() : new LocalStorageDriver();
