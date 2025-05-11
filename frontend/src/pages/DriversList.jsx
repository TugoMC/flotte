// src/pages/DriversList.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { driverService, vehicleService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, PhoneIcon, CarIcon, BikeIcon, Eye } from 'lucide-react';
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

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DriverForm from '@/components/forms/DriverForm';

const DriversList = () => {
    // États
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('all');

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState(null);

    const navigate = useNavigate();
    const handleViewDetails = (driverId) => {
        navigate(`/drivers/${driverId}`);
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            let driversRes;

            // Charger les chauffeurs selon l'onglet actif
            switch (activeTab) {
                case 'active':
                    driversRes = await driverService.getActive();
                    break;
                case 'former':
                    driversRes = await driverService.getFormer();
                    break;
                default:
                    driversRes = await driverService.getAll();
            }

            const vehiclesRes = await vehicleService.getAll();

            setDrivers(driversRes.data);
            setVehicles(vehiclesRes.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des données:', error);
            toast.error("Impossible de charger les données des chauffeurs");
            // En cas d'erreur, utiliser des données simulées pour le développement
            setDrivers([
                { _id: '1', firstName: 'Amadou', lastName: 'Diallo', phoneNumber: '+221 77 123 4567', licenseNumber: 'A123456', hireDate: '2023-01-15', departureDate: null, currentVehicle: '1' },
                { _id: '2', firstName: 'Fatou', lastName: 'Sow', phoneNumber: '+221 76 765 4321', licenseNumber: 'B654321', hireDate: '2023-03-20', departureDate: null, currentVehicle: '2' },
                { _id: '3', firstName: 'Ousmane', lastName: 'Ndiaye', phoneNumber: '+221 70 555 9876', licenseNumber: 'C987654', hireDate: '2023-05-10', departureDate: '2024-02-15', currentVehicle: null }
            ]);
            setVehicles([
                { _id: '1', brand: 'Toyota', model: 'Corolla', licensePlate: 'ABC-123', type: 'taxi', status: 'active' },
                { _id: '2', brand: 'Peugeot', model: '308', licensePlate: 'DEF-456', type: 'taxi', status: 'active' },
                { _id: '3', brand: 'Honda', model: 'CBR', licensePlate: 'GHI-789', type: 'moto', status: 'active' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les chauffeurs
    const filteredDrivers = drivers.filter(driver => {
        // Filtrer par terme de recherche
        const driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase();
        const driverPhone = (driver.phoneNumber || '').toLowerCase();
        const driverLicense = (driver.licenseNumber || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        if (searchTerm && !driverName.includes(searchLower) &&
            !driverPhone.includes(searchLower) &&
            !driverLicense.includes(searchLower)) {
            return false;
        }

        // Filtrer par véhicule
        if (filterVehicle && filterVehicle !== 'all' && driver.currentVehicle !== filterVehicle) {
            return false;
        }

        return true;
    });

    const handleAddEdit = (driver = null) => {
        setSelectedDriver(driver);
        setIsFormOpen(true);
    };

    const confirmDelete = (driver) => {
        setDriverToDelete(driver);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!driverToDelete) return;

        try {
            await driverService.delete(driverToDelete._id);
            toast.success("Chauffeur supprimé avec succès");
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer le chauffeur");
        } finally {
            setDeleteDialogOpen(false);
            setDriverToDelete(null);
        }
    };

    const handleSubmitSuccess = () => {
        setIsFormOpen(false);
        toast.success(selectedDriver ? "Chauffeur mis à jour avec succès" : "Chauffeur ajouté avec succès");
        fetchData();
    };

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSearchTerm('');
        setFilterVehicle('');
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getStatusBadge = (departureDate) => {
        if (departureDate) {
            return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Ancien</Badge>;
        } else {
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge>;
        }
    };

    const getVehicleIcon = (type) => {
        if (type === 'moto') {
            return <BikeIcon className="h-4 w-4 text-blue-500" />;
        } else {
            return <CarIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const getVehicleStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge>;
            case 'maintenance':
                return <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">Maintenance</Badge>;
            case 'inactive':
                return <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Inactif</Badge>;
            default:
                return null;
        }
    };

    // Fonction pour extraire l'ID MongoDB
    const extractMongoId = (id) => {
        if (!id) return null;

        // Si c'est déjà une chaîne de caractères
        if (typeof id === 'string') return id;

        // Si c'est un objet avec une propriété $oid (format BSON/MongoDB)
        if (typeof id === 'object') {
            // Cas 1: {$oid: "..."}
            if (id.$oid) return id.$oid;

            // Cas spécifique pour la situation [object Object]
            if (id._id) {
                // Si _id est un objet avec $oid
                if (typeof id._id === 'object' && id._id.$oid) {
                    return id._id.$oid;
                }
                // Si _id est une chaîne
                if (typeof id._id === 'string') {
                    return id._id;
                }
            }

            // Cas 2: Récupération directe de l'ID si c'est un objet MongoID
            if (id.toString && typeof id.toString === 'function') {
                const str = id.toString();
                // Vérifier si la chaîne ressemble à un ObjectId MongoDB
                if (str !== '[object Object]' && /^[0-9a-fA-F]{24}$/.test(str)) {
                    return str;
                }
            }
        }

        // Tenter de sérialiser pour voir si on peut extraire une valeur
        try {
            const jsonStr = JSON.stringify(id);
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.$oid) return parsed.$oid;
        } catch (e) {
            // Ignorer les erreurs de sérialisation
        }

        // En dernier recours, tenter de récupérer l'ID directement si c'est un objet simple avec une propriété _id
        if (id && typeof id === 'object' && !Array.isArray(id)) {
            const keys = Object.keys(id);
            if (keys.length === 1 && keys[0] === '_id') {
                return extractMongoId(id._id);
            }
        }

        // Si aucune méthode n'a fonctionné, retourner null
        return null;
    };

    const getVehicleInfo = (vehicleId) => {
        if (!vehicleId) return 'Non assigné';

        try {
            // Extraire proprement l'ID du véhicule à rechercher
            const extractedVehicleId = extractMongoId(vehicleId);

            if (!extractedVehicleId) {
                // Si on ne peut pas extraire l'ID, on affiche directement l'ID brut pour le débogage
                console.warn("Impossible d'extraire l'ID du véhicule", vehicleId);
                return `ID véhicule non reconnu`;
            }

            // Rechercher le véhicule par ID extrait
            const vehicle = vehicles.find(v => {
                const vId = extractMongoId(v._id);
                return vId === extractedVehicleId;
            });

            if (!vehicle) {
                console.warn(`Véhicule non trouvé pour l'ID: ${extractedVehicleId}`);
                return `Recherche... (ID: ${extractedVehicleId})`;
            }

            return (
                <div className="flex items-center gap-2">
                    {getVehicleIcon(vehicle.type)}
                    <span className="font-medium">
                        {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                    </span>
                    {getVehicleStatusBadge(vehicle.status)}
                </div>
            );
        } catch (error) {
            console.error("Erreur lors de la récupération des infos du véhicule:", error);
            return "Erreur de chargement";
        }
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Chauffeurs</CardTitle>
                        <CardDescription>
                            Visualisez et gérez les informations des chauffeurs
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleAddEdit()}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Ajouter un chauffeur
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom, téléphone ou permis..."
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
                                {vehicles.map(vehicle => {
                                    const vehicleId = vehicle._id?.toString() || ''; // Ensure we have a string
                                    if (!vehicleId) return null; // Skip if no ID

                                    return (
                                        <SelectItem key={vehicleId} value={vehicleId}>
                                            {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bouton pour réinitialiser les filtres */}
                    {(searchTerm || (filterVehicle && filterVehicle !== 'all')) && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Onglets pour filtrer par statut */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-3">
                            <TabsTrigger value="all">Tous les chauffeurs</TabsTrigger>
                            <TabsTrigger value="active">Chauffeurs actifs</TabsTrigger>
                            <TabsTrigger value="former">Anciens chauffeurs</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Tableau des chauffeurs */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des chauffeurs...</p>
                        </div>
                    ) : filteredDrivers.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucun chauffeur trouvé</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Chauffeur</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Véhicule actuel</TableHead>
                                    <TableHead>Date d'embauche</TableHead>
                                    {(activeTab === 'former' || activeTab === 'all') &&
                                        <TableHead>Date de départ</TableHead>
                                    }
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDrivers.map((driver) => (
                                    <TableRow key={driver._id}>
                                        <TableCell className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={driver.profileImage} />
                                                <AvatarFallback>{getInitials(driver.firstName, driver.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                                                <p className="text-xs text-gray-500">Permis: {driver.licenseNumber}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <PhoneIcon className="h-3 w-3" />
                                                <span>{driver.phoneNumber}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getVehicleInfo(driver.currentVehicle)}
                                        </TableCell>
                                        <TableCell>
                                            {driver.hireDate ? format(new Date(driver.hireDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                                        </TableCell>
                                        {(activeTab === 'former' || activeTab === 'all') && (
                                            <TableCell>
                                                {driver.departureDate ? format(new Date(driver.departureDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {getStatusBadge(driver.departureDate)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleViewDetails(driver._id)}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleAddEdit(driver)}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => confirmDelete(driver)}
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
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDriver ? 'Modifier un chauffeur' : 'Ajouter un chauffeur'}
                        </DialogTitle>
                        <DialogDescription>
                            Remplissez le formulaire pour ajouter ou modifier un chauffeur.
                        </DialogDescription>
                    </DialogHeader>
                    <DriverForm
                        driver={selectedDriver}
                        vehicles={vehicles}
                        onSuccess={handleSubmitSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Dialogue de confirmation de suppression */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce chauffeur ? Cette action est irréversible.
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
        </div>
    );
};

export default DriversList;