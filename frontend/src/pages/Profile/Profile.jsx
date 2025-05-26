// src/pages/Profile/Profile.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/api';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Label } from 'recharts';
import { CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { driverService } from '@/services/api';

// Ajout de la variable pour l'URL de base des photos
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_PHOTO_URL = import.meta.env.VITE_API_PHOTO;

const profileSchema = z.object({
    firstName: z.string().min(2, 'Prénom requis'),
    lastName: z.string().min(2, 'Nom requis'),
    email: z.string().email('Email invalide'),
    username: z.string().min(3, 'Nom d\'utilisateur doit contenir au moins 3 caractères')
});

const driverSchema = z.object({
    firstName: z.string().min(2, 'Prénom requis'),
    lastName: z.string().min(2, 'Nom requis'),
    phoneNumber: z.string().min(8, 'Numéro de téléphone invalide'),
    licenseNumber: z.string().min(6, 'Numéro de permis invalide')
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
    const { user, driver } = useOutletContext();
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [driverPhotos, setDriverPhotos] = useState([]);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);

    // Ajout des états pour la galerie de photos
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const driverForm = useForm({
        resolver: zodResolver(driverSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phoneNumber: '',
            licenseNumber: ''
        }
    });

    // Mise à jour des valeurs du formulaire chauffeur lorsque les données utilisateur changent
    useEffect(() => {
        if (user && user.role === 'driver') {
            // Chargez explicitement les détails du driver
            authService.getDriverDetails(user._id)
                .then(response => {
                    const driverData = response.data.driverDetails;
                    driverForm.reset({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        phoneNumber: driverData?.phoneNumber || '',
                        licenseNumber: driverData?.licenseNumber || ''
                    });
                    setDriverPhotos(driverData?.photos || []);
                })
                .catch(error => {
                    console.error("Erreur lors du chargement des détails du chauffeur:", error);
                });
        }
    }, [user, driverForm]);

    const onDriverSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');
            setSuccessMsg('');

            // Mettre à jour les informations chauffeur
            await authService.updateDriverProfile(data);

            // Si des fichiers sont sélectionnés, les uploader maintenant
            if (selectedFiles.length > 0) {
                await driverService.uploadMyPhotos(selectedFiles);
                setSelectedFiles([]);
                setPreviewImages([]);
            }

            // Recharger les données utilisateur et photos
            const userResponse = await authService.getCurrentUser();
            const driverResponse = await authService.getDriverDetails(user._id);
            setDriverPhotos(driverResponse.data.driverDetails.photos || []);

            setSuccessMsg('Informations chauffeur mises à jour avec succès');
            toast({
                title: "Informations mises à jour",
                description: "Vos informations chauffeur ont été mises à jour avec succès.",
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
        } finally {
            setLoading(false);
        }
    };

    // Navigation du carrousel
    const nextPhoto = () => {
        if (driverPhotos && driverPhotos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === driverPhotos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevPhoto = () => {
        if (driverPhotos && driverPhotos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === 0 ? driverPhotos.length - 1 : prevIndex - 1
            );
        }
    };

    const handlePhotoSelection = (e) => {
        const files = Array.from(e.target.files);

        if (files.length === 0) return;

        // Créer des aperçus pour les fichiers sélectionnés
        const newPreviews = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        // Mettre à jour l'état avec les nouveaux fichiers et aperçus
        setSelectedFiles(files);
        setPreviewImages(newPreviews);
    };

    // Fonction pour supprimer une photo des aperçus
    const handleRemovePreview = (index) => {
        const newPreviews = [...previewImages];
        newPreviews.splice(index, 1);
        setPreviewImages(newPreviews);

        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);
    };

    // Fonction pour supprimer une photo existante
    const handleDeletePhoto = async (index) => {
        try {
            setUploadingPhotos(true);
            await driverService.deleteMyPhoto(index);

            // Recharger les photos
            const response = await authService.getDriverDetails();
            setDriverPhotos(response.data.driverDetails.photos || []);

            toast({
                title: "Photo supprimée",
                description: "La photo a été supprimée avec succès.",
            });
        } catch (error) {
            toast({
                title: "Erreur",
                description: error.response?.data?.message || error.message || "Erreur lors de la suppression",
                variant: "destructive"
            });
        } finally {
            setUploadingPhotos(false);
        }
    };


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

    useEffect(() => {
        if (user?.driver) {
            authService.getDriverDetails(user._id)
                .then(response => {
                    setDriverPhotos(response.data.driverDetails.photos || []);
                })
                .catch(error => {
                    console.error("Erreur lors du chargement des photos:", error);
                });
        }
    }, [user]);

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Mon profil</h1>

            <Tabs defaultValue="profile">
                <TabsList className="mb-4">
                    <TabsTrigger value="profile">Informations</TabsTrigger>
                    {user?.role === 'driver' && (
                        <TabsTrigger value="driver">Informations chauffeur</TabsTrigger>
                    )}
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

                <TabsContent value="driver">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations chauffeur</CardTitle>
                            <CardDescription>
                                Mettez à jour vos informations professionnelles
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

                            {/* Photo Carousel - Ajout du carrousel comme dans DriverDetail.jsx */}
                            {user?.role === 'driver' && (
                                <div className="mb-6 relative w-full h-80 rounded-lg overflow-hidden">
                                    {driverPhotos && driverPhotos.length > 0 ? (
                                        <>
                                            <button
                                                onClick={() => setLightboxOpen(true)}
                                                className="w-full h-full focus:outline-none"
                                            >
                                                <img
                                                    src={driverPhotos[currentPhotoIndex]?.startsWith('http')
                                                        ? driverPhotos[currentPhotoIndex]
                                                        : `${API_PHOTO_URL}/${driverPhotos[currentPhotoIndex]}`}
                                                    alt={`Photo du chauffeur ${user?.firstName} ${user?.lastName}`}
                                                    className="w-full h-full object-cover cursor-zoom-in"
                                                />
                                            </button>

                                            {/* Lightbox Dialog */}
                                            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                                                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
                                                    <div className="relative w-full h-full flex items-center justify-center">
                                                        <img
                                                            src={driverPhotos[currentPhotoIndex]?.startsWith('http')
                                                                ? driverPhotos[currentPhotoIndex]
                                                                : `${API_PHOTO_URL}/${driverPhotos[currentPhotoIndex]}`}
                                                            alt={`Photo du chauffeur ${user?.firstName} ${user?.lastName}`}
                                                            className="max-w-full max-h-full object-contain"
                                                        />

                                                        <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
                                                            <X className="h-6 w-6" />
                                                        </DialogClose>

                                                        {/* Navigation buttons in lightbox */}
                                                        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    prevPhoto();
                                                                }}
                                                            >
                                                                <ChevronLeft className="h-6 w-6" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    nextPhoto();
                                                                }}
                                                            >
                                                                <ChevronRight className="h-6 w-6" />
                                                            </Button>
                                                        </div>

                                                        {/* Photo counter */}
                                                        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                                            {currentPhotoIndex + 1} / {driverPhotos.length}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {/* Navigation buttons on carousel */}
                                            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="bg-white/70 hover:bg-white pointer-events-auto"
                                                    onClick={prevPhoto}
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="bg-white/70 hover:bg-white pointer-events-auto"
                                                    onClick={nextPhoto}
                                                >
                                                    <ChevronRight className="h-6 w-6" />
                                                </Button>
                                            </div>

                                            {/* Photo counter */}
                                            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                                {currentPhotoIndex + 1} / {driverPhotos.length}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                                            <p className="text-gray-500">Aucune photo disponible</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Form {...driverForm}>
                                <form onSubmit={driverForm.handleSubmit(onDriverSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={driverForm.control}
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
                                            control={driverForm.control}
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
                                        control={driverForm.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Numéro de téléphone</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={driverForm.control}
                                        name="licenseNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Numéro de permis</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div>
                                        <FormLabel>Photos</FormLabel>
                                        <div className="grid grid-cols-3 gap-4 mt-2">
                                            {driverPhotos.map((photo, index) => (
                                                <div key={`existing-${index}`} className="relative group">
                                                    <img
                                                        src={photo.startsWith('http')
                                                            ? photo
                                                            : `${API_PHOTO_URL}/${photo}`}
                                                        alt={`Photo ${index}`}
                                                        className="rounded-md w-full h-32 object-cover"
                                                    />
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleDeletePhoto(index)}
                                                    >
                                                        Supprimer
                                                    </Button>
                                                </div>
                                            ))}

                                            {previewImages.map((preview, index) => (
                                                <div key={`preview-${index}`} className="relative group">
                                                    <img
                                                        src={preview.preview}
                                                        alt={`Aperçu ${index}`}
                                                        className="rounded-md w-full h-32 object-cover border-2 border-blue-500"
                                                    />
                                                    <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                                        À télécharger
                                                    </div>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleRemovePreview(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="driver-photos">Sélectionner des photos</Label>
                                            <Input
                                                id="driver-photos"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handlePhotoSelection}
                                                disabled={loading}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Formats acceptés: JPG, PNG. Taille max: 5MB par image.
                                                {selectedFiles.length > 0 && (
                                                    <span className="text-blue-600 ml-2">
                                                        {selectedFiles.length} fichier(s) sélectionné(s). Les photos seront téléchargées après enregistrement.
                                                    </span>
                                                )}
                                            </p>
                                        </div>
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
                                        render={({ field }) => {
                                            const [showPassword, setShowPassword] = useState(false);
                                            return (
                                                <FormItem>
                                                    <FormLabel>Mot de passe actuel</FormLabel>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input
                                                                type={showPassword ? "text" : "password"}
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
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => {
                                            const [showPassword, setShowPassword] = useState(false);
                                            return (
                                                <FormItem>
                                                    <FormLabel>Nouveau mot de passe</FormLabel>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input
                                                                type={showPassword ? "text" : "password"}
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
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => {
                                            const [showPassword, setShowPassword] = useState(false);
                                            return (
                                                <FormItem>
                                                    <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input
                                                                type={showPassword ? "text" : "password"}
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