// src/services/api.js
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL
});

// Cache pour les requêtes utilisateur
const userRequestsCache = {
    me: {
        data: null,
        timestamp: 0
    },
    verifyToken: {
        data: null,
        timestamp: 0
    }
};

const CACHE_INTERVAL = 10000; // 10 secondes en millisecondes

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
    response => response,
    error => {
        const message = error.response?.data?.message || 'Une erreur est survenue';
        toast({
            variant: "destructive",
            title: "Erreur",
            description: message,
        });
        return Promise.reject(error);
    }
);

// Services implémentés avec cache pour les requêtes utilisateur
export const authService = {
    login: (credentials) => {
        // Invalider le cache après login
        userRequestsCache.me.data = null;
        userRequestsCache.verifyToken.data = null;
        return api.post('/users/login', credentials);
    },

    register: (userData) => api.post('/users/register', userData),

    logout: () => {
        // Invalider le cache après logout
        userRequestsCache.me.data = null;
        userRequestsCache.verifyToken.data = null;
        return api.post('/users/logout');
    },

    getCurrentUser: async () => {
        const now = Date.now();

        // Utiliser le cache si disponible et récent
        if (userRequestsCache.me.data && now - userRequestsCache.me.timestamp < CACHE_INTERVAL) {
            console.log("Utilisation du cache pour /users/me");
            return { data: userRequestsCache.me.data };
        }

        // Sinon, faire la requête
        console.log("Appel API vers /users/me");
        const response = await api.get('/users/me');

        // Mettre à jour le cache
        userRequestsCache.me.data = response.data;
        userRequestsCache.me.timestamp = now;

        return response;
    },

    updateProfile: (data) => {
        // Invalider le cache après mise à jour du profil
        userRequestsCache.me.data = null;
        return api.put('/users/me', data);
    },

    verifyToken: async () => {
        const now = Date.now();

        // Utiliser le cache si disponible et récent
        if (userRequestsCache.verifyToken.data && now - userRequestsCache.verifyToken.timestamp < CACHE_INTERVAL) {
            console.log("Utilisation du cache pour /users/verify-token");
            return { data: userRequestsCache.verifyToken.data };
        }

        // Sinon, faire la requête
        console.log("Appel API vers /users/verify-token");
        const response = await api.get('/users/verify-token');

        // Mettre à jour le cache
        userRequestsCache.verifyToken.data = response.data;
        userRequestsCache.verifyToken.timestamp = now;

        return response;
    },
    changePassword: (passwordData) => api.post('/users/change-password', passwordData),
};

