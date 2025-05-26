const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    documentType: {
        type: String,
        enum: ['insurance', 'registration', 'license', 'contract', 'vtc_license', 'technical_inspection'],
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    pdf: {
        type: [String],
        default: [],
        validate: {
            validator: function (files) {
                // Vérifier que tous les fichiers sont des PDF
                return files.every(file => file.endsWith('.pdf') || file.includes('.pdf'));
            },
            message: 'Tous les fichiers doivent être des PDF'
        }
    },
    version: {
        type: Number,
        default: 1,
        min: 1
    },
    isCurrent: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index composés pour optimiser les requêtes

documentSchema.index({ vehicle: 1, documentType: 1, version: -1 });
documentSchema.index({ driver: 1, documentType: 1, version: -1 });
documentSchema.index({ expiryDate: 1, isCurrent: 1 });

// Index unique pour garantir qu'il n'y a qu'un seul document courant par type
documentSchema.index(
    { vehicle: 1, documentType: 1, isCurrent: 1 },
    {
        unique: true,
        partialFilterExpression: {
            isCurrent: true,
            vehicle: { $exists: true }
        }
    }
);

documentSchema.index(
    { driver: 1, documentType: 1, isCurrent: 1 },
    {
        unique: true,
        partialFilterExpression: {
            isCurrent: true,
            driver: { $exists: true },
            documentType: { $ne: 'contract' }
        }
    }
);

// Index unique pour les contrats (véhicule + chauffeur)
documentSchema.index(
    { vehicle: 1, driver: 1, documentType: 1, isCurrent: 1 },
    {
        unique: true,
        partialFilterExpression: {
            isCurrent: true,
            documentType: 'contract',
            vehicle: { $exists: true },
            driver: { $exists: true }
        }
    }
);

// Validation pré-sauvegarde améliorée
documentSchema.pre('validate', function (next) {
    // Vérifier qu'au moins une référence existe
    if (!this.vehicle && !this.driver) {
        return next(new Error('Un véhicule ou un chauffeur doit être spécifié'));
    }

    // Règles spécifiques par type de document
    if (this.documentType === 'contract') {
        // Contrat doit avoir véhicule ET chauffeur
        if (!this.vehicle || !this.driver) {
            return next(new Error('Un contrat doit avoir un véhicule ET un chauffeur'));
        }
    } else {
        // Autres documents: soit véhicule, soit chauffeur, pas les deux
        if (this.vehicle && this.driver) {
            return next(new Error('Pour ce type de document, seul un véhicule OU un chauffeur doit être spécifié'));
        }
    }

    next();
});

// Middleware pour gérer les changements de type de document
documentSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();

    // Si le type de document change, valider la nouvelle configuration
    if (update.documentType || update.$set?.documentType) {
        const docId = this.getQuery()._id;
        const currentDoc = await this.model.findById(docId);

        if (currentDoc) {
            const newDocumentType = update.documentType || update.$set?.documentType;
            const newVehicle = update.vehicle || update.$set?.vehicle || currentDoc.vehicle;
            const newDriver = update.driver || update.$set?.driver || currentDoc.driver;

            // Appliquer les mêmes règles de validation
            if (newDocumentType === 'contract') {
                if (!newVehicle || !newDriver) {
                    return next(new Error('Un contrat doit avoir un véhicule ET un chauffeur'));
                }
            } else {
                if (newVehicle && newDriver) {
                    return next(new Error('Pour ce type de document, seul un véhicule OU un chauffeur doit être spécifié'));
                }
            }
        }
    }

    next();
});

// Méthode virtuelle pour vérifier si le document expire bientôt
documentSchema.virtual('isExpiringSoon').get(function () {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.expiryDate <= thirtyDaysFromNow;
});

// Méthode virtuelle pour vérifier si le document est expiré
documentSchema.virtual('isExpired').get(function () {
    return this.expiryDate < new Date();
});

// Méthode statique pour trouver les documents expirants
documentSchema.statics.findExpiring = function (days = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);

    return this.find({
        expiryDate: { $lte: thresholdDate },
        isCurrent: true
    }).populate('vehicle driver');
};

// Méthode statique pour obtenir la version courante d'un document
documentSchema.statics.getCurrentVersion = function (query) {
    return this.findOne({
        ...query,
        isCurrent: true
    }).populate('vehicle driver');
};

// Méthode statique pour obtenir l'historique des versions
documentSchema.statics.getVersionHistory = function (query) {
    return this.find(query)
        .populate('vehicle driver')
        .sort({ version: -1 });
};

// Méthode d'instance pour archiver et promouvoir
documentSchema.methods.archiveAndPromote = async function () {
    if (!this.isCurrent) {
        throw new Error('Ce document est déjà archivé');
    }

    // Archiver ce document
    this.isCurrent = false;
    await this.save();

    // Chercher la version précédente à promouvoir
    const query = {
        documentType: this.documentType,
        isCurrent: false,
        _id: { $ne: this._id }
    };

    if (this.vehicle) query.vehicle = this.vehicle;
    if (this.driver) query.driver = this.driver;

    const previousVersion = await this.constructor.findOne(query)
        .sort({ version: -1 });

    if (previousVersion) {
        previousVersion.isCurrent = true;
        await previousVersion.save();
        return previousVersion;
    }

    return null;
};

// Activer les virtuels dans la sérialisation JSON
documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);