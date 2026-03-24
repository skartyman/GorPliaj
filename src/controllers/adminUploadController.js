const multer = require('multer');
const { uploadImage, isMimeTypeAllowed } = require('../services/r2StorageService');

const IMAGE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_SIZE_LIMIT_BYTES,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!isMimeTypeAllowed(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
      return;
    }

    callback(null, true);
  }
});

function handleMulterError(error, req, res, next) {
  if (!error) {
    return next();
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image exceeds size limit of 5MB.' });
    }

    return res.status(400).json({ message: 'Invalid image upload payload.' });
  }

  return res.status(400).json({ message: 'Unable to process image upload.' });
}

async function uploadAdminImage(req, res) {
  try {
    const folder = String(req.body.folder || 'events').trim().toLowerCase();
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Image file is required.' });
    }

    const result = await uploadImage({ folder, file });

    if (result.type === 'NOT_CONFIGURED') {
      return res.status(503).json({ message: result.message });
    }

    if (result.type === 'INVALID_FOLDER' || result.type === 'INVALID_FILE') {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      url: result.url,
      key: result.key
    });
  } catch (error) {
    console.error('[adminUploadController.uploadAdminImage] Failed to upload image.', error);
    return res.status(500).json({ message: 'Unable to upload image.' });
  }
}

module.exports = {
  upload,
  handleMulterError,
  uploadAdminImage,
  IMAGE_SIZE_LIMIT_BYTES
};
