// src/pages/Authentification/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Eye, EyeOff } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

const formSchema = z.object({
    username: z.string()
        .min(3, '3 caractères minimum')
        .max(20, '20 caractères maximum')
        .regex(/^[a-zA-Z0-9_]+$/, 'Caractères alphanumériques uniquement'),
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string().min(6, 'Confirmation du mot de passe requise'),
    firstName: z.string().min(2, 'Prénom requis'),
    lastName: z.string().min(2, 'Nom requis'),
    phoneNumber: z.string().min(8, 'Numéro de téléphone requis').optional(),
    licenseNumber: z.string().min(5, 'Numéro de permis requis').optional(),
    role: z.enum(['driver', 'manager'], {
        errorMap: () => ({ message: 'Sélectionnez un rôle valide' })
    })
}).superRefine((data, ctx) => {
    // Validation conditionnelle pour les chauffeurs
    if (data.role === 'driver') {
        if (!data.phoneNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['phoneNumber'],
                message: 'Numéro de téléphone requis pour les chauffeurs'
            });
        }
        if (!data.licenseNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['licenseNumber'],
                message: 'Numéro de permis requis pour les chauffeurs'
            });
        }
    }

    // Vérification de la correspondance des mots de passe
    if (data.password !== data.confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['confirmPassword'],
            message: 'Les mots de passe ne correspondent pas'
        });
    }
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
            lastName: '',
            role: 'driver'
        }
    });

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const { confirmPassword, ...userData } = data;

            const requestData = {
                ...userData,
                role: data.role
            };

            if (data.role === 'driver') {
                requestData.phoneNumber = data.phoneNumber;
                requestData.licenseNumber = data.licenseNumber;
            }

            const response = await authService.register(requestData);

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));

            toast({
                title: "Inscription réussie",
                description: data.role === 'driver'
                    ? "Votre compte chauffeur a été créé avec succès"
                    : "Votre compte manager a été créé avec succès"
            });

            // Redirection différente selon le rôle
            navigate(data.role === 'driver' ? '/driver' : '/');
        } catch (err) {
            setError(err.response?.data?.message || "Erreur d'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--login-bg))]">
            <div className="w-full max-w-5xl px-4">
                <Card className="w-full">
                    <CardHeader className="text-center">
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
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* Disposition en grille pour le mode paysage */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Première colonne - Informations personnelles */}
                                    <div className="space-y-4">
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

                                    {/* Deuxième colonne - Mot de passe */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => {
                                                const [showPassword, setShowPassword] = useState(false);
                                                return (
                                                    <FormItem>
                                                        <FormLabel>Mot de passe</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder="Votre mot de passe"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                            >
                                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                );
                                            }}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="confirmPassword"
                                            render={({ field }) => {
                                                const [showPassword, setShowPassword] = useState(false);
                                                return (
                                                    <FormItem>
                                                        <FormLabel>Confirmer le mot de passe</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder="Confirmer votre mot de passe"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                            >
                                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                );
                                            }}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Rôle</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Sélectionnez votre rôle" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="driver">Chauffeur</SelectItem>
                                                            <SelectItem value="manager">Manager</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Troisième colonne - Informations supplémentaires pour chauffeur */}
                                    <div className="space-y-4">
                                        {form.watch('role') === 'driver' ? (
                                            <>
                                                <FormField
                                                    control={form.control}
                                                    name="phoneNumber"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Numéro de téléphone</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Votre numéro de téléphone"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="licenseNumber"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Numéro de permis</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Votre numéro de permis"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center text-gray-500">
                                                    <p>Options supplémentaires pour les managers</p>
                                                    <p className="text-xs mt-2">Les managers auront accès à toutes les fonctionnalités de gestion de la flotte après validation</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full md:w-auto md:px-8"
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

                                    <div className="text-center text-sm mt-4">
                                        Vous avez déjà un compte?{' '}
                                        <Link
                                            to="/login"
                                            className="underline underline-offset-4 hover:text-gray-800"
                                        >
                                            Connectez-vous
                                        </Link>
                                    </div>
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