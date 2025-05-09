const History = require('../models/historyModel');

exports.logHistory = async ({
    eventType,
    module,
    entityId,
    oldData = null,
    newData = null,
    performedBy = null,
    description = '',
    ipAddress = null,
    metadata = null
}) => {
    try {
        await History.create({
            eventType,
            module,
            entityId,
            oldData,
            newData,
            performedBy,
            description: description || `${eventType} sur ${module} ${entityId}`,
            ipAddress,
            metadata
        });
    } catch (error) {
        console.error('Erreur lors de la journalisation historique:', error);
    }
};