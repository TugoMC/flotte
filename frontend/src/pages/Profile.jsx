// src/pages/Profile.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { authService } from '@/services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

const profileSchema = z.object({
    firstName: z.string().min(2, 'Prénom requis'),
    lastName: z.string().min(2, 'Nom requis'),
    email: z.string().email('Email invalide'),
    username: z.string().min(3, 'Nom d\'utilisateur doit contenir au moins 3 caractères')
});

const passwordSchema = z.object({
    currentPassword: z.string().min(6, 'Mot de passe actuel requis'),
    newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string().min(6, 'Confirmation du mot de passe requise')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
});

const Profile = () => {
    const { user } = useOutletContext();
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Formulaire pour les informations de profil
    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            username: user?.username || ''
        }
    });

    // Formulaire pour le changement de mot de passe
    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        }
    });

    const onProfileSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');
            setSuccessMsg('');

            const response = await authService.updateProfile(data);

            // Mise à jour du token si fourni
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }

            setSuccessMsg('Profil mis à jour avec succès');
            toast({
                title: "Profil mis à jour",
                description: "Vos informations ont été mises à jour avec succès.",
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
        } finally {
            setLoading(false);
        }
    };

    const onPasswordSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');
            setSuccessMsg('');

            await authService.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });

            passwordForm.reset({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            setSuccessMsg('Mot de passe modifié avec succès');
            toast({
                title: "Mot de passe modifié",
                description: "Votre mot de passe a été modifié avec succès.",
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Mon profil</h1>

            <Tabs defaultValue="profile">
                <TabsList className="mb-4">
                    <TabsTrigger value="profile">Informations</TabsTrigger>
                    <TabsTrigger value="password">Mot de passe</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations personnelles</CardTitle>
                            <CardDescription>
                                Mettez à jour vos informations personnelles ici
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {successMsg && (
                                <Alert className="mb-4 bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                    <AlertDescription className="text-green-700">{successMsg}</AlertDescription>
                                </Alert>
                            )}

                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={profileForm.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Prénom</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={profileForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nom</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={profileForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={profileForm.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nom d'utilisateur</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div>
                                        <FormItem>
                                            <FormLabel>Rôle</FormLabel>
                                            <FormControl>
                                                <Input value={user?.role} disabled />
                                            </FormControl>
                                            <p className="text-sm text-gray-500 mt-1">Le rôle ne peut être modifié que par un administrateur</p>
                                        </FormItem>
                                    </div>

                                    <Button type="submit" className="mt-4" disabled={loading}>
                                        {loading ? "Mise à jour..." : "Enregistrer les modifications"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="password">
                    <Card>
                        <CardHeader>
                            <CardTitle>Changer de mot de passe</CardTitle>
                            <CardDescription>
                                Mettez à jour votre mot de passe
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {successMsg && (
                                <Alert className="mb-4 bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                    <AlertDescription className="text-green-700">{successMsg}</AlertDescription>
                                </Alert>
                            )}

                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mot de passe actuel</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nouveau mot de passe</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" className="mt-4" disabled={loading}>
                                        {loading ? "Mise à jour..." : "Changer le mot de passe"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Profile;