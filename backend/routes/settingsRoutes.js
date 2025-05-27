const express = require('express');
const router = express.Router();
const Settings = require('../models/settingsModel');

// Récupérer les paramètres
router.get('/', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings || {
            navbarTitle: 'Gestion de Flotte',
            sidebarTitle: 'Gestion de Flotte',
            notificationSettings: {
                expirationAlerts: true,
                maintenanceAlerts: false,
                paymentAlerts: false,
                alertThreshold: '30'
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mettre à jour les paramètres
router.put('/', async (req, res) => {
    try {
        const { navbarTitle, sidebarTitle, notificationSettings } = req.body;
        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings({
                navbarTitle,
                sidebarTitle,
                notificationSettings
            });
        } else {
            settings.navbarTitle = navbarTitle;
            settings.sidebarTitle = sidebarTitle;
            if (notificationSettings) {
                settings.notificationSettings = {
                    ...settings.notificationSettings?.toObject(),
                    ...notificationSettings
                };
            }
        }

        const updatedSettings = await settings.save();
        res.json(updatedSettings);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;