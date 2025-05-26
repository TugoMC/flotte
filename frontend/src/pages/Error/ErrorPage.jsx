// src/pages/Error/ErrorPage.jsx
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/ThemeToggle";

const ErrorPage = ({ code = 500, message, details }) => {
    const { theme } = useTheme();
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
        <div className={`flex flex-col items-center justify-center min-h-screen px-4 bg-background`}>
            {/* Ajoutez le bouton de changement de thème */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="text-center space-y-6">
                {/* Adaptez les couleurs en fonction du thème */}
                <div className="flex justify-center">
                    <IconComponent className={`h-24 w-24 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                </div>

                <h1 className="text-5xl font-bold tracking-tight">{code}</h1>

                <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-semibold">{config.title}</h2>
                    <p className={`max-w-md ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {config.description}
                    </p>
                    {details && (
                        <p className={`text-sm mt-2 max-w-md mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {details}
                        </p>
                    )}
                </div>

                <div className="pt-4 flex gap-3 justify-center">
                    <Button asChild>
                        <Link to="/">
                            Retourner à l'accueil (Admin, Manager)
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link to="/driver">
                            Retourner (Chauffeur)
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        Retour
                    </Button>

                </div>
            </div>

            <div className={`mt-12 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                © {new Date().getFullYear()} Application de Gestion de Flotte
            </div>
        </div>
    );
};

export default ErrorPage;