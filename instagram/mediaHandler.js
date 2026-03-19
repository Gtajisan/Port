"use strict";

const axios = require("axios");
const path = require("path");
const fs = require("fs");
const logger = require("./logger.js");

const MEDIA_DIR = path.join(process.cwd(), "temp", "media");
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const SUPPORTED_IMAGES = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const SUPPORTED_VIDEOS = [".mp4", ".mov", ".avi"];
const SUPPORTED_AUDIO = [".mp3", ".ogg", ".m4a", ".aac"];

async function downloadMedia(url, destFilename) {
  const destPath = path.join(MEDIA_DIR, destFilename);
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/101 Mobile Safari/537.36",
      },
    });
    fs.writeFileSync(destPath, Buffer.from(response.data));
    logger.info("MEDIA", `Downloaded media → ${destFilename}`);
    return destPath;
  } catch (err) {
    logger.error("MEDIA", `Failed to download ${url}: ${err.message}`);
    throw err;
  }
}

async function getMediaBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/101 Mobile Safari/537.36",
      },
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.error("MEDIA", `Failed to fetch buffer from ${url}: ${err.message}`);
    throw err;
  }
}

async function optimizeImage(inputBuffer, options = {}) {
  try {
    const sharp = require("sharp");
    let pipeline = sharp(inputBuffer);
    if (options.maxWidth || options.maxHeight) {
      pipeline = pipeline.resize(options.maxWidth || null, options.maxHeight || null, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const outputBuffer = await pipeline.jpeg({ quality: options.quality || 85 }).toBuffer();
    return outputBuffer;
  } catch (err) {
    logger.warn("MEDIA", `Image optimization skipped (sharp unavailable): ${err.message}`);
    return inputBuffer;
  }
}

async function sendPhotoToThread(ig, threadID, buffer, mimeType = "image/jpeg") {
  try {
    let buf = buffer;
    if (mimeType === "image/jpeg" || mimeType === "image/png") {
      buf = await optimizeImage(buffer, { maxWidth: 1920, maxHeight: 1920 });
    }
    const publishResult = await ig.publish.photo({
      file: buf,
    });
    const mediaID = publishResult?.media?.id;
    logger.info("MEDIA", `Photo published, mediaID: ${mediaID}`);
    return mediaID;
  } catch (err) {
    logger.error("MEDIA", `Failed to send photo: ${err.message}`);
    throw err;
  }
}

async function sendVideoToThread(ig, threadID, videoBuffer, coverBuffer) {
  try {
    const result = await ig.publish.video({
      video: videoBuffer,
      coverImage: coverBuffer || Buffer.alloc(0),
    });
    const mediaID = result?.media?.id;
    logger.info("MEDIA", `Video published, mediaID: ${mediaID}`);
    return mediaID;
  } catch (err) {
    logger.error("MEDIA", `Failed to send video: ${err.message}`);
    throw err;
  }
}

function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (SUPPORTED_IMAGES.includes(ext)) {
    if (ext === ".gif") return "image/gif";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    return "image/jpeg";
  }
  if (SUPPORTED_VIDEOS.includes(ext)) return "video/mp4";
  if (SUPPORTED_AUDIO.includes(ext)) return "audio/mpeg";
  return "application/octet-stream";
}

function cleanupTempMedia(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

function clearOldTempFiles(maxAgeMs = 3600000) {
  try {
    const now = Date.now();
    for (const file of fs.readdirSync(MEDIA_DIR)) {
      const full = path.join(MEDIA_DIR, file);
      const stat = fs.statSync(full);
      if (now - stat.mtimeMs > maxAgeMs) fs.unlinkSync(full);
    }
  } catch (_) {}
}

setInterval(() => clearOldTempFiles(), 3600000);

module.exports = {
  downloadMedia,
  getMediaBuffer,
  optimizeImage,
  sendPhotoToThread,
  sendVideoToThread,
  detectMimeType,
  cleanupTempMedia,
  MEDIA_DIR,
};
