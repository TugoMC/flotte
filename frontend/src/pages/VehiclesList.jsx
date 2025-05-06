// src/pages/VehiclesList.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { vehicleService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
import { Car, Bike, PlusIcon, EditIcon, TrashIcon, SearchIcon, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Schéma de validation
const vehicleSchema = z.object({
    type: z.enum(['taxi', 'moto']),
    licensePlate: z.string().min(3, { message: 'La plaque doit comporter au moins 3 caractères' }),
    brand: z.string().min(2, { message: 'La marque doit comporter au moins 2 caractères' }),
    model: z.string().min(2, { message: 'Le modèle doit comporter au moins 2 caractères' }),
    registrationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide (AAAA-MM-JJ)' }),
    serviceEntryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide (AAAA-MM-JJ)' }),
    status: z.enum(['active', 'inactive', 'maintenance']),
    dailyIncomeTarget: z.string().transform((val) => val === '' ? 0 : Number(val))
        .refine((val) => !isNaN(val) && val >= 0, { message: "L'objectif journalier doit être un nombre positif" }),
    notes: z.string().optional()
});

const VehiclesList = () => {
    // États
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);

    // Formulaire
    const form = useForm({
        resolver: zodResolver(vehicleSchema),
        defaultValues: {
            type: 'taxi',
            licensePlate: '',
            brand: '',
            model: '',
            registrationDate: new Date().toISOString().split('T')[0],
            serviceEntryDate: new Date().toISOString().split('T')[0],
            status: 'active',
            dailyIncomeTarget: '',
            notes: ''
        }
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await vehicleService.getAll();

            // Filtrer selon l'onglet actif
            let filteredVehicles = response.data;
            if (activeTab !== 'all') {
                filteredVehicles = response.data.filter(vehicle =>
                    activeTab === 'active' ? vehicle.status === 'active' : vehicle.status !== 'active'
                );
            }

            setVehicles(filteredVehicles);
        } catch (error) {
            console.error('Erreur lors du chargement des véhicules:', error);
            toast.error("Impossible de charger la liste des véhicules", {
                description: "Une erreur s'est produite lors du chargement des données"
            });
            // Données simulées pour le développement
            setVehicles([
                {
                    _id: '1',
                    type: 'taxi',
                    licensePlate: 'ABC-123',
                    brand: 'Toyota',
                    model: 'Corolla',
                    registrationDate: '2023-01-15',
                    serviceEntryDate: '2023-01-20',
                    dailyIncomeTarget: 25000,
                    status: 'active'
                },
                {
                    _id: '2',
                    type: 'taxi',
                    licensePlate: 'DEF-456',
                    brand: 'Peugeot',
                    model: '308',
                    registrationDate: '2023-03-20',
                    serviceEntryDate: '2023-04-01',
                    dailyIncomeTarget: 20000,
                    status: 'active'
                },
                {
                    _id: '3',
                    type: 'moto',
                    licensePlate: 'GHI-789',
                    brand: 'Honda',
                    model: 'CBR',
                    registrationDate: '2023-05-10',
                    serviceEntryDate: '2023-05-15',
                    dailyIncomeTarget: 15000,
                    status: 'maintenance'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les véhicules
    const filteredVehicles = vehicles.filter(vehicle => {
        // Filtrer par terme de recherche
        const vehicleInfo = `${vehicle.brand} ${vehicle.model} ${vehicle.licensePlate}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        if (searchTerm && !vehicleInfo.includes(searchLower)) {
            return false;
        }

        // Filtrer par statut
        if (filterStatus !== 'all' && vehicle.status !== filterStatus) {
            return false;
        }

        // Filtrer par type
        if (filterType !== 'all' && vehicle.type !== filterType) {
            return false;
        }

        return true;
    });

    const handleAddEdit = (vehicle = null) => {
        setSelectedVehicle(vehicle);
        if (vehicle) {
            form.reset({
                ...vehicle,
                registrationDate: vehicle.registrationDate.split('T')[0],
                serviceEntryDate: vehicle.serviceEntryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                dailyIncomeTarget: vehicle.dailyIncomeTarget ? vehicle.dailyIncomeTarget.toString() : '',
            });
        } else {
            form.reset({
                type: 'taxi',
                licensePlate: '',
                brand: '',
                model: '',
                registrationDate: new Date().toISOString().split('T')[0],
                serviceEntryDate: new Date().toISOString().split('T')[0],
                status: 'active',
                dailyIncomeTarget: '',
                notes: ''
            });
        }
        setIsFormOpen(true);
    };

    const confirmDelete = (vehicle) => {
        setVehicleToDelete(vehicle);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!vehicleToDelete) return;

        try {
            await vehicleService.delete(vehicleToDelete._id);
            toast({
                title: "Succès",
                description: "Véhicule supprimé avec succès"
            });
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer le véhicule");
        } finally {
            setDeleteDialogOpen(false);
            setVehicleToDelete(null);
        }
    };

    const handleSubmit = async (data) => {
        try {
            if (selectedVehicle) {
                await vehicleService.update(selectedVehicle._id, data);
                toast.success(selectedVehicle
                    ? "Véhicule mis à jour avec succès"
                    : "Véhicule ajouté avec succès");
            } else {
                await vehicleService.create(data);
                toast({
                    title: "Succès",
                    description: "Véhicule ajouté avec succès"
                });
            }
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            toast.error(selectedVehicle
                ? "Impossible de mettre à jour le véhicule"
                : "Impossible d'ajouter le véhicule");
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setFilterType('all');
    };

    const getVehicleIcon = (type) => {
        return type === 'moto'
            ? <Bike className="h-4 w-4 text-blue-500" />
            : <Car className="h-4 w-4 text-gray-500" />;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actif</Badge>;
            case 'inactive':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactif</Badge>;
            case 'maintenance':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Maintenance</Badge>;
            default:
                return null;
        }
    };

    // Formater le montant en FCFA
    const formatMoney = (amount) => {
        if (amount === undefined || amount === null) return '—';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Véhicules</CardTitle>
                        <CardDescription>
                            Visualisez et gérez les informations des véhicules de votre flotte
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleAddEdit()}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Ajouter un véhicule
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par marque, modèle ou plaque..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">Inactif</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="taxi">Taxi</SelectItem>
                                <SelectItem value="moto">Moto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bouton pour réinitialiser les filtres */}
                    {(searchTerm || filterStatus !== 'all' || filterType !== 'all') && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Onglets pour filtrer */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-3">
                            <TabsTrigger value="all">Tous les véhicules</TabsTrigger>
                            <TabsTrigger value="active">Véhicules actifs</TabsTrigger>
                            <TabsTrigger value="inactive">Véhicules inactifs</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Tableau des véhicules */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des véhicules...</p>
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucun véhicule trouvé</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Plaque</TableHead>
                                    <TableHead>Marque/Modèle</TableHead>
                                    <TableHead>Date d'enregistrement</TableHead>
                                    <TableHead>Objectif journalier</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVehicles.map((vehicle) => (
                                    <TableRow key={vehicle._id}>
                                        <TableCell className="flex items-center gap-2">
                                            {getVehicleIcon(vehicle.type)}
                                            {vehicle.type === 'taxi' ? 'Taxi' : 'Moto'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {vehicle.licensePlate}
                                        </TableCell>
                                        <TableCell>
                                            {vehicle.brand} {vehicle.model}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(vehicle.registrationDate), 'dd MMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            {formatMoney(vehicle.dailyIncomeTarget)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(vehicle.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleAddEdit(vehicle)}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => confirmDelete(vehicle)}
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

            {/* Modale de formulaire */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedVehicle ? 'Modifier un véhicule' : 'Ajouter un véhicule'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type de véhicule</label>
                                <Select
                                    value={form.watch('type')}
                                    onValueChange={(value) => form.setValue('type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="taxi">Taxi</SelectItem>
                                        <SelectItem value="moto">Moto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Plaque d'immatriculation</label>
                                <Input
                                    placeholder="ABC-123"
                                    {...form.register('licensePlate')}
                                />
                                {form.formState.errors.licensePlate && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.licensePlate.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Marque</label>
                                <Input
                                    placeholder="Toyota"
                                    {...form.register('brand')}
                                />
                                {form.formState.errors.brand && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.brand.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Modèle</label>
                                <Input
                                    placeholder="Corolla"
                                    {...form.register('model')}
                                />
                                {form.formState.errors.model && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.model.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date d'enregistrement</label>
                                <Input
                                    type="date"
                                    {...form.register('registrationDate')}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date d'entrée en service</label>
                                <Input
                                    type="date"
                                    {...form.register('serviceEntryDate')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Statut</label>
                                <Select
                                    value={form.watch('status')}
                                    onValueChange={(value) => form.setValue('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Actif</SelectItem>
                                        <SelectItem value="inactive">Inactif</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Objectif journalier (FCFA)</label>
                                <Input
                                    type="number"
                                    placeholder="25000"
                                    min="0"
                                    {...form.register('dailyIncomeTarget')}
                                />
                                {form.formState.errors.dailyIncomeTarget && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.dailyIncomeTarget.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes (optionnel)</label>
                            <Input
                                placeholder="Informations supplémentaires..."
                                {...form.register('notes')}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFormOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit">
                                {selectedVehicle ? 'Enregistrer' : 'Ajouter'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialogue de confirmation de suppression */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center p-4 bg-red-50 rounded-lg mt-2">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-red-500">
                            {vehicleToDelete && `${vehicleToDelete.brand} ${vehicleToDelete.model} (${vehicleToDelete.licensePlate})`}
                        </span>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default VehiclesList;