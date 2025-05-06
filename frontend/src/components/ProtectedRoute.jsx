// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// Stockage global pour le cache de vérification et son timestamp
let lastVerification = null;
let lastVerificationTime = 0;
const VERIFICATION_INTERVAL = 10000; // 10 secondes en millisecondes

const ProtectedRoute = ({ children, requiredRole }) => {
    const [isAuth, setIsAuth] = useState(null);
    const [user, setUser] = useState(null);
    const location = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                console.log("Token trouvé:", token ? "Oui" : "Non");

                if (!token) {
                    console.log("Aucun token, redirection vers login");
                    setIsAuth(false);
                    return;
                }

                const now = Date.now();
                // Vérifier si nous avons un résultat en cache récent
                if (lastVerification && (now - lastVerificationTime < VERIFICATION_INTERVAL)) {
                    console.log("Utilisation du cache de vérification (intervalle < 10s)");
                    if (lastVerification.isValid) {
                        setUser(lastVerification.user);
                        setIsAuth(true);
                    } else {
                        setIsAuth(false);
                    }
                    return;
                }

                console.log("Tentative de vérification du token...");
                const { data } = await authService.verifyToken();
                console.log("Résultat vérification:", data);

                // Mettre à jour le cache
                lastVerification = { isValid: true, user: data.user };
                lastVerificationTime = now;

                setUser(data.user);
                setIsAuth(true);
            } catch (error) {
                console.error('Erreur détaillée:', error.response || error);

                // Mettre à jour le cache en cas d'erreur
                lastVerification = { isValid: false };
                lastVerificationTime = Date.now();

                localStorage.removeItem('token');
                setIsAuth(false);
                toast({
                    variant: "destructive",
                    title: "Session expirée",
                    description: "Veuillez vous reconnecter.",
                });
            }
        };

        verifyAuth();
    }, [toast, location.pathname]); // Ajout de location.pathname pour revérifier lors des changements de page

    // Afficher un loader pendant la vérification
    if (isAuth === null) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="mt-2">Vérification de l'authentification...</p>
                </div>
            </div>
        );
    }

    // Rediriger vers la page de connexion si non authentifié
    if (!isAuth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Vérifier le rôle si nécessaire
    if (requiredRole && user.role !== requiredRole &&
        // Si le rôle requis est manager mais que l'utilisateur est admin, on autorise quand même
        !(requiredRole === 'manager' && user.role === 'admin') &&
        // Si le rôle requis est driver mais que l'utilisateur est admin ou manager, on autorise quand même
        !(requiredRole === 'driver' && (user.role === 'admin' || user.role === 'manager'))) {

        toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
        });

        return <Navigate to="/" replace />;
    }

    // Tout est ok, on affiche le contenu protégé
    return children;
};

export default ProtectedRoute;