export const vehicleService = {
    getAll: () => api.get('/vehicles'),
    getById: (id) => api.get(`/vehicles/${id}`),
    create: (data) => api.post('/vehicles', data),
    update: (id, data) => api.put(`/vehicles/${id}`, data),
    delete: (id) => api.delete(`/vehicles/${id}`),
    getAvailable: () => api.get('/vehicles/available'),
    getByStatus: (status) => api.get(`/vehicles/status/${status}`),
    setDailyTarget: (id, target) => api.put(`/vehicles/${id}/target`, { dailyIncomeTarget: target }),
    changeStatus: (id, status) => api.put(`/vehicles/${id}/status`, { status }),
    assignDriver: (id, driverId) => api.put(`/vehicles/${id}/assign-driver`, { driverId }),
    releaseDriver: (id) => api.put(`/vehicles/${id}/release-driver`),
    uploadPhotos: (id, files) => {
        const formData = new FormData();
        // Ajouter chaque fichier à formData sous le nom "photos" (comme attendu par le backend)
        if (Array.isArray(files)) {
            files.forEach(file => formData.append('photos', file));
        } else {
            formData.append('photos', files);
        }
        return api.post(`/vehicles/${id}/photos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    deletePhoto: (id, photoIndex) => api.delete(`/vehicles/${id}/photos/${photoIndex}`)
};

export const driverService = {
    getAll: () => api.get('/drivers'),
    getById: (id) => api.get(`/drivers/${id}`),
    create: (data) => api.post('/drivers', data),
    update: (id, data) => api.put(`/drivers/${id}`, data),
    delete: (id) => api.delete(`/drivers/${id}`),

    // Méthodes pour obtenir les chauffeurs par statut
    getAvailable: () => api.get('/drivers/available'),
    getActive: () => api.get('/drivers/active'),
    getFormer: () => api.get('/drivers/former'),

    // Méthodes pour la gestion des photos
    uploadPhotos: (id, files) => {
        const formData = new FormData();
        // Ajouter chaque fichier à formData sous le nom "photos" (comme attendu par le backend)
        if (Array.isArray(files)) {
            files.forEach(file => formData.append('photos', file));
        } else {
            formData.append('photos', files);
        }
        return api.post(`/drivers/${id}/photos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    deletePhoto: (id, photoIndex) => api.delete(`/drivers/${id}/photos/${photoIndex}`)
}

export const scheduleService = {
    getAll: () => api.get('/schedules'),
    getById: (id) => api.get(`/schedules/${id}`),
    create: (data) => api.post('/schedules', data),
    update: (id, data) => api.put(`/schedules/${id}`, data),
    delete: (id) => api.delete(`/schedules/${id}`),

    // Méthodes de récupération par critères
    getByDriver: (driverId) => api.get(`/schedules/driver/${driverId}`),
    getByVehicle: (vehicleId) => api.get(`/schedules/vehicle/${vehicleId}`),
    getByDate: (date) => api.get(`/schedules/date/${date}`),
    getByPeriod: (start, end) => api.get(`/schedules/period?start=${start}&end=${end}`),
    getCurrent: () => api.get('/schedules/current'),
    getFuture: () => api.get('/schedules/future'),

    // Gestion des statuts
    changeStatus: (id, status) => api.put(`/schedules/${id}/status`, { status }),
    completeSchedule: (id) => api.put(`/schedules/${id}/status`, { status: 'completed' }),
    cancelSchedule: (id) => api.put(`/schedules/${id}/status`, { status: 'canceled' }),
    activateSchedule: (id) => api.put(`/schedules/${id}/status`, { status: 'assigned' }),
    setPendingSchedule: (id) => api.put(`/schedules/${id}/status`, { status: 'pending' }),

    // Vérification manuelle des plannings expirés
    checkExpiredSchedules: () => api.post('/schedules/check-expired')
};

export const paymentService = {
    getAll: () => api.get('/payments'),
    getById: (id) => api.get(`/payments/${id}`),
    create: (data) => api.post('/payments', data),
    update: (id, data) => api.put(`/payments/${id}`, data),
    delete: (id) => api.delete(`/payments/${id}`),

    // Méthode corrigée pour correspondre à la route POST du backend
    changeStatus: (id, status) => api.post(`/payments/${id}/status`, { status }),

    // Paiements en attente
    getPendingPayments: () => api.get('/payments/pending'),

    // Paiements liés à un planning
    getBySchedule: (scheduleId) => api.get(`/payments/schedule/${scheduleId}`),
    getPendingPaymentsBySchedule: (scheduleId) => api.get(`/payments/schedule/${scheduleId}/pending`),
    getMissingPaymentsForSchedule: (scheduleId) => api.get(`/payments/schedule/${scheduleId}/missing`),

    // Confirmation de plusieurs paiements
    confirmMultiplePayments: (paymentIds) => api.post('/payments/confirm-multiple', { paymentIds }),

    // Ajout de média à un paiement
    addMedia: (id, mediaData) => api.post(`/payments/${id}/media`, mediaData),

    // Récupération par chauffeur, véhicule, date
    getByDriver: (driverId) => api.get(`/payments/driver/${driverId}`),
    getByVehicle: (vehicleId) => api.get(`/payments/vehicle/${vehicleId}`),
    getByDate: (date) => api.get(`/payments/date/${date}`),
    getByPeriod: (start, end) => api.get(`/payments/period?start=${start}&end=${end}`),

    // Statistiques
    getStats: () => api.get('/payments/stats/general'),
    getDailyStats: () => api.get('/payments/stats/daily'),
    getDriverStats: () => api.get('/payments/stats/drivers'),
    getVehicleStats: () => api.get('/payments/stats/vehicles')
};

export const mediaService = {
    // Get all media
    getAll: () => api.get('/media'),

    // Get media by ID
    getById: (id) => api.get(`/media/${id}`),

    // Get media by entity type
    getByEntityType: (entityType) => api.get(`/media/entity-type/${entityType}`),

    // Get media by entity (type and ID)
    getByEntity: (entityType, entityId) => api.get(`/media/entity/${entityType}/${entityId}`),

    // Create new media record (usually after upload)
    create: (data) => api.post('/media', data),

    // Update media
    update: (id, data) => api.put(`/media/${id}`, data),

    // Delete media
    delete: (id) => api.delete(`/media/${id}`),

    // Get media statistics
    getStats: () => api.get('/media/stats'),

    // Upload file with entity information
    upload: (file, entityType, entityId) => {
        const formData = new FormData();
        formData.append('media', file); // 'media' pour correspondre au backend
        formData.append('entityType', entityType);
        formData.append('entityId', entityId);

        return api.post('/upload', formData, { // Correction: enlevé 'api/'
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};
/*
export const expenseService = {
    getAll: () => api.get('/expenses'),
    getById: (id) => api.get(`/expenses/${id}`),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
    getByVehicle: (vehicleId) => api.get(`/expenses/vehicle/${vehicleId}`),
    getByType: (type) => api.get(`/expenses/type/${type}`), // type: fuel, maintenance, ticket, accident
    getByDateRange: (startDate, endDate) => api.get(`/expenses/range?start=${startDate}&end=${endDate}`),
    getStats: () => api.get('/expenses/stats')
};
*/
/*
export const maintenanceService = {
    getAll: () => api.get('/maintenance'),
    getById: (id) => api.get(`/maintenance/${id}`),
    create: (data) => api.post('/maintenance', data),
    update: (id, data) => api.put(`/maintenance/${id}`, data),
    delete: (id) => api.delete(`/maintenance/${id}`),
    getByVehicle: (vehicleId) => api.get(`/maintenance/vehicle/${vehicleId}`),
    getUpcoming: () => api.get('/maintenance/upcoming'),
    getHistory: (vehicleId) => api.get(`/maintenance/history/${vehicleId}`)
};
*/
/*
export const documentService = {
    getAll: () => api.get('/documents'),
    getById: (id) => api.get(`/documents/${id}`),
    create: (data) => api.post('/documents', data),
    update: (id, data) => api.put(`/documents/${id}`, data),
    delete: (id) => api.delete(`/documents/${id}`),
    getByVehicle: (vehicleId) => api.get(`/documents/vehicle/${vehicleId}`),
    getByDriver: (driverId) => api.get(`/documents/driver/${driverId}`),
    getExpiringSoon: (days) => api.get(`/documents/expiring?days=${days}`)
};
*/
/*
export const dashboardService = {
    getSummary: () => api.get('/dashboard/summary'),
    getRevenue: (period) => api.get(`/dashboard/revenue?period=${period}`),
    getExpenses: (period) => api.get(`/dashboard/expenses?period=${period}`),
    getAlerts: () => api.get('/dashboard/alerts'),
    getVehicleStats: () => api.get('/dashboard/vehicle-stats'),
    getDriverPerformance: () => api.get('/dashboard/driver-performance')
};
*/
/*
export const reportService = {
    getRevenueReport: (startDate, endDate) =>
        api.get(`/reports/revenue?start=${startDate}&end=${endDate}`),
    getExpenseReport: (startDate, endDate) =>
        api.get(`/reports/expenses?start=${startDate}&end=${endDate}`),
    getDriverReport: (driverId, startDate, endDate) =>
        api.get(`/reports/driver/${driverId}?start=${startDate}&end=${endDate}`),
    getVehicleReport: (vehicleId, startDate, endDate) =>
        api.get(`/reports/vehicle/${vehicleId}?start=${startDate}&end=${endDate}`),
    generatePDF: (reportType, params) =>
        api.post('/reports/generate-pdf', { reportType, params }),
    generateExcel: (reportType, params) =>
        api.post('/reports/generate-excel', { reportType, params })
};
*/
/*
export const mediaService = {
    upload: (file, entityType, entityId) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        formData.append('entityId', entityId);
        return api.post('/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    delete: (id) => api.delete(`/media/${id}`)
};
*/

export default api;