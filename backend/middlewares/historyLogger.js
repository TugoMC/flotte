// middlewares/historyLogger.js
const History = require('../models/historyModel');

function logHistory(eventType, module, options = {}) {
    return async (req, res, next) => {
        const originalSend = res.send;

        res.send = async function (data) {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const entityId = req.params.id || (data && data._id) || options.entityId;

                    await History.create({
                        eventType,
                        module,
                        entityId,
                        oldData: res.locals.oldData || options.oldData,
                        newData: req.method === 'DELETE' ? null : data,
                        performedBy: req.user?._id,
                        description: options.description || `${eventType.replace('_', ' ')} on ${module}`,
                        ipAddress: req.ip,
                        metadata: options.metadata
                    });
                }
            } catch (error) {
                console.error('History logging error:', error);
            } finally {
                originalSend.apply(res, arguments);
            }
        };

        next();
    };
}

module.exports = logHistory;