const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const hasValidCloudinaryConfig = Boolean(
  cloudName &&
  apiKey &&
  apiSecret &&
  cloudName !== 'your-cloud-name' &&
  apiKey !== 'your-api-key' &&
  apiSecret !== 'your-api-secret'
);

if (hasValidCloudinaryConfig) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
}

module.exports = cloudinary;