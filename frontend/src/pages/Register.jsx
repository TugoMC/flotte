// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-gray-800">Inscription</CardTitle>
                    <CardDescription className="text-center text-gray-600">
                        Créez votre compte pour accéder à l'application
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700">Prénom</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Votre prénom"
                                                    {...field}
                                                    className="focus-visible:ring-2 focus-visible:ring-blue-500"
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
                                            <FormLabel className="text-gray-700">Nom</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Votre nom"
                                                    {...field}
                                                    className="focus-visible:ring-2 focus-visible:ring-blue-500"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700">Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="votre@email.com"
                                                {...field}
                                                className="focus-visible:ring-2 focus-visible:ring-blue-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700">Nom d'utilisateur</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Votre nom d'utilisateur"
                                                {...field}
                                                className="focus-visible:ring-2 focus-visible:ring-blue-500"
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
                                        <FormLabel className="text-gray-700">Mot de passe</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Votre mot de passe"
                                                {...field}
                                                className="focus-visible:ring-2 focus-visible:ring-blue-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700">Confirmer le mot de passe</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Confirmer votre mot de passe"
                                                {...field}
                                                className="focus-visible:ring-2 focus-visible:ring-blue-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={loading}
                            >
                                {loading ? "Inscription en cours..." : "S'inscrire"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-4">
                    <p className="text-sm text-gray-600">
                        Vous avez déjà un compte?{' '}
                        <Link
                            to="/login"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Connectez-vous
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

export default Register;