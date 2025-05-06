// src/components/DriverForm.jsx
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
import { driverService } from '@/services/api';
import { format } from 'date-fns';

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

    const onSubmit = async (data) => {
        try {
            // Si departureDate est une chaîne vide, la définir à null
            const formattedData = {
                ...data,
                departureDate: data.departureDate === '' ? null : data.departureDate
            };

            if (driver?._id) {
                // Mise à jour d'un chauffeur existant
                await driverService.update(driver._id, formattedData);
            } else {
                // Création d'un nouveau chauffeur
                await driverService.create(formattedData);
            }
            onSuccess();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du chauffeur:', error);
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
                                <FormLabel>Prénom</FormLabel>
                                <FormControl>
                                    <Input placeholder="John" {...field} />
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
                                    <Input placeholder="Doe" {...field} />
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
                                <FormLabel>Téléphone</FormLabel>
                                <FormControl>
                                    <Input placeholder="+221 77 123 45 67" {...field} />
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
                                    <Input placeholder="A123456" {...field} />
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
                                <FormLabel>Date d'embauche</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
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

                <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
                    <Button type="submit">{driver ? 'Enregistrer' : 'Ajouter'}</Button>
                </div>
            </form>
        </Form>
    );
};

export default DriverForm;