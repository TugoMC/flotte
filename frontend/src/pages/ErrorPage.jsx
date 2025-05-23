// src/pages/ErrorPage.jsx
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

const ErrorPage = ({ code = 500, message, details }) => {
    const navigate = useNavigate();

    // Configuration des titres et descriptions par défaut selon le code d'erreur
    const errorConfig = {
        400: {
            title: "Requête incorrecte",
            description: message || "Les données envoyées sont incorrectes ou mal formatées.",
            icon: AlertCircle
        },
        401: {
            title: "Non autorisé",
            description: message || "Vous devez être connecté pour accéder à cette ressource.",
            icon: AlertCircle
        },
        403: {
            title: "Accès refusé",
            description: message || "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.",
            icon: AlertCircle
        },
        404: {
            title: "Page non trouvée",
            description: message || "La page que vous recherchez n'existe pas ou a été déplacée.",
            icon: AlertTriangle
        },
        500: {
            title: "Erreur serveur",
            description: message || "Une erreur est survenue sur le serveur. Veuillez réessayer plus tard.",
            icon: AlertTriangle
        },
        default: {
            title: "Erreur",
            description: message || "Une erreur inattendue s'est produite.",
            icon: AlertTriangle
        }
    };

    // Récupérer la configuration pour ce code d'erreur ou utiliser la configuration par défaut
    const config = errorConfig[code] || errorConfig.default;
    const IconComponent = config.icon;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <IconComponent className="h-24 w-24 text-yellow-500" />
                </div>

                <h1 className="text-5xl font-bold tracking-tight">{code}</h1>

                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">{config.title}</h2>
                    <p className="text-gray-500 max-w-md">
                        {config.description}
                    </p>
                    {details && (
                        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                            {details}
                        </p>
                    )}
                </div>

                <div className="pt-4 flex gap-3 justify-center">
                    <Button asChild>
                        <Link to="/">
                            Retourner à l'accueil
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        Retour
                    </Button>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Réessayer
                    </Button>
                </div>
            </div>

            <div className="mt-12 text-sm text-gray-500">
                © {new Date().getFullYear()} Application de Gestion de Flotte
            </div>
        </div>
    );
};

export default ErrorPage;