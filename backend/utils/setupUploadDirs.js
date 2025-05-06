// utils/setupUploadDirs.js
const fs = require('fs');
const path = require('path');

/**
 * Creates necessary directories for file uploads
 */
const setupUploadDirectories = () => {
    const uploadDir = path.join(__dirname, '../uploads');

    // Create main uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created uploads directory');
    }

    // Create subdirectories for different entity types
    const entityTypes = ['driver', 'vehicle', 'payment', 'expense'];

    entityTypes.forEach(type => {
        const typeDir = path.join(uploadDir, type);
        if (!fs.existsSync(typeDir)) {
            fs.mkdirSync(typeDir, { recursive: true });
            console.log(`Created ${type} uploads directory`);
        }
    });

    // Create a temp directory for temporary files
    const tempDir = path.join(uploadDir, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('Created temp uploads directory');
    }
};

module.exports = setupUploadDirectories;