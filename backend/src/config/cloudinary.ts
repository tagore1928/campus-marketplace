import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

import * as path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

let isCloudinaryConfigured = false;

if (cloudName && apiKey && apiSecret) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    isCloudinaryConfigured = true;
    console.log("Cloudinary initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Cloudinary:", error);
  }
} else {
  console.warn("Cloudinary credentials are not fully set in .env. Uploads will fallback to local storage.");
}

export { cloudinary, isCloudinaryConfigured };
