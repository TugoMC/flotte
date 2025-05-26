// src/pages/Vehicles/VehiclesList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { vehicleService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye } from "lucide-react";
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
import {
    CarIcon,
    BikeIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    SearchIcon,
    ImageIcon,
    XIcon,
    InfoIcon
} from 'lucide-react';

const VehiclesList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // États
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // État du formulaire
    const [formData, setFormData] = useState({
        type: 'taxi',
        licensePlate: '',
        brand: '',
        model: '',
        registrationDate: '',
        serviceEntryDate: '',
        status: 'active',
        notes: '',
        dailyIncomeTarget: 0
    });

    // État pour la gestion des photos
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [photosPreviews, setPhotosPreviews] = useState([]);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

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
            let vehiclesRes;

            // Charger les véhicules selon l'onglet actif
            switch (activeTab) {
                case 'active':
                    vehiclesRes = await vehicleService.getByStatus('active');
                    break;
                case 'inactive':
                    vehiclesRes = await vehicleService.getByStatus('inactive');
                    break;
                case 'maintenance':
                    vehiclesRes = await vehicleService.getByStatus('maintenance');
                    break;
                default:
                    vehiclesRes = await vehicleService.getAll();
            }

            setVehicles(vehiclesRes.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des données:', error);
            toast.error("Impossible de charger les données des véhicules");

            // En cas d'erreur, utiliser des données simulées pour le développement
            setVehicles([
                {
                    _id: '1',
                    type: 'taxi',
                    licensePlate: 'ABC-123',
                    brand: 'Toyota',
                    model: 'Corolla',
                    registrationDate: '2022-01-15',
                    serviceEntryDate: '2022-02-01',
                    status: 'active',
                    currentDriver: { _id: '1', firstName: 'Amadou', lastName: 'Diallo' }
                },
                {
                    _id: '2',
                    type: 'taxi',
                    licensePlate: 'DEF-456',
                    brand: 'Peugeot',
                    model: '308',
                    registrationDate: '2022-03-20',
                    serviceEntryDate: '2022-04-05',
                    status: 'active',
                    currentDriver: null
                },
                {
                    _id: '3',
                    type: 'moto',
                    licensePlate: 'GHI-789',
                    brand: 'Honda',
                    model: 'CBR',
                    registrationDate: '2022-05-10',
                    serviceEntryDate: '2022-05-15',
                    status: 'maintenance',
                    currentDriver: null
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les véhicules
    const filteredVehicles = vehicles.filter(vehicle => {
        // Filtrer par terme de recherche
        const vehicleInfo = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.licensePlate || ''}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        if (searchTerm && !vehicleInfo.includes(searchLower)) {
            return false;
        }

        // Filtrer par type
        if (filterType && filterType !== 'all' && vehicle.type !== filterType) {
            return false;
        }

        return true;
    });

    const handleOpenForm = (vehicle = null) => {
        if (vehicle) {
            setSelectedVehicle(vehicle);
            setFormData({
                ...vehicle,
                registrationDate: format(new Date(vehicle.registrationDate), 'yyyy-MM-dd'),
                serviceEntryDate: format(new Date(vehicle.serviceEntryDate), 'yyyy-MM-dd')
            });
        } else {
            setSelectedVehicle(null);
            setFormData({
                type: 'taxi',
                licensePlate: '',
                brand: '',
                model: '',
                registrationDate: '',
                serviceEntryDate: '',
                status: 'active',
                notes: '',
                dailyIncomeTarget: ''
            });
        }
        setSelectedFiles([]);
        setPhotosPreviews([]);
        setIsFormOpen(true);
    };

    const confirmDelete = (vehicle) => {
        setVehicleToDelete(vehicle);
        setDeleteDialogOpen(true);
    };

    // Naviguer vers la page de détail
    const handleViewDetails = (id) => {
        navigate(`/vehicles/${id}`);
    };

    const handleDelete = async () => {
        if (!vehicleToDelete) return;

        try {
            await vehicleService.delete(vehicleToDelete._id);
            toast.success("Véhicule supprimé avec succès");
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer le véhicule");
        } finally {
            setDeleteDialogOpen(false);
            setVehicleToDelete(null);
        }
    };

    const handleSubmit = async () => {
        try {
            // Validation des champs obligatoires
            const { type, licensePlate, brand, model, registrationDate, serviceEntryDate } = formData;

            if (!type || !licensePlate || !brand || !model || !registrationDate || !serviceEntryDate) {
                toast.error("Tous les champs obligatoires doivent être remplis");
                return;
            }

            let vehicleId;

            if (selectedVehicle) {
                // Mise à jour du véhicule existant
                await vehicleService.update(selectedVehicle._id, formData);
                vehicleId = selectedVehicle._id;
                toast.success("Véhicule mis à jour avec succès");
            } else {
                // Création d'un nouveau véhicule
                const response = await vehicleService.create(formData);
                vehicleId = response.data._id;
                toast.success("Véhicule ajouté avec succès");
            }

            // Upload des photos seulement si un véhicule existe et que des fichiers sont sélectionnés
            if (vehicleId && selectedFiles.length > 0) {
                await vehicleService.uploadPhotos(vehicleId, selectedFiles);
                toast.success(`${selectedFiles.length} photo(s) ajoutée(s) avec succès`);
            }

            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            toast.error(error.response?.data?.message || "Une erreur est survenue");
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge>;
            case 'inactive':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Inactif</Badge>;
            case 'maintenance':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">Maintenance</Badge>;
            default:
                return null;
        }
    };

    const getVehicleIcon = (type) => {
        if (type === 'moto') {
            return <BikeIcon className="h-4 w-4 text-blue-500" />;
        } else {
            return <CarIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const getDriverInfo = (driver) => {
        if (!driver) return 'Non assigné';
        return `${driver.firstName} ${driver.lastName}`;
    };

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSearchTerm('');
        setFilterType('all');
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Véhicules</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Visualisez et gérez les informations des véhicules
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
                        Ajouter un véhicule
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par marque, modèle ou immatriculation..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

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
                    {(searchTerm || filterType !== 'all') && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Onglets pour filtrer par statut */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-4">
                            <TabsTrigger value="all">Tous les véhicules</TabsTrigger>
                            <TabsTrigger value="active">Actifs</TabsTrigger>
                            <TabsTrigger value="inactive">Inactifs</TabsTrigger>
                            <TabsTrigger value="maintenance">En maintenance</TabsTrigger>
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
                                    <TableHead>Immatriculation</TableHead>
                                    <TableHead>Marque / Modèle</TableHead>
                                    <TableHead>Mise en service</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Chauffeur</TableHead>
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
                                            {vehicle.serviceEntryDate ? format(new Date(vehicle.serviceEntryDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(vehicle.status)}
                                        </TableCell>
                                        <TableCell>
                                            {getDriverInfo(vehicle.currentDriver)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleViewDetails(vehicle._id)}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleOpenForm(vehicle)}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>

                                                {user?.role !== 'manager' && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="text-red-500"
                                                        onClick={() => confirmDelete(vehicle)}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                )}
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
                            {selectedVehicle ? 'Modifier un véhicule' : 'Ajouter un véhicule'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedVehicle
                                ? 'Modifiez les détails de ce véhicule'
                                : 'Remplissez les informations pour ajouter un nouveau véhicule'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="type" className='required'>Type de véhicule</label>
                                <Select
                                    name="type"
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}

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
                                <label htmlFor="licensePlate" className='required'>Immatriculation</label>
                                <Input
                                    name="licensePlate"
                                    value={formData.licensePlate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="brand" className='required'>Marque</label>
                                <Input
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="model" className='required'>Modèle</label>
                                <Input
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="registrationDate" className='required'>Date d'immatriculation</label>
                                <Input
                                    type="date"
                                    name="registrationDate"
                                    value={formData.registrationDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="serviceEntryDate" className='required'>Date de mise en service</label>
                                <Input
                                    type="date"
                                    name="serviceEntryDate"
                                    value={formData.serviceEntryDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="status" className='required'>Statut</label>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Actif</SelectItem>
                                        <SelectItem value="inactive">Inactif</SelectItem>

                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="dailyIncomeTarget" className='required'>Objectif journalier (FCFA)</label>
                                <Input
                                    type="number"
                                    name="dailyIncomeTarget"
                                    value={formData.dailyIncomeTarget}
                                    onChange={(e) => setFormData({ ...formData, dailyIncomeTarget: Number(e.target.value) })}
                                />
                            </div>
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
                                <label className="text-base font-medium">Photos du véhicule</label>
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
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit}>
                            {selectedVehicle ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </div>
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
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Modale tutoriel */}
            <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
                <DialogContent className="sm:max-w-[90%] max-w-[1200px] h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Tutoriel - Gestion des véhicules</DialogTitle>
                    </DialogHeader>
                    <div className="h-full overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg mb-2">1. Ajout d'un véhicule</h3>
                                <p>Cliquez sur "Ajouter un véhicule" pour créer un nouveau véhicule.</p>
                                <p>Remplissez toutes les informations requises : type, immatriculation, marque, modèle, etc.</p>
                                <p>Vous pouvez également ajouter des photos du véhicule.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">2. Filtrage des véhicules</h3>
                                <p>Utilisez les différents filtres pour trouver facilement les véhicules :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Recherche par marque, modèle ou immatriculation</li>
                                    <li>Filtre par type de véhicule (taxi, moto)</li>
                                    <li>Onglets pour filtrer par statut (actifs, inactifs, en maintenance)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">3. Modification des véhicules</h3>
                                <p>Cliquez sur l'icône <EditIcon className="inline h-4 w-4" /> pour modifier un véhicule.</p>
                                <p>Vous pouvez mettre à jour toutes les informations, y compris le statut et les photos.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">4. Visualisation des détails</h3>
                                <p>Cliquez sur l'icône <Eye className="inline h-4 w-4" /> pour voir les détails complets d'un véhicule.</p>
                                <p>Cette page affichera l'historique complet du véhicule et ses statistiques.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">5. Gestion des statuts</h3>
                                <p>Vous pouvez changer le statut d'un véhicule :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge> - En service</li>
                                    <li><Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Inactif</Badge> - Hors service</li>
                                    <li><Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">Maintenance</Badge> - En réparation</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">6. Gestion des photos</h3>
                                <p>Vous pouvez ajouter jusqu'à 10 photos par véhicule.</p>
                                <p className="text-sm text-muted-foreground">Formats acceptés: JPG, PNG. Taille maximale: 5 MB par image.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">7. Suppression de véhicules</h3>
                                <p>Cliquez sur l'icône <TrashIcon className="inline h-4 w-4" /> pour supprimer un véhicule.</p>
                                <p className="text-red-500">Attention : Cette action est irréversible et supprimera toutes les données associées.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VehiclesList;