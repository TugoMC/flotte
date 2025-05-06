// controllers/mediaController.js
const Media = require('../models/mediaModel');
const mongoose = require('mongoose');
// Get all media
exports.getAll = async (req, res) => {
    try {
        const media = await Media.find()
            .populate('uploadedBy', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json(media);
    } catch (error) {
        console.error('Error getting all media:', error);
        res.status(500).json({ message: error.message });
    }
};
// Get media by ID
exports.getById = async (req, res) => {
    try {
        const media = await Media.findById(req.params.id)
            .populate('uploadedBy', 'firstName lastName');
        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }
        res.json(media);
    } catch (error) {
        console.error('Error getting media by ID:', error);
        res.status(500).json({ message: error.message });
    }
};
// Get media by entity type
exports.getByEntityType = async (req, res) => {
    try {
        const { entityType } = req.params;
        const media = await Media.find({ entityType })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json(media);
    } catch (error) {
        console.error('Error getting media by entity type:', error);
        res.status(500).json({ message: error.message });
    }
};
// Get media by entity (type and ID)
exports.getByEntity = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        // Validate entityId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(entityId)) {
            return res.status(400).json({ message: 'Invalid entity ID format' });
        }
        const media = await Media.find({
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId) // Correction: ajout de 'new'
        })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json(media);
    } catch (error) {
        console.error('Error getting media by entity:', error);
        res.status(500).json({ message: error.message });
    }
};
// Create new media
exports.create = async (req, res) => {
    try {
        const { entityType, entityId, mediaUrl } = req.body;
        const uploadedBy = req.user._id; // Assuming you have user authentication middleware
        // Validate required fields
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
            entityId: mongoose.Types.ObjectId(entityId),
            mediaUrl,
            uploadedBy
        });
        const savedMedia = await media.save();
        // Return the complete media with additional info
        const completeMedia = await Media.findById(savedMedia._id)
            .populate('uploadedBy', 'firstName lastName');

        res.status(201).json(completeMedia);
    } catch (error) {
        console.error('Error creating media:', error);
        res.status(400).json({ message: error.message });
    }
};
// Update media
exports.update = async (req, res) => {
    try {
        const { entityType, entityId, mediaUrl } = req.body;
        const updateData = {};
        if (entityType) updateData.entityType = entityType;
        if (entityId) {
            // Validate entityId is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(entityId)) {
                return res.status(400).json({ message: 'Invalid entity ID format' });
            }
            updateData.entityId = mongoose.Types.ObjectId(entityId);
        }
        if (mediaUrl) updateData.mediaUrl = mediaUrl;
        const media = await Media.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('uploadedBy', 'firstName lastName');
        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }
        res.json(media);
    } catch (error) {
        console.error('Error updating media:', error);
        res.status(400).json({ message: error.message });
    }
};
// Delete media
exports.delete = async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }
        await Media.findByIdAndDelete(req.params.id);
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ message: error.message });
    }
};
// Get media statistics
exports.getStats = async (req, res) => {
    try {
        const totalMedia = await Media.countDocuments();
        const entityTypeStats = await Media.aggregate([
            { $group: { _id: "$entityType", count: { $sum: 1 } } }
        ]);
        // Last 7 days stats
        const lastWeekDate = new Date();
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const recentMediaCount = await Media.countDocuments({
            createdAt: { $gte: lastWeekDate }
        });
        res.json({
            totalMedia,
            entityTypeStats,
            recentMediaCount
        });
    } catch (error) {
        console.error('Error getting media stats:', error);
        res.status(500).json({ message: error.message });
    }
};