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
    identifier: z.string().min(1, 'Email ou nom d\'utilisateur requis'),
    password: z.string().min(1, 'Le mot de passe est requis')
});

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { toast } = useToast();

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: '',
            password: ''
        }
    });

    const onSubmit = async (data) => {
        setError('');

        try {
            setLoading(true);
            const response = await authService.login({
                identifier: data.identifier,
                password: data.password
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));

            toast({
                title: 'Connexion réussie',
                description: `Bienvenue ${response.data.firstName || ''}`,
                variant: 'default'
            });

            // Rediriger vers la page demandée ou la page d'accueil
            const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
            localStorage.removeItem('redirectAfterLogin');
            navigate(redirectTo);
        } catch (err) {
            console.error('Erreur de connexion:', err);
            const errorMessage = err.response?.data?.message || 'Identifiant ou mot de passe incorrect';
            setError(errorMessage);
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
                                        name="identifier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email ou nom d'utilisateur</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="email@exemple.com ou nom_utilisateur"
                                                        {...field}
                                                        autoComplete="username"
                                                    />
                                                </FormControl>
                                                <FormMessage />
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
                                    <p>Version de démo | Manager par défaut: manager1 / manager1</p>
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