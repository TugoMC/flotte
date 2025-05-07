// src/services/vehicleService.js
import api from './api';

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