// src/pages/NotFound.jsx
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <AlertTriangle className="h-24 w-24 text-yellow-500" />
                </div>

                <h1 className="text-5xl font-bold tracking-tight">404</h1>

                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Page non trouvée</h2>
                    <p className="text-gray-500 max-w-md">
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

            <div className="mt-12 text-sm text-gray-500">
                © {new Date().getFullYear()} Application de Gestion de Flotte
            </div>
        </div>
    );
};

export default NotFound;