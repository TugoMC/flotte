// src/components/forms/ScheduleForm.jsx
import { useState, useEffect } from 'react';
import { scheduleService } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';

const scheduleFormSchema = z.object({
    driverId: z.string({
        required_error: "Veuillez sélectionner un chauffeur",
    }),
    vehicleId: z.string({
        required_error: "Veuillez sélectionner un véhicule",
    }),
    scheduleDate: z.string({
        required_error: "Veuillez sélectionner une date de début",
    }),
    endDate: z.string().optional(),
    useHours: z.boolean().default(false),
    shiftStart: z.string().optional(),
    shiftEnd: z.string().optional(),
    notes: z.string().optional(),
}).refine((data) => {
    // Si endDate est fourni, vérifier qu'il est après scheduleDate
    if (data.endDate) {
        const start = new Date(data.scheduleDate);
        const end = new Date(data.endDate);
        return end >= start;
    }
    return true;
}, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
}).refine((data) => {
    // Si useHours est true, vérifier que shiftStart et shiftEnd sont fournis
    if (data.useHours) {
        return !!data.shiftStart && !!data.shiftEnd;
    }
    return true;
}, {
    message: "Veuillez spécifier les heures de début et de fin",
    path: ["shiftStart"],
});

const ScheduleForm = ({ schedule, drivers, vehicles, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [isIndefinite, setIsIndefinite] = useState(schedule ? !schedule.endDate : false);
    const [useHours, setUseHours] = useState(schedule ? !!(schedule.shiftStart && schedule.shiftEnd) : false);
    const [error, setError] = useState(null);

    // Initialiser le formulaire avec les valeurs par défaut et validation
    const form = useForm({
        resolver: zodResolver(scheduleFormSchema),
        defaultValues: {
            driverId: schedule?.driver?._id || schedule?.driver || '',
            vehicleId: schedule?.vehicle?._id || schedule?.vehicle || '',
            scheduleDate: schedule?.scheduleDate
                ? format(new Date(schedule.scheduleDate), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd'),
            endDate: schedule?.endDate
                ? format(new Date(schedule.endDate), 'yyyy-MM-dd')
                : format(addDays(new Date(), 7), 'yyyy-MM-dd'), // Par défaut 7 jours après
            useHours: !!(schedule?.shiftStart && schedule?.shiftEnd),
            shiftStart: schedule?.shiftStart || '08:00',
            shiftEnd: schedule?.shiftEnd || '18:00',
            notes: schedule?.notes || ''
        }
    });

    // Effet pour réinitialiser le formulaire si le planning change
    useEffect(() => {
        if (schedule) {
            const hasHours = !!(schedule.shiftStart && schedule.shiftEnd);
            setUseHours(hasHours);

            form.reset({
                driverId: schedule.driver?._id || schedule.driver || '',
                vehicleId: schedule.vehicle?._id || schedule.vehicle || '',
                scheduleDate: schedule.scheduleDate
                    ? format(new Date(schedule.scheduleDate), 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd'),
                endDate: schedule.endDate
                    ? format(new Date(schedule.endDate), 'yyyy-MM-dd')
                    : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
                useHours: hasHours,
                shiftStart: schedule.shiftStart || '08:00',
                shiftEnd: schedule.shiftEnd || '18:00',
                notes: schedule.notes || ''
            });

            setIsIndefinite(!schedule.endDate);
        }
    }, [schedule, form]);

    // Mettre à jour le champ useHours dans le formulaire lorsque la case à cocher change
    useEffect(() => {
        form.setValue('useHours', useHours);
    }, [useHours, form]);

    const handleSubmit = async (data) => {
        try {
            setLoading(true);
            setError(null);

            // Préparer les données pour l'API
            const scheduleData = {
                driverId: data.driverId,
                vehicleId: data.vehicleId,
                scheduleDate: data.scheduleDate,
                endDate: isIndefinite ? null : data.endDate || null,
                shiftStart: useHours ? data.shiftStart : null,
                shiftEnd: useHours ? data.shiftEnd : null,
                notes: data.notes
            };

            let response;
            if (schedule) {
                // Mise à jour d'un planning existant
                response = await scheduleService.update(schedule._id, scheduleData);
                toast.success("Planning mis à jour avec succès");
            } else {
                // Création d'un nouveau planning
                response = await scheduleService.create(scheduleData);
                toast.success("Planning créé avec succès");
            }

            if (response) {
                // Appeler onSuccess avec la réponse complète
                onSuccess(response.data || response);
            }
        } catch (error) {
            console.error('Erreur lors de la soumission du planning:', error);

            // Gérer les conflits de planning détectés par le backend
            if (error.response?.data?.conflict) {
                const conflict = error.response.data.conflict;
                const driverName = `${conflict.driver?.firstName || ''} ${conflict.driver?.lastName || ''}`.trim();
                const vehicleInfo = `${conflict.vehicle?.brand || ''} ${conflict.vehicle?.model || ''} (${conflict.vehicle?.licensePlate || ''})`.trim();

                setError(`Conflit de planning: ${driverName || 'Ce chauffeur'} ou ${vehicleInfo || 'ce véhicule'} est déjà assigné(e) pour cette période.`);
            }

            // Corriger l'erreur d'affichage du toast
            toast.error(error.response?.data?.message || "Une erreur est survenue lors de la création du planning");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md mb-4">
                        {error}
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="driverId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="required">Chauffeur</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={loading}
                                required
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un chauffeur" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {drivers.map(driver => (
                                        <SelectItem key={driver._id} value={driver._id}>
                                            {driver.firstName} {driver.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="required">Véhicule</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={loading}
                                required
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un véhicule" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {vehicles.map(vehicle => (
                                        <SelectItem key={vehicle._id} value={vehicle._id}>
                                            {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="scheduleDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="required">Date de début</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    disabled={loading}
                                    required
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center space-x-2 my-4">
                    <Checkbox
                        id="indefinite"
                        checked={isIndefinite}
                        onCheckedChange={(checked) => setIsIndefinite(checked)}
                        disabled={loading}
                    />
                    <label
                        htmlFor="indefinite"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Affectation pour une durée indéfinie
                    </label>
                </div>

                {!isIndefinite && (
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date de fin</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        disabled={loading}
                                        min={form.watch('scheduleDate')} // Empêche de sélectionner une date avant la date de début
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="flex items-center space-x-2 my-4">
                    <Checkbox
                        id="useHours"
                        checked={useHours}
                        onCheckedChange={(checked) => setUseHours(checked)}
                        disabled={loading}
                    />
                    <label
                        htmlFor="useHours"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Spécifier des heures de service
                    </label>
                </div>

                {useHours && (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="shiftStart"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Heure de début</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="time"
                                            {...field}
                                            disabled={loading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="shiftEnd"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Heure de fin</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="time"
                                            {...field}
                                            disabled={loading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder="Informations supplémentaires"
                                    disabled={loading}
                                    rows={3}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Chargement...' : schedule ? 'Mettre à jour' : 'Créer'}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default ScheduleForm;