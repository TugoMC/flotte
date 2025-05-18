// src/pages/Schedules/SchedulesList.jsx
import { useState, useEffect } from 'react';
import { format, isAfter, isBefore, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scheduleService, driverService, vehicleService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AlertTriangleIcon } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import ScheduleForm from '@/components/forms/ScheduleForm';
import { CalendarIcon, SearchIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon } from 'lucide-react';

const SchedulesList = () => {
    // États
    const [schedules, setSchedules] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [filterDriver, setFilterDriver] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('');

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState(null);
    const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
    const [scheduleToChangeStatus, setScheduleToChangeStatus] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    // Charger les données
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const requests = [
                    { name: 'schedules', request: scheduleService.getAll() },
                    { name: 'drivers', request: driverService.getAll() },
                    { name: 'vehicles', request: vehicleService.getAll() }
                ];

                const results = await Promise.all(requests.map(r =>
                    r.request.catch(e => ({ error: e, name: r.name }))
                ));

                // Vérifier les erreurs
                const errors = results.filter(r => r.error);
                if (errors.length > 0) {
                    errors.forEach(err => {
                        console.error(`Erreur lors du chargement des ${err.name}:`, err.error);
                    });
                    throw new Error('Erreur lors du chargement des données');
                }

                // Extraire les données valides
                const [schedulesRes, driversRes, vehiclesRes] = results;

                setSchedules(schedulesRes.data);
                setDrivers(driversRes.data);
                setVehicles(vehiclesRes.data);
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
                toast.error('Une erreur est survenue lors du chargement des données.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const isReadOnlySchedule = (schedule) => {
        return schedule.status === 'completed' || schedule.status === 'canceled';
    };

    // Filtrer les plannings en fonction des critères

    const filteredSchedules = schedules.filter(schedule => {

        if (activeTab === 'current') {
            // Exclure les plannings annulés ou terminés
            if (schedule.status === 'canceled' || schedule.status === 'completed') return false;

            // Vérifier les dates
            if ((!isToday(parseISO(schedule.scheduleDate)) && isBefore(parseISO(schedule.scheduleDate), new Date())) ||
                (schedule.endDate && isBefore(parseISO(schedule.endDate), new Date()))) {
                return false;
            }
        }

        if (activeTab === 'upcoming') {
            if (schedule.status === 'canceled') return false;
            if (!isAfter(parseISO(schedule.scheduleDate), new Date())) {
                return false;
            }
        }

        if (activeTab === 'completed') {
            if (schedule.status !== 'completed') return false;
        }

        if (activeTab === 'cancelled') {
            if (schedule.status !== 'canceled') return false;
        }


        // Filtrer par terme de recherche
        const driverName = `${schedule.driver?.firstName || ''} ${schedule.driver?.lastName || ''}`.toLowerCase();
        const vehicleInfo = `${schedule.vehicle?.brand || ''} ${schedule.vehicle?.model || ''} ${schedule.vehicle?.licensePlate || ''}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        if (searchTerm && !driverName.includes(searchLower) && !vehicleInfo.includes(searchLower)) {
            return false;
        }


        // Filtrer par date
        if (filterDate && !isToday(parseISO(schedule.scheduleDate), filterDate)) {
            const scheduleStartDate = parseISO(schedule.scheduleDate);
            const scheduleEndDate = schedule.endDate ? parseISO(schedule.endDate) : null;

            if (scheduleEndDate) {
                // Si le planning a une date de fin, vérifier si la date de filtre est dans la plage
                if (!(isBefore(scheduleStartDate, filterDate) || isToday(scheduleStartDate, filterDate)) ||
                    !(isAfter(scheduleEndDate, filterDate) || isToday(scheduleEndDate, filterDate))) {
                    return false;
                }
            } else {
                // Si le planning n'a pas de date de fin, vérifier seulement la date de début
                if (!isToday(scheduleStartDate, filterDate)) {
                    return false;
                }
            }
        }

        // Filtrer par chauffeur
        if (filterDriver && schedule.driver?._id !== filterDriver && schedule.driver !== filterDriver) {
            return false;
        }

        // Filtrer par véhicule
        if (filterVehicle && schedule.vehicle?._id !== filterVehicle && schedule.vehicle !== filterVehicle) {
            return false;
        }

        return true;
    });

    // Formater la période du planning
    const formatSchedulePeriod = (schedule) => {
        const startDate = format(new Date(schedule.scheduleDate), 'dd MMM yyyy', { locale: fr });

        if (!schedule.endDate) {
            return `À partir du ${startDate}`;
        }

        const endDate = format(new Date(schedule.endDate), 'dd MMM yyyy', { locale: fr });
        return `${startDate} au ${endDate}`;
    };

    // Formater les heures du planning
    const formatScheduleHours = (schedule) => {
        if (!schedule.shiftStart || !schedule.shiftEnd) {
            return 'Journée complète';
        }

        return `${schedule.shiftStart} - ${schedule.shiftEnd}`;
    };

    // Statut du planning avec couleur
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">En attente</Badge>;
            case 'assigned':
                return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">Assigné</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Terminé</Badge>;
            case 'canceled':
                return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Annulé</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Gérer le changement de statut d'un planning
    const handleStatusChange = async () => {
        if (!scheduleToChangeStatus || !newStatus) return;

        // Vérification de sécurité supplémentaire
        if (scheduleToChangeStatus.status === 'completed' || scheduleToChangeStatus.status === 'canceled') {
            toast.error("Impossible de modifier le statut d'un planning terminé ou annulé");
            setStatusChangeDialogOpen(false);
            return;
        }

        try {
            await scheduleService.changeStatus(scheduleToChangeStatus._id, newStatus);
            setSchedules(schedules.map(s =>
                s._id === scheduleToChangeStatus._id ? { ...s, status: newStatus } : s
            ));
            toast.success(`Le statut du planning a été mis à jour avec succès`);
        } catch (error) {
            console.error('Erreur lors du changement de statut:', error);
            toast.error("Erreur lors du changement de statut: " + (error.response?.data?.message || error.message));
        } finally {
            setStatusChangeDialogOpen(false);
            setScheduleToChangeStatus(null);
            setNewStatus('');
        }
    };

    // Gérer la suppression d'un planning
    const handleDelete = async () => {
        if (!scheduleToDelete) return;

        try {
            await scheduleService.delete(scheduleToDelete._id);

            // Supprimer le planning de la liste
            setSchedules(schedules.filter(s => s._id !== scheduleToDelete._id));

            toast.success(`Le planning a été supprimé avec succès`);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer le planning");
        } finally {
            setDeleteDialogOpen(false);
            setScheduleToDelete(null);
        }
    };

    // Gérer le succès du formulaire (création/mise à jour)
    const handleFormSuccess = (updatedSchedule) => {
        if (selectedSchedule) {
            // Mise à jour d'un planning existant
            setSchedules(schedules.map(s =>
                s._id === updatedSchedule._id ? updatedSchedule : s
            ));
        } else {
            // Ajout d'un nouveau planning
            setSchedules([...schedules, updatedSchedule]);
        }

        setIsFormOpen(false);
        setSelectedSchedule(null);
    };

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSearchTerm('');
        setFilterDate(null);
        setFilterDriver('');
        setFilterVehicle('');
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Plannings</CardTitle>
                        <CardDescription>
                            Gérez les affectations des chauffeurs et véhicules
                        </CardDescription>
                    </div>
                    <Button onClick={() => {
                        setSelectedSchedule(null);
                        setIsFormOpen(true);
                    }}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Nouveau planning
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${filterDate ? '' : 'text-muted-foreground'}`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate ? format(filterDate, 'dd/MM/yyyy') : "Filtrer par date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={filterDate}
                                    onSelect={setFilterDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <Select value={filterDriver} onValueChange={setFilterDriver}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par chauffeur" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les chauffeurs</SelectItem>
                                {drivers.map(driver => (
                                    <SelectItem key={driver._id} value={driver._id}>
                                        {driver.firstName} {driver.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par véhicule" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les véhicules</SelectItem>
                                {vehicles.map(vehicle => (
                                    <SelectItem key={vehicle._id} value={vehicle._id}>
                                        {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bouton pour réinitialiser les filtres */}
                    {(searchTerm || filterDate || filterDriver || filterVehicle) && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Onglets pour filtrer par statut */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-5">
                            <TabsTrigger value="all">Tous</TabsTrigger>
                            <TabsTrigger value="current">En cours</TabsTrigger>
                            <TabsTrigger value="upcoming">À venir</TabsTrigger>
                            <TabsTrigger value="completed">Terminés</TabsTrigger>
                            <TabsTrigger value="cancelled">Annulés</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Tableau des plannings */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des plannings...</p>
                        </div>
                    ) : filteredSchedules.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucun planning trouvé</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Chauffeur</TableHead>
                                    <TableHead>Véhicule</TableHead>
                                    <TableHead>Période</TableHead>
                                    <TableHead>Horaire</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSchedules.map((schedule) => (
                                    <TableRow key={schedule._id}>
                                        <TableCell className="font-medium">
                                            {schedule.driver?.firstName
                                                ? `${schedule.driver.firstName} ${schedule.driver.lastName}`
                                                : 'Non spécifié'}
                                        </TableCell>
                                        <TableCell>
                                            {schedule.vehicle?.brand
                                                ? `${schedule.vehicle.brand} ${schedule.vehicle.model} (${schedule.vehicle.licensePlate})`
                                                : 'Non spécifié'}
                                        </TableCell>
                                        <TableCell>{formatSchedulePeriod(schedule)}</TableCell>
                                        <TableCell>{formatScheduleHours(schedule)}</TableCell>
                                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setScheduleToChangeStatus(schedule);
                                                        setNewStatus(schedule.status);
                                                        setStatusChangeDialogOpen(true);
                                                    }}
                                                    disabled={schedule.status === 'completed' || schedule.status === 'canceled'}
                                                    title={schedule.status === 'completed' || schedule.status === 'canceled' ? "Impossible de modifier un planning terminé ou annulé" : "Changer le statut"}
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedSchedule(schedule);
                                                        setIsFormOpen(true);
                                                    }}
                                                    disabled={isReadOnlySchedule(schedule)}
                                                    title={isReadOnlySchedule(schedule) ? "Modification non autorisée" : "Modifier"}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => {
                                                        setScheduleToDelete(schedule);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modale de formulaire (création/édition) */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedSchedule ? 'Modifier le planning' : 'Nouveau planning'}
                        </DialogTitle>
                    </DialogHeader>
                    <ScheduleForm
                        schedule={selectedSchedule}
                        drivers={drivers}
                        vehicles={vehicles}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>


            {/* Dialogue de confirmation de suppression */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        Êtes-vous sûr de vouloir supprimer ce planning ?
                        <AlertDialogDescription>
                            <div className="flex items-start mt-2 p-2 bg-red-50 rounded-md text-red-600 dark:bg-red-900/20 dark:text-red-300">
                                <AlertTriangleIcon className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                                <span>
                                    Attention : Tous les paiements associés à ce planning seront également supprimés définitivement.
                                    Cette action est irréversible.
                                </span>
                            </div>

                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogue de changement de statut */}
            <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Changer le statut</AlertDialogTitle>
                        <AlertDialogDescription>
                            Attention : Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="relative mt-4">
                        <Command className="rounded-lg border">
                            <CommandInput
                                placeholder="Rechercher un statut..."
                                className="h-10"
                            />
                            <ScrollArea className="h-48 rounded-b-md">
                                <CommandGroup>
                                    {[

                                        { value: 'completed', label: 'Terminé', color: 'bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800' },
                                        { value: 'canceled', label: 'Annulé', color: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
                                    ].map((status) => (
                                        <CommandItem
                                            key={status.value}
                                            onSelect={() => setNewStatus(status.value)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors ",
                                                status.value === newStatus
                                                    ? "bg-accent text-accent-foreground "
                                                    : "hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <Check
                                                className={cn(
                                                    "h-4 w-4",
                                                    status.value === newStatus ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <Badge
                                                variant="outline"
                                                className={`${status.color} min-w-[80px] justify-center`}
                                            >
                                                {status.label}
                                            </Badge>
                                            <span className="ml-2">{status.label}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </ScrollArea>
                        </Command>
                    </div>

                    {newStatus && (
                        <div className="mt-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
                            <span className="font-medium">Nouveau statut :</span> {
                                ['completed', 'canceled'].find(s => s === newStatus)?.toUpperCase() || newStatus
                            }
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleStatusChange}
                            disabled={!newStatus || newStatus === scheduleToChangeStatus?.status}
                        >
                            Confirmer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SchedulesList;