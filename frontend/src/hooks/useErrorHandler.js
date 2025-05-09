// src/hooks/useErrorHandler.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook pour la gestion des erreurs HTTP
 * @returns {Object} Fonctions et état pour la gestion des erreurs
 */
export const useErrorHandler = () => {
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    /**
     * Gère une erreur HTTP et redirige vers la page d'erreur appropriée
     * @param {Error} error - L'erreur à traiter
     * @param {boolean} redirect - Si vrai, redirige vers une page d'erreur
     */
    const handleError = (error, redirect = true) => {
        setError(error);

        if (!redirect) return;

        // Extraire le code d'erreur de la réponse Axios
        const statusCode = error.response?.status || 500;

        // Messages d'erreur personnalisés
        const errorMessage = error.response?.data?.message || error.message;

        // Rediriger vers la page d'erreur correspondante
        navigate(`/error/${statusCode}`, {
            state: {
                message: errorMessage,
                details: error.toString()
            }
        });
    };

    /**
     * Enveloppe une fonction async avec la gestion d'erreur
     * @param {Function} fn - La fonction à envelopper
     * @returns {Function} La fonction enveloppée
     */
    const withErrorHandling = (fn) => async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error);
            throw error; // Re-throw pour permettre la gestion en aval si nécessaire
        }
    };

    return {
        error,
        setError,
        handleError,
        withErrorHandling
    };
};

export default useErrorHandler;