// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { authService } from '@/services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
    username: z.string().min(3, 'Nom d\'utilisateur doit contenir au moins 3 caractères'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string().min(6, 'Confirmation du mot de passe requise'),
    email: z.string().email('Email invalide'),
    firstName: z.string().min(2, 'Prénom requis'),
    lastName: z.string().min(2, 'Nom requis')
}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
});

const Register = () => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            password: '',
            confirmPassword: '',
            email: '',
            firstName: '',
            lastName: ''
        }
    });

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');

            const { confirmPassword, ...userData } = data;

            const response = await authService.register(userData);
            localStorage.setItem('token', response.data.token);

            toast({
                title: "Inscription réussie",
                description: "Votre compte a été créé avec succès.",
            });

            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--login-bg))]">
            <div className="flex flex-col gap-6 w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Inscription</CardTitle>
                        <CardDescription>
                            Créez votre compte pour accéder à l'application
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
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prénom</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Votre prénom"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nom</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Votre nom"
                                                        {...field}
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
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="email"
                                                        placeholder="votre@email.com"
                                                        {...field}
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
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nom d'utilisateur</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Votre nom d'utilisateur"
                                                        {...field}
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
                                                <FormLabel>Mot de passe</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Votre mot de passe"
                                                        {...field}
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
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirmer le mot de passe</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Confirmer votre mot de passe"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="animate-spin mr-2">⟳</span>
                                            Inscription en cours...
                                        </>
                                    ) : (
                                        "S'inscrire"
                                    )}
                                </Button>

                                <div className="text-center text-sm">
                                    Vous avez déjà un compte?{' '}
                                    <Link
                                        to="/login"
                                        className="underline underline-offset-4 hover:text-gray-800"
                                    >
                                        Connectez-vous
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

export default Register;