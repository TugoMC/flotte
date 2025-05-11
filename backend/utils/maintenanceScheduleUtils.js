async function checkMaintenanceConflicts(vehicleId, startDate, endDate = null) {
    const query = {
        vehicle: vehicleId,
        completed: false,
        $or: [
            { maintenanceDate: { $lte: endDate || startDate } },
            { completionDate: { $gte: startDate } }
        ]
    };

    if (!endDate) {
        query.$or.push(
            { completionDate: null, maintenanceDate: { $lte: startDate } }
        );
    }

    return await Maintenance.find(query);
}

module.exports = { checkMaintenanceConflicts };