// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastVerified, setLastVerified] = useState(0);
    const navigate = useNavigate();

    const TOKEN_VERIFY_INTERVAL = 10000; // 10 secondes en millisecondes

    // Vérifier le token au chargement initial
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await authService.getCurrentUser();
                    setUser(res.data);
                    setLastVerified(Date.now());
                } catch (error) {
                    console.error('Échec de la récupération de l\'utilisateur:', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Vérification périodique du token avec un intervalle minimum de 10 secondes
    const verifyToken = async () => {
        const now = Date.now();
        const timeSinceLastVerify = now - lastVerified;

        // Ne vérifier que si au moins 10 secondes se sont écoulées depuis la dernière vérification
        if (timeSinceLastVerify < TOKEN_VERIFY_INTERVAL) {
            return true; // Retourner vrai sans faire de requête API
        }

        try {
            const res = await authService.verifyToken();
            if (res.data.valid) {
                setLastVerified(now);
                return true;
            } else {
                logout();
                return false;
            }
        } catch (error) {
            console.error('Échec de vérification du token:', error);
            logout();
            return false;
        }
    };

    const login = async (credentials) => {
        const res = await authService.login(credentials);
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        setLastVerified(Date.now());
        return res.data;
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            navigate('/login');
        }
    };

    const updateUserProfile = async (data) => {
        const res = await authService.updateProfile(data);
        setUser(res.data);
        return res.data;
    };

    const value = {
        user,
        loading,
        login,
        logout,
        verifyToken,
        updateUserProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};