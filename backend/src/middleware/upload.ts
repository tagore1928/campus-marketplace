import multer from 'multer';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Multer memory configuration
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
});

export interface UploadRequest extends Request {
  processedImages?: string[];
}

// Helper function to upload buffer to Cloudinary using streams
const uploadToCloudinary = (buffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'campusmarket',
        format: 'webp',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Intercepts multi-part file uploads, optimizes with sharp, and uploads to Cloudinary or local directory fallback
export const handleImageUpload = async (req: UploadRequest, res: Response, next: NextFunction) => {
  const filesToProcess: Express.Multer.File[] = [];

  if (req.file) {
    filesToProcess.push(req.file);
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToProcess.push(...req.files);
    } else {
      Object.values(req.files).forEach((fileArr) => {
        filesToProcess.push(...fileArr);
      });
    }
  }

  req.processedImages = [];

  if (filesToProcess.length === 0) {
    return next();
  }

  for (const file of filesToProcess) {
    try {
      // Process with Sharp: EXIF sanitization is default (metadata is not preserved), resize inside 1200x1200px, convert to webp format
      const processedBuffer = await sharp(file.buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      if (isCloudinaryConfigured) {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(processedBuffer);
        req.processedImages.push(result.secure_url);
      } else {
        // Local Fallback Storage
        const fileName = `${uuidv4()}.webp`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, processedBuffer);
        
        const port = process.env.PORT || 8080;
        const fileUrl = `http://localhost:${port}/uploads/${fileName}`;
        req.processedImages.push(fileUrl);
      }
    } catch (error) {
      console.error('Error processing or uploading image:', error);
    }
  }

  next();
};
