// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
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
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { authService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
    email: z.string().email('Email invalide').min(1, 'Email requis'),
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
        <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--login-bg))]">
            <div className="flex flex-col gap-6 w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Gestion de Flotte</CardTitle>
                        <CardDescription>
                            Connectez-vous avec vos identifiants
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="email"
                                                        placeholder="admin@example.com"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center">
                                                    <FormLabel>Mot de passe</FormLabel>
                                                    <Link
                                                        to="/forgot-password"
                                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                                    >
                                                        Mot de passe oublié?
                                                    </Link>
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="********"
                                                        {...field}
                                                        autoComplete="current-password"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
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

                                <div className="text-center text-sm">
                                    <p>Version de démo | Admin par défaut: admin / admin1234</p>
                                </div>

                                <div className="text-center text-sm">
                                    Pas encore de compte?{' '}
                                    <Link
                                        to="/register"
                                        className="underline underline-offset-4 hover:text-gray-800"
                                    >
                                        Créer un compte
                                    </Link>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-xs text-gray-500">
                            © {new Date().getFullYear()} Application de Gestion de Flotte
                        </p>
                    </CardFooter>
                </Card>
            </div>
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
        </div>
    );
};

export default Login;