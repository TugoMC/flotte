const {
    generateDailyPayments,
    completeExpiredDriverSchedules
} = require('./controllers/scheduleController');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
require('./models');
const path = require('path');
const cron = require('node-cron');
const Schedule = require('./models/scheduleModel');
const setupUploadDirectories = require('./utils/setupUploadDirs');
const historyRoutes = require('./routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup upload directories
setupUploadDirectories();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

app.use('/api/settings', require('./routes/settingsRoutes'));

// Routes
app.get('/', (req, res) => {
    res.json({
        status: 'API is running',
        message: 'Welcome to the backend API!'
    });
});

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/maintenances', require('./routes/maintenanceRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api', historyRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fonction pour générer les paiements automatiques
async function setupAutoPayments() {
    // Exécution initiale au démarrage
    await generatePaymentsForActiveSchedules();

    // Planification quotidienne à 00:00:01 heure d'Abidjan (GMT+0)
    cron.schedule('1 0 * * *', generatePaymentsForActiveSchedules, {
        scheduled: true,
        timezone: 'Africa/Abidjan'
    });

    console.log('✅ Cron job pour la generation automatique des paiements configuré (exécution au démarrage + déclenchement quotidien à 00:00:01 heure d\'Abidjan)');
}

// Nouvelle fonction pour générer les paiements pour tous les plannings actifs
async function generatePaymentsForActiveSchedules() {
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
}

async function checkAndCompleteExpiredSchedules() {
    console.log('\n--- Vérification initiale des plannings expirés au démarrage ---');
    const now = new Date();

    try {
        const { completeExpiredDriverSchedules } = require('./controllers/scheduleController');
        const driversWithActiveSchedules = await Schedule.distinct('driver', {
            status: 'assigned'
        });

        let totalCompleted = 0;
        for (const driverId of driversWithActiveSchedules) {
            try {
                const completed = await completeExpiredDriverSchedules(driverId);
                if (completed > 0) {
                    console.log(`→ Chauffeur ${driverId}: ${completed} planning(s) complété(s)`);
                    totalCompleted += completed;
                }
            } catch (err) {
                console.error(`Erreur pour le chauffeur ${driverId}:`, err.message);
            }
        }

        console.log(`[${now.toISOString()}] Vérification initiale terminée. ${totalCompleted} plannings complétés pour ${driversWithActiveSchedules.length} chauffeurs`);
        return totalCompleted;
    } catch (err) {
        console.error('Erreur globale lors de la vérification initiale:', err);
        throw err;
    }
}

async function setupScheduleAutoCompletion() {
    // Exécution au démarrage
    await checkAndCompleteExpiredSchedules();

    // Planification toutes les 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('\n--- Vérification périodique des plannings expirés ---');
        const now = new Date();

        try {
            const { completeExpiredDriverSchedules } = require('./controllers/scheduleController');
            const driversWithActiveSchedules = await Schedule.distinct('driver', {
                status: 'assigned'
            });

            let totalCompleted = 0;
            for (const driverId of driversWithActiveSchedules) {
                try {
                    const completed = await completeExpiredDriverSchedules(driverId);
                    if (completed > 0) {
                        console.log(`→ Chauffeur ${driverId}: ${completed} planning(s) complété(s)`);
                        totalCompleted += completed;
                    }
                } catch (err) {
                    console.error(`Erreur pour le chauffeur ${driverId}:`, err.message);
                }
            }

            console.log(`[${now.toISOString()}] Vérification périodique terminée. ${totalCompleted} plannings complétés pour ${driversWithActiveSchedules.length} chauffeurs`);
        } catch (err) {
            console.error('Erreur globale lors de la vérification périodique:', err);
        }
    }, {
        scheduled: true,
        timezone: 'Africa/Abidjan'
    });

    console.log('✅ Cron job pour la vérification des plannings expirés configuré (exécution au démarrage + toutes les 30 minutes)');
}


// Connexion MongoDB + démarrage serveur
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('🟢 Connecté à MongoDB');

        // Initialise les cron jobs (attendre la fin pour éviter les conflits)
        await setupAutoPayments();
        await setupScheduleAutoCompletion();

        app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
    })
    .catch(err => {
        console.error('🔴 Erreur de connexion à MongoDB:', err.message);
        process.exit(1);
    });