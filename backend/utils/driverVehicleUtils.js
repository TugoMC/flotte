// utils/driverVehicleUtils.js
const Driver = require('../models/driverModel');
const Vehicle = require('../models/vehicleModel');

/**
 * Met à jour la relation entre un chauffeur et un véhicule
 * @param {string} driverId - ID du chauffeur
 * @param {string} vehicleId - ID du véhicule
 * @param {boolean} isAssignment - true pour assigner, false pour désassigner
 */
async function updateDriverVehicleRelationship(driverId, vehicleId, isAssignment = true) {
    // Récupérer le chauffeur pour vérifier son statut
    const driver = await Driver.findById(driverId);
    if (!driver) {
        throw new Error('Chauffeur non trouvé');
    }

    // Récupérer le véhicule pour vérifier son statut
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        throw new Error('Véhicule non trouvé');
    }

    if (isAssignment) {
        // Vérifier que le chauffeur est actif avant d'assigner un véhicule
        if (driver.departureDate) {
            throw new Error('Impossible d\'assigner un véhicule à un chauffeur qui a quitté l\'entreprise');
        }

        // Vérifier que le véhicule est actif
        if (vehicle.status !== 'active') {
            throw new Error('Impossible d\'assigner un véhicule inactif');
        }

        // Assigner le véhicule au chauffeur et vice versa
        await Driver.findByIdAndUpdate(driverId, { currentVehicle: vehicleId });
        await Vehicle.findByIdAndUpdate(vehicleId, { currentDriver: driverId });
    } else {
        // Supprimer l'association si nécessaire
        if (driver.currentVehicle && driver.currentVehicle.toString() === vehicleId.toString()) {
            await Driver.findByIdAndUpdate(driverId, { currentVehicle: null });
        }

        if (vehicle.currentDriver && vehicle.currentDriver.toString() === driverId.toString()) {
            await Vehicle.findByIdAndUpdate(vehicleId, { currentDriver: null });
        }
    }
}

module.exports = {
    updateDriverVehicleRelationship
};