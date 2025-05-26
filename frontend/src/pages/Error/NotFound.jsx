// src/pages/Error/NotFound.jsx
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from "@/hooks/use-theme";

const NotFound = () => {
    const { theme } = useTheme();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <AlertTriangle className={`h-24 w-24 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                </div>

                <h1 className="text-5xl font-bold tracking-tight">404</h1>

                <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-semibold">Page non trouvée</h2>
                    <p className={`max-w-md ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        La page que vous recherchez n'existe pas ou a été déplacée.
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild>
                        <Link to="/">
                            Retourner à l'accueil
                        </Link>
                    </Button>
                </div>
            </div>

            <div className={`mt-12 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                © {new Date().getFullYear()} Application de Gestion de Flotte
            </div>
        </div>
    );
};

export default NotFound;