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
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const [driverSearch, setDriverSearch] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');

    // Filtrer les chauffeurs en fonction de la recherche
    const filteredDrivers = drivers.filter(driver => {
        const searchTerm = driverSearch.toLowerCase();
        return (
            driver.firstName.toLowerCase().includes(searchTerm) ||
            driver.lastName.toLowerCase().includes(searchTerm) ||
            driver.phoneNumber.toLowerCase().includes(searchTerm)
        );
    });

    // Filtrer les véhicules en fonction de la recherche
    const filteredVehicles = vehicles.filter(vehicle => {
        const searchTerm = vehicleSearch.toLowerCase();
        return (
            vehicle.brand.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm) ||
            vehicle.licensePlate.toLowerCase().includes(searchTerm)
        );
    });

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
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <ScrollArea className="h-[70vh] pr-4">
                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md mb-4">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Champ Chauffeur amélioré */}
                    <FormField
                        control={form.control}
                        name="driverId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="required">Chauffeur</FormLabel>
                                <div className="relative">
                                    <Command className="rounded-lg border ">
                                        <CommandInput
                                            placeholder="Rechercher un chauffeur..."
                                            value={driverSearch}
                                            onValueChange={setDriverSearch}
                                            className="h-10"
                                        />
                                        <CommandEmpty className="py-3 px-4 text-sm text-muted-foreground">
                                            Aucun chauffeur trouvé.
                                        </CommandEmpty>
                                        <ScrollArea className={`${filteredDrivers.length > 3 ? 'h-48' : 'h-auto'} rounded-b-md`}>
                                            <CommandGroup>
                                                {filteredDrivers.map((driver) => (
                                                    <CommandItem
                                                        key={driver._id}
                                                        onSelect={() => {
                                                            form.setValue("driverId", driver._id);
                                                            setDriverSearch('');
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors",
                                                            driver._id === field.value
                                                                ? "bg-accent text-accent-foreground"
                                                                : "hover:bg-accent hover:text-accent-foreground"
                                                        )}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4 text-primary",
                                                                driver._id === field.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">{driver.phoneNumber}</p>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </Command>
                                </div>
                                {field.value && (
                                    <div className="mt-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
                                        <span className="font-medium">Sélectionné :</span> {drivers.find(d => d._id === field.value)?.firstName} {drivers.find(d => d._id === field.value)?.lastName}
                                    </div>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Champ Véhicule amélioré */}
                    <FormField
                        control={form.control}
                        name="vehicleId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="required">Véhicule</FormLabel>
                                <div className="relative">
                                    <Command className="rounded-lg border ">
                                        <CommandInput
                                            placeholder="Rechercher un véhicule..."
                                            value={vehicleSearch}
                                            onValueChange={setVehicleSearch}
                                            className="h-10"
                                        />
                                        <CommandEmpty className="py-3 px-4 text-sm text-muted-foreground">
                                            Aucun véhicule trouvé.
                                        </CommandEmpty>
                                        <ScrollArea className={`${filteredVehicles.length > 3 ? 'h-48' : 'h-auto'} rounded-b-md`}>
                                            <CommandGroup>
                                                {filteredVehicles.map((vehicle) => (
                                                    <CommandItem
                                                        key={vehicle._id}
                                                        onSelect={() => {
                                                            form.setValue("vehicleId", vehicle._id);
                                                            setVehicleSearch('');
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors",
                                                            vehicle._id === field.value
                                                                ? "bg-accent text-accent-foreground"
                                                                : "hover:bg-accent hover:text-accent-foreground"
                                                        )}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4 text-primary",
                                                                vehicle._id === field.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {vehicle.licensePlate} • {vehicle.type}
                                                            </p>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </Command>
                                </div>
                                {field.value && (
                                    <div className="mt-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
                                        <span className="font-medium">Sélectionné :</span> {vehicles.find(v => v._id === field.value)?.brand} {vehicles.find(v => v._id === field.value)?.model}
                                    </div>
                                )}
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

                </ScrollArea>


                <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
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