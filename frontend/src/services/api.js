// src/services/api.js
import axios from 'axios';
import { toast } from 'sonner';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
        // Récupérer les informations d'erreur
        const statusCode = error.response?.status;
        const message = error.response?.data?.message || 'Une erreur est survenue';

        // Afficher un toast d'erreur
        toast.error(message);

        // Gérer les cas spéciaux d'erreur
        if (statusCode === 401) {
            // Non autorisé - rediriger vers la page de connexion si nous ne sommes pas déjà sur celle-ci
            const currentPath = window.location.pathname;
            if (currentPath !== '/login') {
                // Stocker l'URL actuelle pour redirection après connexion
                localStorage.setItem('redirectAfterLogin', currentPath);

                // Supprimer le token invalide
                localStorage.removeItem('token');

                // Rediriger vers la page de connexion
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }
        else if (statusCode === 403) {
            // Accès refusé - rediriger vers la page 403
            window.location.href = '/error/403';
            return Promise.reject(error);
        }
        else if (statusCode === 404) {
            // Ressource non trouvée - rediriger vers la page 404 si l'utilisateur a demandé une ressource
            // Ne pas rediriger si c'est une API qui a retourné 404
            const requestPath = error.config?.url;
            if (requestPath.includes('/api/') && requestPath.split('/').length > 3) {
                // C'est probablement une ressource spécifique qui est demandée
                // On peut afficher un message mais ne pas rediriger
                console.warn('API Resource not found:', requestPath);
            }
        }
        else if (statusCode === 500) {
            // Erreur serveur - rediriger vers la page 500 pour les erreurs graves
            console.error('Server error:', error);
            // Optionnel: ne pas rediriger automatiquement pour toutes les erreurs 500
            // window.location.href = '/error/500';
        }

        // Pour le développement, consigner l'erreur
        console.error('API Error:', error);

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

export const userService = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    register: (data) => api.post('/users/register', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
    toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
    changePassword: (id, passwordData) => api.post(`/users/change-password`, passwordData),
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

    // Méthode de changement de statut (correcte)
    changeStatus: (id, status) => api.post(`/payments/${id}/status`, { status }),

    // Paiements en attente
    getPendingPayments: () => api.get('/payments/pending'),

    // Paiements liés à un planning
    getBySchedule: (scheduleId) => api.get(`/payments/schedule/${scheduleId}`),
    getPendingPaymentsBySchedule: (scheduleId) => api.get(`/payments/schedule/${scheduleId}/pending`),
    getMissingPaymentsForSchedule: (scheduleId) => api.get(`/payments/schedule/${scheduleId}/missing`),

    // Confirmation de plusieurs paiements
    confirmMultiplePayments: (paymentIds) => api.post('/payments/confirm-multiple', { paymentIds }),

    // Gestion des photos - AJOUT pour correspondre au backend
    uploadPhotos: (id, files) => {
        const formData = new FormData();
        if (Array.isArray(files)) {
            files.forEach(file => formData.append('photos', file));
        } else {
            formData.append('photos', files);
        }
        return api.post(`/payments/${id}/photos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    deletePhoto: (id, photoIndex) => api.delete(`/payments/${id}/photos/${photoIndex}`),

    // Récupération par chauffeur, véhicule, date
    getByDriver: (driverId) => api.get(`/payments/driver/${driverId}`),
    getByVehicle: (vehicleId) => api.get(`/payments/vehicle/${vehicleId}`),
    getByDate: (date) => api.get(`/payments/date/${date}`),
    getByPeriod: (start, end) => api.get(`/payments/period?start=${start}&end=${end}`),

    // Statistiques
    getStats: () => api.get('/payments/stats'),
    getDailyRevenue: (start, end) => api.get(`/payments/stats/daily-revenue?${start ? `start=${start}` : ''}${end ? `&end=${end}` : ''}`),
    getDriverStats: () => api.get('/payments/stats/drivers'),
    getVehicleStats: () => api.get('/payments/stats/vehicles'),
    getDashboardStats: () => api.get('/payments/dashboard-stats'),
    getPaginatedPayments: (params) => {
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }
        return api.get(`/payments/list/paginated?${queryParams.toString()}`);
    }

};

export const maintenanceService = {
    // Routes standard CRUD
    getAll: () => api.get('/maintenances'),
    getById: (id) => api.get(`/maintenances/${id}`),
    create: (data) => api.post('/maintenances', data),
    update: (id, data) => api.put(`/maintenances/${id}`, data),
    delete: (id) => api.delete(`/maintenances/${id}`),

    // Routes par véhicule et par type
    getByVehicle: (vehicleId) => api.get(`/maintenances/vehicle/${vehicleId}`),
    getByType: (type) => api.get(`/maintenances/type/${type}`),

    // Route pour marquer une maintenance comme terminée
    completeMaintenance: (id) => api.put(`/maintenances/${id}/complete`),

    // Routes pour la gestion des photos
    uploadPhotos: (id, files) => {
        const formData = new FormData();
        // Ajouter chaque fichier à formData sous le nom "photos" (comme attendu par le backend)
        if (Array.isArray(files)) {
            files.forEach(file => formData.append('photos', file));
        } else {
            formData.append('photos', files);
        }
        return api.post(`/maintenances/${id}/photos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    deletePhoto: (id, photoIndex) => api.delete(`/maintenances/${id}/photos/${photoIndex}`),

    // Routes statistiques et de validation
    getStats: () => api.get('/maintenances/stats'),
    checkStatusConsistency: () => api.get('/maintenances/check-status'),
    validateDates: () => api.get('/maintenances/validate-dates'),
    getDailyCosts: (start, end) => api.get(`/maintenances/daily-costs?${start ? `start=${start}` : ''}${end ? `&end=${end}` : ''}`),
    checkConflicts: (vehicleId, startDate, endDate = null) => {
        const params = { vehicleId, startDate };
        if (endDate) params.endDate = endDate;
        return api.get('/maintenances/check-conflicts', { params });
    },
};


export const historyService = {
    getRecentActivities: (limit = 5) => api.get(`/history/recent?limit=${limit}`),
    getByEntity: (id) => api.get(`/history/entity/${id}`),
    getStats: () => api.get('/history/stats'),
    getAll: async (params) => {
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }

        try {
            const response = await api.get(`/history?${queryParams.toString()}`);
            return {
                data: {
                    activities: response.data.activities || [],
                    totalPages: response.data.totalPages || 1
                }
            };
        } catch (error) {
            return {
                data: {
                    activities: [],
                    totalPages: 1
                }
            };
        }
    },
};



export default api;