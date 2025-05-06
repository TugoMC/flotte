const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
require('./models');
const path = require('path');
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

// Routes implémentées
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));

app.use('/api/payments', require('./routes/paymentRoutes'));

app.use('/api/media', require('./routes/mediaRoutes'));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
/* À implémenter plus tard :
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
*/

// Connection à MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connecté à MongoDB'))
    .catch(err => console.error('Erreur de connexion à MongoDB:', err));

app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));