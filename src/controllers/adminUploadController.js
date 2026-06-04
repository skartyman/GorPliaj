const multer = require('multer');
const {
  deleteMapAsset,
  getMapAssetLibrary,
  saveMapAsset,
  uploadImage,
  isMimeTypeAllowed
} = require('../services/r2StorageService');

const IMAGE_SIZE_LIMIT_MB = 25;
const IMAGE_SIZE_LIMIT_BYTES = IMAGE_SIZE_LIMIT_MB * 1024 * 1024;

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
      return res.status(400).json({ message: `Image exceeds size limit of ${IMAGE_SIZE_LIMIT_MB}MB.` });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Only JPG, PNG, WEBP, and SVG images are allowed.' });
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

    const responsePayload = {
      url: result.url,
      key: result.key
    };

    if (folder === 'map-objects' && req.body.assetType) {
      const assetResult = await saveMapAsset({
        assetType: req.body.assetType,
        name: req.body.name || file.originalname,
        url: result.url,
        key: result.key
      });

      if (assetResult.type === 'SUCCESS') {
        responsePayload.asset = assetResult.asset;
      }
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[adminUploadController.uploadAdminImage] Failed to upload image.', error);
    const details = [error?.name, error?.code, error?.message].filter(Boolean).join(': ');
    return res.status(500).json({
      message: details ? `Unable to upload image (${details}).` : 'Unable to upload image.'
    });
  }
}

async function listMapAssets(req, res) {
  try {
    const library = await getMapAssetLibrary();
    return res.json(library);
  } catch (error) {
    console.error('[adminUploadController.listMapAssets] Failed to load map assets.', error);
    return res.status(500).json({ message: 'Unable to load map assets.' });
  }
}

async function createMapAsset(req, res) {
  try {
    const result = await saveMapAsset(req.body || {});

    if (result.type === 'NOT_CONFIGURED') {
      return res.status(503).json({ message: result.message });
    }

    if (result.type === 'INVALID_ASSET') {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({
      asset: result.asset,
      assets: result.library.assets
    });
  } catch (error) {
    console.error('[adminUploadController.createMapAsset] Failed to save map asset.', error);
    return res.status(500).json({ message: 'Unable to save map asset.' });
  }
}

async function removeMapAsset(req, res) {
  try {
    const result = await deleteMapAsset(req.params.id);

    if (result.type === 'NOT_CONFIGURED') {
      return res.status(503).json({ message: result.message });
    }

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: result.message });
    }

    return res.json({
      asset: result.asset,
      assets: result.library.assets
    });
  } catch (error) {
    console.error('[adminUploadController.removeMapAsset] Failed to delete map asset.', error);
    return res.status(500).json({ message: 'Unable to delete map asset.' });
  }
}

module.exports = {
  upload,
  handleMulterError,
  uploadAdminImage,
  listMapAssets,
  createMapAsset,
  removeMapAsset,
  IMAGE_SIZE_LIMIT_MB,
  IMAGE_SIZE_LIMIT_BYTES
};
