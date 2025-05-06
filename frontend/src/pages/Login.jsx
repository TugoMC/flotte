// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CardFooter } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
    username: z.string().min(1, 'Le nom d\'utilisateur est requis'),
    password: z.string().min(1, 'Le mot de passe est requis')
});

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: '',
            password: ''
        }
    });

    const onSubmit = async (data) => {
        // Réinitialiser les erreurs précédentes
        setError(null);

        try {
            setLoading(true);
            const response = await authService.login(data);

            // Stocker le token dans localStorage
            localStorage.setItem('token', response.data.token);

            // Stocker les infos utilisateur (optionnel)
            localStorage.setItem('user', JSON.stringify({
                id: response.data._id,
                username: response.data.username,
                role: response.data.role
            }));

            toast({
                title: 'Connexion réussie',
                description: `Bienvenue ${response.data.firstName} ${response.data.lastName}`
            });

            navigate('/');
        } catch (error) {
            console.error('Erreur de connexion:', error);

            // Gestion détaillée des erreurs
            if (error.response) {
                // La requête a été faite et le serveur a répondu avec un code d'état
                // qui sort de la plage 2xx
                const status = error.response.status;
                const message = error.response.data?.message || 'Une erreur est survenue';

                if (status === 401) {
                    setError('Identifiants incorrects. Veuillez vérifier votre nom d\'utilisateur et mot de passe.');
                } else if (status === 404) {
                    setError('Cet utilisateur n\'existe pas dans notre système.');
                } else if (status === 403) {
                    setError('Votre compte n\'a pas les permissions nécessaires.');
                } else if (status === 429) {
                    setError('Trop de tentatives de connexion. Veuillez réessayer plus tard.');
                } else if (status >= 500) {
                    setError('Problème de serveur. Veuillez réessayer plus tard ou contacter le support.');
                } else {
                    setError(message);
                }
            } else if (error.request) {
                // La requête a été faite mais aucune réponse n'a été reçue
                setError('Impossible de joindre le serveur. Veuillez vérifier votre connexion internet.');
            } else {
                // Une erreur s'est produite lors de la configuration de la requête
                setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
            }

            toast({
                variant: "destructive",
                title: "Échec de connexion",
                description: "Impossible de vous connecter. Veuillez vérifier vos identifiants."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Gestion de Flotte</CardTitle>
                    <CardDescription className="text-center">
                        Connectez-vous avec vos identifiants
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom d'utilisateur</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="admin"
                                                {...field}
                                                autoComplete="username"
                                                className={error ? "border-red-300" : ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="********"
                                                {...field}
                                                autoComplete="current-password"
                                                className={error ? "border-red-300" : ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="animate-spin mr-2">⟳</span>
                                        Connexion en cours...
                                    </>
                                ) : (
                                    'Se connecter'
                                )}
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-4 text-center text-sm">
                        <p>Version de démo | Admin par défaut: admin / admin123</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-4">
                    <p className="text-sm text-gray-600">
                        Pas encore de compte?{' '}
                        <Link
                            to="/register"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Créer un compte
                        </Link>
                    </p>
                    <p className="text-xs text-gray-500">
                        © {new Date().getFullYear()} Application de Gestion de Flotte
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;