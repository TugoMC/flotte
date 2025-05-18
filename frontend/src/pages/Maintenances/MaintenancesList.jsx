// src/pages/MaintenancesList.jsx
import { useState, useEffect } from 'react';
import { scheduleService } from '@/services/api';
import { AlertTriangleIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { maintenanceService } from '@/services/api';
import { vehicleService } from '@/services/api';
import { toast } from 'sonner';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Eye, PlusIcon, EditIcon, TrashIcon, SearchIcon, ImageIcon, XIcon, AlertCircleIcon, InfoIcon } from 'lucide-react';
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
    DialogDescription,
    DialogFooter
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MaintenancesList = () => {
    const navigate = useNavigate();

    // États
    const [maintenances, setMaintenances] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [filterType, setFilterType] = useState('all');

    const [conflicts, setConflicts] = useState([]);
    const [conflictsDialogOpen, setConflictsDialogOpen] = useState(false);

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMaintenance, setSelectedMaintenance] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [maintenanceToDelete, setMaintenanceToDelete] = useState(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // État du formulaire
    const [formData, setFormData] = useState({
        vehicle: '',
        maintenanceType: 'oil_change',
        maintenanceNature: 'preventive',
        maintenanceDate: '',
        completionDate: '',
        cost: '',
        duration: '',
        technicianName: '',
        notes: '',
        completed: false
    });

    // État pour la gestion des photos
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [photosPreviews, setPhotosPreviews] = useState([]);

    useEffect(() => {
        fetchData();
        fetchVehicles();
    }, [activeTab]);


    const checkForConflicts = async (vehicleId, startDate, duration) => {
        try {
            if (!vehicleId || !startDate) return [];

            const endDate = duration
                ? new Date(new Date(startDate).getTime() + duration * 86400000)
                : null;

            const response = await maintenanceService.checkConflicts(
                vehicleId,
                new Date(startDate).toISOString(),
                endDate ? new Date(endDate).toISOString() : null
            );

            return response.data.conflicts || [];
        } catch (error) {
            console.error('Error checking conflicts:', error);
            toast.error("Error checking for conflicts");
            return [];
        }
    };

    useEffect(() => {
        if (formData.vehicle && formData.maintenanceDate) {
            const timer = setTimeout(async () => {
                try {
                    const foundConflicts = await checkForConflicts(
                        formData.vehicle,
                        formData.maintenanceDate,
                        formData.duration
                    );
                    setConflicts(foundConflicts);

                    if (foundConflicts.length > 0) {
                        toast.error("Impossible de créer la maintenance avec des conflits de planning", {
                            description: "Veuillez d'abord résoudre les conflits en modifiant le statut des plannings concernés",
                            action: {
                                label: "Voir les conflits",
                                onClick: () => setConflictsDialogOpen(true)
                            }
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Conflict check error:', error);
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [formData.vehicle, formData.maintenanceDate, formData.duration]);

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

    const fetchData = async () => {
        try {
            setLoading(true);
            let response = await maintenanceService.getAll();

            // Filtrer selon l'onglet actif
            let filteredData = response.data;
            if (activeTab === 'active') {
                filteredData = filteredData.filter(m => !m.completed);
            } else if (activeTab === 'completed') {
                filteredData = filteredData.filter(m => m.completed);
            }

            setMaintenances(filteredData);
        } catch (error) {
            console.error('Erreur lors de la récupération des données:', error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const fetchVehicles = async () => {
        try {
            const vehiclesRes = await vehicleService.getAll();
            setVehicles(vehiclesRes.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des véhicules:', error);
            toast.error("Erreur lors du chargement des véhicules");
        }
    };

    // Filtrer les maintenances
    const filteredMaintenances = maintenances.filter(maintenance => {
        // Filtrer par terme de recherche
        const searchLower = searchTerm.toLowerCase();
        const vehicleInfo = maintenance.vehicle?.licensePlate?.toLowerCase() || '';
        const technicianInfo = maintenance.technicianName?.toLowerCase() || '';
        const notesInfo = maintenance.notes?.toLowerCase() || '';

        if (searchTerm &&
            !vehicleInfo.includes(searchLower) &&
            !technicianInfo.includes(searchLower) &&
            !notesInfo.includes(searchLower)) {
            return false;
        }

        // Filtrer par véhicule
        if (filterVehicle && filterVehicle !== 'all' && maintenance.vehicle?._id !== filterVehicle) {
            return false;
        }

        // Filtrer par type
        if (filterType && filterType !== 'all' && maintenance.maintenanceType !== filterType) {
            return false;
        }

        return true;
    });

    const handleOpenForm = (maintenance = null) => {
        if (maintenance) {
            setSelectedMaintenance(maintenance);
            setFormData({
                vehicle: maintenance.vehicle?._id || '',
                maintenanceType: maintenance.maintenanceType || 'oil_change',
                maintenanceNature: maintenance.maintenanceNature || 'preventive',
                maintenanceDate: maintenance.maintenanceDate ? format(new Date(maintenance.maintenanceDate), 'yyyy-MM-dd') : '',
                completionDate: maintenance.completionDate ? format(new Date(maintenance.completionDate), 'yyyy-MM-dd') : '',
                cost: maintenance.cost || '',
                duration: maintenance.duration || '',
                technicianName: maintenance.technicianName || '',
                notes: maintenance.notes || '',
                completed: maintenance.completed || false
            });
        } else {
            setSelectedMaintenance(null);
            setFormData({
                vehicle: '',
                maintenanceType: 'oil_change',
                maintenanceNature: 'preventive',
                maintenanceDate: '',
                completionDate: '',
                cost: '',
                duration: '',
                technicianName: '',
                notes: '',
                completed: false
            });
        }
        setSelectedFiles([]);
        setPhotosPreviews([]);
        setIsFormOpen(true);
    };

    const confirmDelete = (maintenance) => {
        setMaintenanceToDelete(maintenance);
        setDeleteDialogOpen(true);
    };

    // Naviguer vers la page de détail
    const handleViewDetails = (id) => {
        navigate(`/maintenances/${id}`);
    };

    const handleDelete = async () => {
        if (!maintenanceToDelete) return;

        try {
            await maintenanceService.delete(maintenanceToDelete._id);
            toast.success("Maintenance supprimée avec succès");
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer la maintenance");
        } finally {
            setDeleteDialogOpen(false);
            setMaintenanceToDelete(null);
        }
    };

    const handleSubmit = async () => {
        try {
            // Vérifier les conflits avant de soumettre
            const foundConflicts = await checkForConflicts(
                formData.vehicle,
                formData.maintenanceDate,
                formData.duration
            );

            if (foundConflicts.length > 0) {
                const proceed = window.confirm(
                    `Il y a ${foundConflicts.length} conflit(s) avec des plannings existants. Voulez-vous vraiment créer cette maintenance malgré les conflits?`
                );
                if (!proceed) return;
            }

            // Créer ou mettre à jour la maintenance
            let maintenanceId;
            if (selectedMaintenance) {
                const response = await maintenanceService.update(selectedMaintenance._id, formData);
                maintenanceId = selectedMaintenance._id;
                toast.success("Maintenance mise à jour avec succès");
            } else {
                const response = await maintenanceService.create(formData);
                maintenanceId = response.data._id;
                toast.success("Maintenance créée avec succès");
            }

            // Upload des photos si des fichiers ont été sélectionnés
            if (selectedFiles.length > 0 && maintenanceId) {
                await maintenanceService.uploadPhotos(maintenanceId, selectedFiles);
                toast.success(`${selectedFiles.length} photo(s) ajoutée(s) avec succès`);
            }

            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            toast.error("Impossible d'enregistrer la maintenance");
        } finally {
            setSelectedFiles([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

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

    const getStatusBadge = (completed) => {
        return completed ?
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Terminée</Badge> :
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">En cours</Badge>;
    };

    const getTypeLabel = (type) => {
        const types = {
            oil_change: 'Vidange',
            tire_replacement: 'Changement pneus',
            engine: 'Moteur',
            other: 'Autre'
        };
        return types[type] || type;
    };

    const getNatureLabel = (nature) => {
        const natures = {
            preventive: 'Préventive',
            corrective: 'Corrective',
            predictive: 'Prédictive'
        };
        return natures[nature] || nature;
    };

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSearchTerm('');
        setFilterVehicle('all');
        setFilterType('all');
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Maintenances</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Visualisez et gérez les interventions de maintenance
                            <span
                                className="underline cursor-pointer text-blue-500 hover:text-blue-700"
                                onClick={() => setIsTutorialOpen(true)}
                            >
                                Comment ça marche
                            </span>
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Ajouter une maintenance
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par véhicule, technicien ou notes..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par véhicule" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les véhicules</SelectItem>
                                {vehicles.map(vehicle => (
                                    <SelectItem key={vehicle._id} value={vehicle._id}>
                                        {vehicle.licensePlate} - {vehicle.brand} {vehicle.model}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="oil_change">Vidange</SelectItem>
                                <SelectItem value="tire_replacement">Changement pneus</SelectItem>
                                <SelectItem value="engine">Moteur</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bouton pour réinitialiser les filtres */}
                    {(searchTerm || filterVehicle !== 'all' || filterType !== 'all') && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Onglets pour filtrer par statut */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-3">
                            <TabsTrigger value="all">Toutes les maintenances</TabsTrigger>
                            <TabsTrigger value="active">En cours</TabsTrigger>
                            <TabsTrigger value="completed">Terminées</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Tableau des maintenances */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des maintenances...</p>
                        </div>
                    ) : filteredMaintenances.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucune maintenance trouvée</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Véhicule</TableHead>
                                    <TableHead>Type/Nature</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Technicien</TableHead>
                                    <TableHead>Coût</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaintenances.map((maintenance) => (
                                    <TableRow key={maintenance._id}>
                                        <TableCell className="font-medium">
                                            {maintenance.vehicle?.licensePlate} - {maintenance.vehicle?.brand} {maintenance.vehicle?.model}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{getTypeLabel(maintenance.maintenanceType)}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {getNatureLabel(maintenance.maintenanceNature)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {maintenance.maintenanceDate ? format(new Date(maintenance.maintenanceDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                                            {maintenance.completionDate && (
                                                <span className="block text-sm text-muted-foreground">
                                                    au {format(new Date(maintenance.completionDate), 'dd MMM yyyy', { locale: fr })}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {maintenance.technicianName || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {maintenance.cost ? `${maintenance.cost} FCFA` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(maintenance.completed)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleViewDetails(maintenance._id)}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleOpenForm(maintenance)}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => confirmDelete(maintenance)}
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
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedMaintenance ? 'Modifier une maintenance' : 'Ajouter une maintenance'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedMaintenance
                                ? 'Modifiez les détails de cette maintenance'
                                : 'Remplissez les informations pour ajouter une nouvelle maintenance'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="vehicle" className='required'>Véhicule</label>
                                <div className="relative">
                                    <Command className="rounded-lg border ">
                                        <CommandInput
                                            placeholder="Rechercher un véhicule..."
                                            className="h-10"
                                            required
                                        />
                                        <ScrollArea className="h-48 rounded-b-md">
                                            <CommandGroup>
                                                {vehicles.map((vehicle) => (
                                                    <CommandItem
                                                        key={vehicle._id}
                                                        onSelect={() => setFormData({ ...formData, vehicle: vehicle._id })}
                                                        className={cn(
                                                            "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors",
                                                            vehicle._id === formData.vehicle
                                                                ? "bg-accent text-accent-foreground"
                                                                : "hover:bg-accent hover:text-accent-foreground"
                                                        )}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4",
                                                                vehicle._id === formData.vehicle ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium">{vehicle.licensePlate}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {vehicle.brand} {vehicle.model} • {vehicle.type}
                                                            </p>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </Command>
                                </div>
                                {formData.vehicle && (
                                    <div className="mt-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
                                        <span className="font-medium">Sélectionné :</span> {
                                            vehicles.find(v => v._id === formData.vehicle)?.licensePlate
                                        } - {
                                            vehicles.find(v => v._id === formData.vehicle)?.brand
                                        } {
                                            vehicles.find(v => v._id === formData.vehicle)?.model
                                        }
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="maintenanceType" className='required'>Type de maintenance</label>
                                <Select
                                    name="maintenanceType"
                                    value={formData.maintenanceType}
                                    onValueChange={(value) => setFormData({ ...formData, maintenanceType: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="oil_change">Vidange</SelectItem>
                                        <SelectItem value="tire_replacement">Changement pneus</SelectItem>
                                        <SelectItem value="engine">Moteur</SelectItem>
                                        <SelectItem value="other">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="maintenanceNature" className='required'>Nature de maintenance</label>
                            <Select
                                name="maintenanceNature"
                                value={formData.maintenanceNature}
                                onValueChange={(value) => setFormData({ ...formData, maintenanceNature: value })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une nature" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="preventive">Préventive</SelectItem>
                                    <SelectItem value="corrective">Corrective</SelectItem>
                                    <SelectItem value="predictive">Prédictive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="technicianName " className='required'>Technicien</label>
                            <Input
                                name="technicianName"
                                value={formData.technicianName}
                                onChange={handleInputChange}
                                placeholder="Nom du technicien"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="maintenanceDate" className='required'>Date de début</label>
                            <Input
                                type="date"
                                name="maintenanceDate"
                                value={formData.maintenanceDate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="completionDate">Date de fin</label>
                            <Input
                                type="date"
                                name="completionDate"
                                value={formData.completionDate}
                                onChange={handleInputChange}
                                disabled={!formData.completed}
                            />
                        </div>
                        {conflicts.length > 0 && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                                <AlertTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                                <div>
                                    <p className="font-medium">Attention: Conflit de planning détecté</p>
                                    <p className="text-sm">
                                        Cette maintenance entre en conflit avec {conflicts.length} planning(s) existant(s).
                                        Avant de continuer, veuillez modifier le statut des plannings concernés à "Terminé" ou "Annulé".
                                    </p>
                                    <Button
                                        variant="link"
                                        className="text-yellow-700 dark:text-yellow-300 p-0 h-auto mt-1"
                                        onClick={() => setConflictsDialogOpen(true)}
                                    >
                                        Voir les détails des conflits
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="cost">Coût (FCFA)</label>
                            <Input
                                type="number"
                                name="cost"
                                value={formData.cost}
                                onChange={handleInputChange}
                                min="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="duration">Durée (Jours)</label>
                            <Input
                                type="number"
                                name="duration"
                                value={formData.duration}
                                onChange={handleInputChange}
                                min="1"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="completed">Statut</label>
                        <Select
                            name="completed"
                            value={formData.completed ? 'true' : 'false'}
                            onValueChange={(value) => setFormData({ ...formData, completed: value === 'true' })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="false">En cours</SelectItem>
                                <SelectItem value="true">Terminée</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="notes">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm  placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Ajouter une note..."
                        />
                    </div>

                    {/* Section de gestion des photos */}
                    <div className="space-y-4 mt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-base font-medium">Photos de la maintenance</label>
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
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit}>
                            {selectedMaintenance ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialogue pour afficher les conflits */}
            <Dialog open={conflictsDialogOpen} onOpenChange={setConflictsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Conflits de planning détectés</DialogTitle>
                        <DialogDescription>
                            Résolvez ces conflits avant de créer la maintenance
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 text-yellow-700 rounded-md dark:bg-yellow-900/30 dark:text-yellow-300">
                            <AlertCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Action requise</p>
                                <p className="text-sm">
                                    Pour créer cette maintenance, vous devez d'abord modifier le statut des plannings
                                    conflictuels à "Terminé" ou "Annulé" dans la section Planning.
                                </p>
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Chauffeur</TableHead>
                                        <TableHead>Véhicule</TableHead>
                                        <TableHead>Période</TableHead>
                                        <TableHead>Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {conflicts.map((conflict) => (
                                        <TableRow key={conflict._id}>
                                            <TableCell>
                                                {conflict.driver?.firstName} {conflict.driver?.lastName}
                                            </TableCell>
                                            <TableCell>
                                                {conflict.vehicle?.licensePlate}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(conflict.scheduleDate), 'dd/MM/yyyy')}
                                                {conflict.endDate && ` - ${format(new Date(conflict.endDate), 'dd/MM/yyyy')}`}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {conflict.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConflictsDialogOpen(false)}>
                            Fermer
                        </Button>
                        <Button onClick={() => {
                            setConflictsDialogOpen(false);
                            navigate('/schedules'); // Redirige vers la page des plannings
                        }}>
                            Aller aux plannings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialogue de confirmation de suppression */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette maintenance ? Cette action est irréversible.
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
            {/* Dialogue de modale tutoriel */}
            <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
                <DialogContent className="sm:max-w-[90%] max-w-[1200px] h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Tutoriel - Gestion des maintenances</DialogTitle>
                    </DialogHeader>
                    <div className="h-full overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg mb-2">1. Ajout d'une maintenance</h3>
                                <p>Cliquez sur "Ajouter une maintenance" pour enregistrer une nouvelle intervention.</p>
                                <p>Remplissez toutes les informations requises : véhicule, type de maintenance, dates, etc.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">2. Filtrage des maintenances</h3>
                                <p>Utilisez les différents filtres pour trouver facilement les maintenances :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Recherche par véhicule, technicien ou notes</li>
                                    <li>Filtre par véhicule spécifique</li>
                                    <li>Filtre par type de maintenance</li>
                                    <li>Onglets pour filtrer par statut (en cours, terminées)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">3. Modification des maintenances</h3>
                                <p>Cliquez sur l'icône <EditIcon className="inline h-4 w-4" /> pour modifier une maintenance.</p>
                                <p>Vous pouvez mettre à jour toutes les informations, y compris l'ajout de photos.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">4. Visualisation des détails</h3>
                                <p>Cliquez sur l'icône <Eye className="inline h-4 w-4" /> pour voir les détails complets d'une maintenance.</p>
                                <p>Cette page affichera toutes les informations et photos associées.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">5. Gestion des statuts</h3>
                                <p>Marquez une maintenance comme terminée lorsque l'intervention est complète.</p>
                                <p>Les maintenances terminées apparaissent dans l'onglet "Terminées".</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">6. Ajout de photos</h3>
                                <p>Vous pouvez ajouter des photos pour documenter l'état du véhicule avant/après maintenance.</p>
                                <p>Les photos doivent être au format JPG/PNG et ne pas dépasser 5MB chacune.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">7. Gestion des conflits</h3>
                                <p>Le système détecte automatiquement les conflits avec les plannings existants.</p>
                                <p className="text-yellow-600">En cas de conflit, vous devrez résoudre les problèmes de planning avant de pouvoir enregistrer.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">8. Suppression de maintenances</h3>
                                <p>Cliquez sur l'icône <TrashIcon className="inline h-4 w-4" /> pour supprimer une maintenance.</p>
                                <p className="text-red-500">Attention : Cette action est irréversible et supprimera toutes les données associées.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default MaintenancesList;