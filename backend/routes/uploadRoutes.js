// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');
const { uploadSingleFile, processUploadedFile } = require('../services/mediaUploadService');
const Media = require('../models/mediaModel');

// Upload route for media files
router.post('/', protect, manager, uploadSingleFile, processUploadedFile, async (req, res) => {
    try {
        const { entityType, entityId, mediaUrl } = req.body;

        if (!entityType || !entityId || !mediaUrl) {
            return res.status(400).json({
                message: 'All required fields must be provided'
            });
        }

        // Validate entityId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(entityId)) {
            return res.status(400).json({ message: 'Invalid entity ID format' });
        }

        const media = new Media({
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId),
            mediaUrl,
            uploadedBy: req.user._id
        });

        const savedMedia = await media.save();

        // Return complete media object
        const completeMedia = await Media.findById(savedMedia._id)
            .populate('uploadedBy', 'firstName lastName');

        res.status(201).json({
            ...completeMedia.toObject(),
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;