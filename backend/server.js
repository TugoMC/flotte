const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
require('./models');
const path = require('path');
const cron = require('node-cron');
const { generateDailyPayments } = require('./controllers/scheduleController');
const Schedule = require('./models/scheduleModel');
const setupUploadDirectories = require('./utils/setupUploadDirs');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup upload directories
setupUploadDirectories();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fonction pour générer les paiements automatiques
async function setupAutoPayments() {
    // Planification à 00:00:01 heure d'Abidjan (GMT+0)
    cron.schedule('1 0 * * *', async () => {
        console.log('\n--- Début de la génération automatique des paiements ---');
        const now = new Date();

        try {
            const activeSchedules = await Schedule.find({
                status: { $in: ['assigned', 'pending'] },
                $or: [
                    { endDate: { $gte: now } },
                    { endDate: null }
                ]
            });

            let totalGenerated = 0;
            for (const schedule of activeSchedules) {
                try {
                    const payments = await generateDailyPayments(schedule._id);
                    totalGenerated += payments.length;
                    console.log(`→ Planning ${schedule._id}: ${payments.length} paiement(s) généré(s)`);
                } catch (err) {
                    console.error(`Erreur sur le planning ${schedule._id}:`, err.message);
                }
            }

            console.log(`[${now.toISOString()}] Terminé. ${totalGenerated} paiements générés pour ${activeSchedules.length} plannings`);
        } catch (err) {
            console.error('Erreur globale:', err);
        }
    }, {
        scheduled: true,
        timezone: 'Africa/Abidjan' // Fuseau horaire d'Abidjan
    });

    console.log('✅ Cron job pour la generation automatique des paiements configuré (déclenchement quotidien à 00:00:01 heure d\'Abidjan)');
}

// Connexion MongoDB + démarrage serveur
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('🟢 Connecté à MongoDB');
        setupAutoPayments(); // Initialise le cron job
        app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
    })
    .catch(err => {
        console.error('🔴 Erreur de connexion à MongoDB:', err.message);
        process.exit(1);
    });

// Test manuel en développement (optionnel)
if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
        console.log('\n--- TEST MANUEL DU CRON JOB ---');
        setupAutoPayments();
    }, 5000);
}