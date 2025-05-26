// src/services/documentService.js
import api from './api';

export const documentService = {
    // Routes standard CRUD
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }
        return api.get(`/documents?${queryParams.toString()}`);
    },

    getById: (id) => api.get(`/documents/${id}`),

    create: (data) => {
        const formData = new FormData();

        // Ajouter les champs texte
        for (const key in data) {
            if (key !== 'files' && data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        }

        // Ajouter les fichiers PDF
        if (data.files && Array.isArray(data.files)) {
            data.files.forEach(file => {
                formData.append('files', file);
            });
        }

        return api.post('/documents', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    update: (id, data) => {
        const formData = new FormData();

        // Ajouter les champs texte
        for (const key in data) {
            if (key !== 'pdf' && data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        }

        // Ajouter les nouveaux fichiers PDF si fournis
        if (data.pdf && Array.isArray(data.pdf)) {
            data.pdf.forEach(file => {
                formData.append('pdf', file);
            });
        } else if (data.pdf) {
            formData.append('pdf', data.pdf);
        }

        return api.put(`/documents/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    delete: (id) => api.delete(`/documents/${id}`),

    // Routes spécialisées pour les documents expirés
    getExpiringDocuments: (days = 30) => api.get(`/documents/expiring?days=${days}`),

    // Routes pour la gestion des versions
    getCurrentVersion: (params) => {
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }
        return api.get(`/documents/current?${queryParams.toString()}`);
    },

    getVersionHistory: (params) => {
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }
        return api.get(`/documents/versions?${queryParams.toString()}`);
    },

    // Route pour archiver un document
    archiveDocument: (id) => api.put(`/documents/${id}/archive`),

    // Routes pour la gestion des PDFs
    addPdf: (id, files) => {
        const formData = new FormData();

        if (Array.isArray(files)) {
            files.forEach(file => formData.append('pdf', file));
        } else {
            formData.append('pdf', files);
        }

        return api.post(`/documents/${id}/pdf`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    deletePdf: (id, pdfIndex) => {
        if (pdfIndex === undefined || pdfIndex === null) {
            throw new Error('Index de PDF non défini');
        }
        return api.delete(`/documents/${id}/pdf/${pdfIndex}`);
    },

    // Méthodes utilitaires pour filtrer les documents
    getByVehicle: (vehicleId, includeArchived = false) => {
        return documentService.getAll({
            vehicleId,
            includeArchived: includeArchived.toString()
        });
    },

    getByDriver: (driverId, includeArchived = false) => {
        return documentService.getAll({
            driverId,
            includeArchived: includeArchived.toString()
        });
    },

    getByType: (documentType, includeArchived = false) => {
        return documentService.getAll({
            documentType,
            includeArchived: includeArchived.toString()
        });
    },

    // Méthode pour récupérer les documents par véhicule et type
    getByVehicleAndType: (vehicleId, documentType, includeArchived = false) => {
        return documentService.getAll({
            vehicleId,
            documentType,
            includeArchived: includeArchived.toString()
        });
    },

    // Méthode pour récupérer les documents par chauffeur et type
    getByDriverAndType: (driverId, documentType, includeArchived = false) => {
        return documentService.getAll({
            driverId,
            documentType,
            includeArchived: includeArchived.toString()
        });
    },

    // Méthode pour vérifier les documents expirés d'un véhicule
    getExpiringByVehicle: (vehicleId, days = 30) => {
        return api.get(`/documents/expiring?days=${days}&vehicleId=${vehicleId}`);
    },

    // Méthode pour vérifier les documents expirés d'un chauffeur
    getExpiringByDriver: (driverId, days = 30) => {
        return api.get(`/documents/expiring?days=${days}&driverId=${driverId}`);
    },

    // Méthode pour récupérer uniquement les documents actifs (non archivés)
    getCurrentDocuments: (filters = {}) => {
        return documentService.getAll({ ...filters, includeArchived: 'false' });
    },

    // Méthode pour récupérer tous les documents (y compris archivés)
    getAllDocuments: (filters = {}) => {
        return documentService.getAll({ ...filters, includeArchived: 'true' });
    }
};