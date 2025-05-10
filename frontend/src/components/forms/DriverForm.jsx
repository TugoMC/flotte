// src/components/DriverForm.jsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
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
import { driverService } from '@/services/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ImageIcon, XIcon, InfoIcon } from 'lucide-react';

// Schéma de validation pour le formulaire de chauffeur
const driverSchema = z.object({
    firstName: z.string().min(2, { message: 'Le prénom doit comporter au moins 2 caractères' }),
    lastName: z.string().min(2, { message: 'Le nom doit comporter au moins 2 caractères' }),
    phoneNumber: z.string().min(8, { message: 'Le numéro de téléphone doit comporter au moins 8 caractères' }),
    licenseNumber: z.string().min(3, { message: 'Le numéro de permis doit comporter au moins 3 caractères' }),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide (AAAA-MM-JJ)' }),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide (AAAA-MM-JJ)' }).optional().or(z.literal('')),
});

const DriverForm = ({ driver, vehicles, onSuccess, onCancel }) => {
    // État pour la gestion des photos
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [photosPreviews, setPhotosPreviews] = useState([]);

    // Initialiser le formulaire avec react-hook-form et zod
    const form = useForm({
        resolver: zodResolver(driverSchema),
        defaultValues: {
            firstName: driver?.firstName || '',
            lastName: driver?.lastName || '',
            phoneNumber: driver?.phoneNumber || '',
            licenseNumber: driver?.licenseNumber || '',
            hireDate: driver?.hireDate
                ? format(new Date(driver.hireDate), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd'),
            departureDate: driver?.departureDate
                ? format(new Date(driver.departureDate), 'yyyy-MM-dd')
                : '',
        }
    });

    // Créer des URL d'aperçu lorsque les fichiers sont sélectionnés
    useEffect(() => {
        if (!selectedFiles.length) {
            setPhotosPreviews([]);
            return;
        }

        const newPreviews = [];
        selectedFiles.forEach(file => {
            const preview = URL.createObjectURL(file);
            newPreviews.push({ file, preview });
        });

        setPhotosPreviews(newPreviews);

        // Nettoyer les URL d'objet lors du démontage
        return () => {
            newPreviews.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, [selectedFiles]);

    const handleFileSelect = (e) => {
        if (e.target.files.length === 0) return;

        // Vérifier la taille des fichiers (max 5MB)
        const filesArray = Array.from(e.target.files);
        const validFiles = filesArray.filter(file => file.size <= 5 * 1024 * 1024);

        if (validFiles.length < filesArray.length) {
            toast.warning("Certains fichiers dépassent la taille maximale de 5 MB et ont été ignorés", {
                description: "Veuillez sélectionner des fichiers plus petits",
            });
        }

        setSelectedFiles(validFiles);
    };

    const removePhoto = (index) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);
    };

    const onSubmit = async (data) => {
        try {
            // Si departureDate est une chaîne vide, la définir à null
            const formattedData = {
                ...data,
                departureDate: data.departureDate === '' ? null : data.departureDate
            };

            let savedDriver;

            if (driver?._id) {
                // Mise à jour d'un chauffeur existant
                const response = await driverService.update(driver._id, formattedData);
                savedDriver = response.data;
            } else {
                // Création d'un nouveau chauffeur
                const response = await driverService.create(formattedData);
                savedDriver = response.data;
            }

            // Upload des photos si des fichiers ont été sélectionnés
            if (selectedFiles.length > 0 && savedDriver._id) {
                await driverService.uploadPhotos(savedDriver._id, selectedFiles);
                toast.success(`${selectedFiles.length} photo(s) ajoutée(s) avec succès`);
            }

            onSuccess();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du chauffeur:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                "Une erreur est survenue lors de l'enregistrement";
            toast.error(errorMessage);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="required">Prénom</FormLabel>
                                <FormControl>
                                    <Input placeholder="John" required {...field} />
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
                                <FormLabel className="required">Nom</FormLabel>
                                <FormControl>
                                    <Input placeholder="Doe" required {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="required">Téléphone</FormLabel>
                                <FormControl>
                                    <Input placeholder="+225 07 12 34 56 78" required {...field} />
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
                                <FormLabel className="required">Numéro de permis</FormLabel>
                                <FormControl>
                                    <Input placeholder="A123456" required {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="hireDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="required">Date d'embauche</FormLabel>
                                <FormControl>
                                    <Input type="date" required {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="departureDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date de départ</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Section de gestion des photos */}
                <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                        <label className="text-base font-medium">Photos du chauffeur</label>
                        <Button variant="outline" asChild>
                            <label className="cursor-pointer">
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Ajouter des photos
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png"
                                    multiple
                                    hidden
                                    onChange={handleFileSelect}
                                />
                            </label>
                        </Button>
                    </div>

                    {/* Message d'information pour les photos */}
                    <div className="bg-accent p-3 rounded-md text-sm flex items-start gap-2">
                        <InfoIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-accent-foreground mb-1">Conseils pour les photos</p>
                            <p className="text-muted-foreground">
                                Pour une qualité optimale, utilisez des images d'une résolution minimale de 1200×800 pixels
                                et d'un rapport 3:2. Formats acceptés: JPG, PNG. Taille maximale: 5 MB par image.
                            </p>
                        </div>
                    </div>

                    {/* Prévisualisation des photos */}
                    {photosPreviews.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm text-gray-500 mb-2">
                                {photosPreviews.length} photo(s) sélectionnée(s)
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                {photosPreviews.map((item, index) => (
                                    <div
                                        key={index}
                                        className="relative aspect-[3/2] bg-gray-100 rounded-md overflow-hidden group"
                                    >
                                        <img
                                            src={item.preview}
                                            alt={`Aperçu ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Supprimer"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
                    <Button type="submit">{driver ? 'Enregistrer' : 'Ajouter'}</Button>
                </div>
            </form>
        </Form>
    );
};

export default DriverForm;