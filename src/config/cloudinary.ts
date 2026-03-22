import type { Request, RequestHandler } from "express";
import multer, { type FileFilterCallback } from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import { envVars } from "./env.js";

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_FILES = 10;
const DEFAULT_FOLDER = "court-connect";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

cloudinary.config({
  cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY_API_SECRET,
});

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
    return;
  }
  cb(null, true);
};

const buildStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
      folder,
      resource_type: "image",
      format: "webp",
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    }),
  });

const createUploader = (folder: string, maxFileSize = DEFAULT_MAX_FILE_SIZE) =>
  multer({
    storage: buildStorage(folder),
    limits: { fileSize: maxFileSize },
    fileFilter: imageFileFilter,
  });

/**
 * Generic uploader (kept for backward compatibility).
 */
export const upload = createUploader(`${DEFAULT_FOLDER}/general`);

/**
 * Single image upload middleware.
 * Example: singleImageUpload("avatar", "court-connect/users")
 */
export const singleImageUpload = (
  fieldName: string,
  folder = `${DEFAULT_FOLDER}/single`,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
): RequestHandler => createUploader(folder, maxFileSize).single(fieldName);

/**
 * Multiple image upload middleware.
 * Example: multipleImageUpload("images", 8, "court-connect/courts")
 */
export const multipleImageUpload = (
  fieldName: string,
  maxCount = DEFAULT_MAX_FILES,
  folder = `${DEFAULT_FOLDER}/multiple`,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
): RequestHandler =>
  createUploader(folder, maxFileSize).array(fieldName, maxCount);

export default cloudinary;
