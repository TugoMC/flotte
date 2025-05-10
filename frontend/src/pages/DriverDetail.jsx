// src/pages/DriverDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { driverService, vehicleService } from '@/services/api';
import { toast } from 'sonner';
import { ChartDriverRevenue } from '@/components/ChartDriverRevenue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InfoIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
    DialogFooter
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Edit,
    Phone,
    Car,
    Bike,
    Calendar,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    User,
    Info,
    Camera
} from 'lucide-react';
import DriverForm from '@/components/forms/DriverForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

const DriverDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // États
    const [driver, setDriver] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // États pour le carrousel de photos
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [photoUploadError, setPhotoUploadError] = useState('');

    useEffect(() => {
        fetchDriverData();
    }, [id]);

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

    const fetchDriverData = async () => {
        try {
            setLoading(true);

            const driverRes = await driverService.getById(id);
            setDriver(driverRes.data);

            if (driverRes.data.currentVehicle) {
                try {
                    // Extraire proprement l'ID du véhicule
                    const vehicleId = extractMongoId(driverRes.data.currentVehicle);
                    if (vehicleId) {
                        const vehicleRes = await vehicleService.getById(vehicleId);
                        setVehicle(vehicleRes.data);
                    } else {
                        console.error('ID de véhicule non valide:', driverRes.data.currentVehicle);
                    }
                } catch (vehicleError) {
                    console.error('Erreur lors de la récupération du véhicule:', vehicleError);
                }
            }
        } catch (err) {
            console.error('Erreur lors de la récupération des données du chauffeur:', err);
            setError("Impossible de charger les informations du chauffeur");
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        if (!driver) return;
        setIsFormOpen(true);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        toast.success("Informations du chauffeur mises à jour");
        fetchDriverData();
    };

    // Navigation du carrousel
    const nextPhoto = () => {
        if (driver?.photos && driver.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === driver.photos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevPhoto = () => {
        if (driver?.photos && driver.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === 0 ? driver.photos.length - 1 : prevIndex - 1
            );
        }
    };

    // Gestion des photos
    const handleFileSelect = (e) => {
        setPhotoUploadError('');
        const files = Array.from(e.target.files);

        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                setPhotoUploadError('Seules les images sont acceptées');
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                setPhotoUploadError('La taille maximale par image est de 5MB');
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            setSelectedFiles(validFiles);
            setPreviewImages(validFiles.map(file => ({
                file: file,
                url: URL.createObjectURL(file)
            })));
        }
    };

    const handleUploadPhotos = async () => {
        if (selectedFiles.length === 0) {
            setPhotoUploadError('Veuillez sélectionner au moins une photo');
            return;
        }

        try {
            await driverService.uploadPhotos(id, selectedFiles);
            setOpenPhotoDialog(false);
            setSelectedFiles([]);
            setPreviewImages([]);
            fetchDriverData();
        } catch (err) {
            setPhotoUploadError("Erreur lors de l'upload des photos: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    const handleDeletePhoto = async (photoIndex) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
            try {
                await driverService.deletePhoto(id, photoIndex);
                fetchDriverData();
                // Réinitialiser l'index si on supprime la dernière photo
                if (photoIndex === currentPhotoIndex && currentPhotoIndex > 0) {
                    setCurrentPhotoIndex(currentPhotoIndex - 1);
                }
            } catch (err) {
                toast.error("Erreur lors de la suppression de la photo: " + (err.response?.data?.message || err.message));
                console.error("Erreur:", err);
            }
        }
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getVehicleIcon = (type) => {
        if (type === 'moto') {
            return <Bike className="h-4 w-4 text-blue-500" />;
        } else {
            return <Car className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (departureDate) => {
        if (departureDate) {
            return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Ancien</Badge>;
        } else {
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge>;
        }
    };

    const getVehicleStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge>;
            case 'maintenance':
                return <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">Maintenance</Badge>;
            case 'inactive':
                return <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Inactif</Badge>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col space-y-3">
                    <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className="container">
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error || "Chauffeur non trouvé"}</AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate('/drivers')}
                    className="mt-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Button>
            </div>
        );
    }

    return (
        <div className="container max-w-6xl py-4">
            <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="mb-4 mr-4" // ← Ajout de mr-4 (margin-right: 1rem)
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
            </Button>
            <Button
                variant="outline"
                onClick={() => navigate('/drivers')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
            </Button>

            {/* Photo Carousel */}
            <div className="mb-6 relative w-full h-80 rounded-lg overflow-hidden">
                {driver.photos && driver.photos.length > 0 ? (
                    <>
                        <button
                            onClick={() => setLightboxOpen(true)}
                            className="w-full h-full focus:outline-none"
                        >
                            <img
                                src={driver.photos[currentPhotoIndex]?.startsWith('http')
                                    ? driver.photos[currentPhotoIndex]
                                    : `${API_BASE_URL}/${driver.photos[currentPhotoIndex]}`}
                                alt={`Photo du chauffeur ${driver.firstName} ${driver.lastName}`}
                                className="w-full h-full object-cover cursor-zoom-in"
                            />
                        </button>

                        {/* Lightbox Dialog */}
                        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img
                                        src={driver.photos[currentPhotoIndex]?.startsWith('http')
                                            ? driver.photos[currentPhotoIndex]
                                            : `${API_BASE_URL}/${driver.photos[currentPhotoIndex]}`}
                                        alt={`Photo du chauffeur ${driver.firstName} ${driver.lastName}`}
                                        className="max-w-full max-h-full object-contain"
                                    />

                                    <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
                                        <X className="h-6 w-6" />
                                    </DialogClose>

                                    {/* Navigation buttons */}
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
                                        {currentPhotoIndex + 1} / {driver.photos.length}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Navigation buttons */}
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
                            {currentPhotoIndex + 1} / {driver.photos.length}
                        </div>

                        {/* Add photo button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-4 right-4 bg-white/70 hover:bg-white"
                            onClick={() => setOpenPhotoDialog(true)}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Ajouter
                        </Button>
                    </>
                ) : (
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-gray-500">Aucune photo disponible</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setOpenPhotoDialog(true)}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Ajouter des photos
                        </Button>
                    </div>
                )}
            </div>

            {/* Driver Details Container */}
            <div className="bg-card text-card-foreground rounded-lg p-6 border">
                {/* Header with title and edit button */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {`${driver.firstName} ${driver.lastName}`}
                        </h1>
                        <p className="text-gray-500">Détails du chauffeur</p>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={handleEdit}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                        </Button>
                    </div>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                    {/* Statut */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-500">Statut:</span>
                                {getStatusBadge(driver.departureDate)}
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Informations personnelles */}
                    <div className="py-3">
                        <h3 className="text-lg font-medium mb-2">Informations personnelles</h3>
                        <Separator className="mb-4 bg-border" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Prénom</p>
                                <p>{driver.firstName || "Non spécifié"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Nom</p>
                                <p>{driver.lastName || "Non spécifié"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date de naissance</p>
                                <p>{driver.birthDate ? format(new Date(driver.birthDate), 'dd MMMM yyyy', { locale: fr }) : "Non spécifiée"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Adresse</p>
                                <p>{driver.address || "Non spécifiée"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Téléphone</p>
                                <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                                    <p>{driver.phoneNumber || "Non spécifié"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Informations professionnelles */}
                    <div className="py-3">
                        <h3 className="text-lg font-medium mb-2">Informations professionnelles</h3>
                        <Separator className="mb-4 bg-border" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date d'embauche</p>
                                <p>{driver.hireDate ? format(new Date(driver.hireDate), 'dd MMMM yyyy', { locale: fr }) : "Non spécifiée"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date de départ</p>
                                <p>{driver.departureDate ? format(new Date(driver.departureDate), 'dd MMMM yyyy', { locale: fr }) : "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Numéro de permis</p>
                                <p>{driver.licenseNumber || "Non spécifié"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date d'expiration du permis</p>
                                <p>{driver.licenseExpiry ? format(new Date(driver.licenseExpiry), 'dd MMMM yyyy', { locale: fr }) : "Non spécifiée"}</p>
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Véhicule assigné */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-500">Véhicule assigné:</span>
                                {vehicle ? (
                                    <div className="flex items-center">
                                        {getVehicleIcon(vehicle.type)}
                                        <span className="ml-2">
                                            {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                                        </span>
                                        {getVehicleStatusBadge(vehicle.status)}
                                    </div>
                                ) : (
                                    <Badge variant="outline">Non assigné</Badge>
                                )}
                            </div>
                            {vehicle && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/vehicles/${vehicle._id}`)}
                                >
                                    Voir le véhicule
                                </Button>
                            )}
                        </div>
                    </div>
                    <Separator />

                    {/* Notes */}
                    <div className="py-3">
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-500">Notes:</span>
                            <p className="text-sm">{driver.notes || 'Aucune note pour ce chauffeur.'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog pour ajouter des photos */}
            <Dialog open={openPhotoDialog} onOpenChange={setOpenPhotoDialog}>
                <DialogContent className="max-w-[95vw] w-[900px] h-[600px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Gérer les photos du chauffeur</DialogTitle>
                        <DialogDescription>
                            {driver?.photos?.length || 0} photo(s) existante(s)
                        </DialogDescription>
                    </DialogHeader>

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

                    <div className="flex-1 overflow-auto space-y-4">
                        {/* Section des photos existantes */}
                        {driver?.photos && driver.photos.length > 0 && (
                            <div className="space-y-2">
                                <Label>Photos existantes</Label>
                                <div className="border rounded-md p-2">
                                    <div className="grid grid-cols-3 gap-3">
                                        {driver.photos.map((photo, index) => (
                                            <div key={index} className="relative group h-40">
                                                <img
                                                    src={photo.startsWith('http') ? photo : `${API_BASE_URL}/${photo}`}
                                                    alt={`Photo ${index + 1}`}
                                                    className="rounded-md w-full h-full object-cover"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeletePhoto(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                    {index + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(driver?.photos?.length > 0 && previewImages.length > 0) && (
                            <Separator className="my-2" />
                        )}

                        {/* Section pour ajouter de nouvelles photos */}
                        <div className="space-y-2">
                            <Label htmlFor="picture">Ajouter de nouvelles photos</Label>
                            <Input
                                id="picture"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                                className="cursor-pointer"
                            />
                        </div>

                        {photoUploadError && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertDescription>{photoUploadError}</AlertDescription>
                            </Alert>
                        )}

                        {previewImages.length > 0 && (
                            <div className="space-y-2">
                                <Label>Nouvelles photos à ajouter</Label>
                                <div className="border rounded-md p-2">
                                    <div className="grid grid-cols-3 gap-3">
                                        {previewImages.map((preview, index) => (
                                            <div key={index} className="relative group h-40">
                                                <img
                                                    src={preview.url}
                                                    alt={`Nouvelle photo ${index + 1}`}
                                                    className="rounded-md w-full h-full object-cover"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-7 w-7"
                                                    onClick={() => {
                                                        URL.revokeObjectURL(preview.url);
                                                        setPreviewImages(prev => prev.filter((_, i) => i !== index));
                                                        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute bottom-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
                                                    Nouveau
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOpenPhotoDialog(false);
                                setSelectedFiles([]);
                                setPreviewImages([]);
                                setPhotoUploadError('');
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleUploadPhotos}
                            disabled={selectedFiles.length === 0}
                            className="ml-2"
                        >
                            Télécharger {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modale de modification */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Modifier les informations du chauffeur</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations du chauffeur ci-dessous.
                        </DialogDescription>
                    </DialogHeader>
                    <DriverForm
                        driver={driver}
                        vehicles={vehicle ? [vehicle] : []}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <div className="mt-8">
                <ChartDriverRevenue driverId={id} />
            </div>
        </div>
    );
};

export default DriverDetail;