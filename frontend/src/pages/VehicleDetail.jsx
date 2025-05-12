// src/pages/VehicleDetail.jsx
import React, { useState, useEffect } from 'react';
import {
    DialogClose,
} from "@/components/ui/dialog";
import { Info as InfoIcon } from "lucide-react";
import { Lightbox } from "../components/Lightbox";
import { ChartVehicleRevenue } from '@/components/ChartVehicleRevenue';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleService } from '../services/vehicleService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {

    ArrowLeft,
    Edit,
    User,
    UserMinus,
    Camera,

    Wrench,
    CheckCircle2,
    XCircle,
    X,

    ChevronLeft,
    ChevronRight
} from 'lucide-react';


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_BASE_URL = VITE_API_URL = "https://flotte.onrender.com";



const VehicleDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    // États pour le carrousel
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // États pour les dialogs

    const [openTargetDialog, setOpenTargetDialog] = useState(false);
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);

    // États pour les formulaires
    const [newStatus, setNewStatus] = useState('');
    const [dailyTarget, setDailyTarget] = useState('');

    // État pour les photos
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [photoUploadError, setPhotoUploadError] = useState('');

    // État pour le formulaire d'édition
    const [editFormData, setEditFormData] = useState({
        type: '',
        licensePlate: '',
        brand: '',
        model: '',
        registrationDate: '',
        serviceEntryDate: '',
        status: '',
        notes: '',
        dailyIncomeTarget: ''
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (lightboxOpen) {
                if (e.key === 'ArrowRight') {
                    nextPhoto();
                } else if (e.key === 'ArrowLeft') {
                    prevPhoto();
                } else if (e.key === 'Escape') {
                    setLightboxOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [lightboxOpen, currentPhotoIndex, vehicle?.photos]);

    // Récupération des données du véhicule
    useEffect(() => {
        const fetchVehicleDetails = async () => {
            setLoading(true);
            try {
                const response = await vehicleService.getById(id);
                const vehicleData = response.data;

                setVehicle(vehicleData);
                setNewStatus(vehicleData.status);
                setDailyTarget(vehicleData.dailyIncomeTarget || '');

                setEditFormData({
                    ...vehicleData,
                    registrationDate: vehicleData.registrationDate ?
                        format(new Date(vehicleData.registrationDate), 'yyyy-MM-dd') : '',
                    serviceEntryDate: vehicleData.serviceEntryDate ?
                        format(new Date(vehicleData.serviceEntryDate), 'yyyy-MM-dd') : ''
                });

                setError(null);
            } catch (err) {
                setError("Erreur lors du chargement des détails du véhicule: " +
                    (err.response?.data?.message || err.message));
                console.error("Erreur:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleDetails();
    }, [id, refreshKey]);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
        } catch (e) {
            return dateString;
        }
    };

    // Actions sur le véhicule
    const handleSetDailyTarget = async () => {
        try {
            await vehicleService.setDailyTarget(id, dailyTarget);
            setOpenTargetDialog(false);
            setRefreshKey(oldKey => oldKey + 1);
        } catch (err) {
            alert("Erreur lors de la définition de l'objectif: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    // Navigation du carrousel
    const nextPhoto = () => {
        if (vehicle?.photos && vehicle.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === vehicle.photos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevPhoto = () => {
        if (vehicle?.photos && vehicle.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === 0 ? vehicle.photos.length - 1 : prevIndex - 1
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
            setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);

            const newPreviewImages = validFiles.map(file => ({
                file: file,
                url: URL.createObjectURL(file)
            }));

            setPreviewImages(prevImages => [...prevImages, ...newPreviewImages]);
        }
    };

    const removePreviewImage = (index) => {
        URL.revokeObjectURL(previewImages[index].url);
        setPreviewImages(prevImages => prevImages.filter((_, i) => i !== index));
        setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleUploadPhotos = async () => {
        if (selectedFiles.length === 0) {
            setPhotoUploadError('Veuillez sélectionner au moins une photo');
            return;
        }

        try {
            await vehicleService.uploadPhotos(id, selectedFiles);
            setOpenPhotoDialog(false);
            setSelectedFiles([]);
            setPreviewImages([]);
            setRefreshKey(oldKey => oldKey + 1);
        } catch (err) {
            setPhotoUploadError("Erreur lors de l'upload des photos: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    const handleDeletePhoto = async (photoIndex) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
            try {
                await vehicleService.deletePhoto(id, photoIndex);
                setRefreshKey(oldKey => oldKey + 1);
            } catch (err) {
                alert("Erreur lors de la suppression de la photo: " + (err.response?.data?.message || err.message));
                console.error("Erreur:", err);
            }
        }
    };

    // Édition des informations du véhicule
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData({ ...editFormData, [name]: value });
    };

    const handleUpdateVehicle = async () => {
        try {
            await vehicleService.update(id, editFormData);
            setOpenEditDialog(false);
            setRefreshKey(oldKey => oldKey + 1);
        } catch (err) {
            alert("Erreur lors de la mise à jour du véhicule: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    // Rendu du statut avec badge
    const renderStatus = (status) => {
        let variant = 'default';
        let icon = null;

        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Actif</Badge>;

            case 'inactive':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Inactif</Badge>;
            case 'maintenance':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">En maintenance</Badge>;
            default:
                variant = 'default';
        }

        return (
            <Badge variant={variant} className="px-3 py-1 text-sm">
                {icon}
                {status}
            </Badge>
        );
    };

    if (loading && !vehicle) {
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

    if (error && !vehicle) {
        return (
            <div className="container">
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate('/vehicles')}
                    className="mt-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Button>
            </div>
        );
    }

    if (!vehicle) return null;

    return (
        <div className="bg-card text-card-foreground rounded-lg p-6 border">
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
                onClick={() => navigate('/vehicles')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
            </Button>
            {/* Photo Carousel */}
            <div className="mb-6 relative w-full h-80 rounded-lg overflow-hidden">
                {vehicle.photos && vehicle.photos.length > 0 ? (
                    <>
                        <button
                            onClick={() => setLightboxOpen(true)}
                            className="w-full h-full focus:outline-none"
                        >
                            <img
                                src={vehicle.photos[currentPhotoIndex]?.startsWith('http')
                                    ? vehicle.photos[currentPhotoIndex]
                                    : `${API_BASE_URL}/${vehicle.photos[currentPhotoIndex]}`}
                                alt={`Photo du véhicule ${vehicle.brand} ${vehicle.model}`}
                                className="w-full h-full object-cover cursor-zoom-in"
                            />
                        </button>


                        {/* Lightbox Dialog */}
                        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img
                                        src={vehicle.photos[currentPhotoIndex]?.startsWith('http')
                                            ? vehicle.photos[currentPhotoIndex]
                                            : `${API_BASE_URL}/${vehicle.photos[currentPhotoIndex]}`}
                                        alt={`Photo du véhicule ${vehicle.brand} ${vehicle.model}`}
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
                                        {currentPhotoIndex + 1} / {vehicle.photos.length}
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
                            {currentPhotoIndex + 1} / {vehicle.photos.length}
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

            {/* Vehicle Details Container */}
            <div className="bg-card text-card-foreground rounded-lg p-6 border">
                {/* Header with title and edit button */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {`${vehicle.brand} ${vehicle.model} - ${vehicle.licensePlate}`}
                        </h1>
                        <p className="text-gray-500">Détails du véhicule</p>
                    </div>
                    <div className="flex space-x-2">

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setOpenEditDialog(true)}
                        >
                            <Edit className="h-4 w-4" />
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
                                {renderStatus(vehicle.status)}
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Chauffeur */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Chauffeur:</span>
                            <div className="flex items-center gap-2">
                                <span>
                                    {vehicle.currentDriver
                                        ? `${vehicle.currentDriver.firstName} ${vehicle.currentDriver.lastName}`
                                        : 'Non assigné'}
                                </span>

                                {vehicle.currentDriver && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/drivers/${vehicle.currentDriver._id}`)}
                                    >
                                        Voir le chauffeur
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Type */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Type:</span>
                            <span>{vehicle.type === 'taxi' ? 'Taxi' : 'Moto'}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Immatriculation */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Immatriculation:</span>
                            <span>{vehicle.licensePlate}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Marque */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Marque:</span>
                            <span>{vehicle.brand}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Modèle */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Modèle:</span>
                            <span>{vehicle.model}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Date d'immatriculation */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Date d'immatriculation:</span>
                            <span>{formatDate(vehicle.registrationDate)}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Date de mise en service */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Date de mise en service:</span>
                            <span>{formatDate(vehicle.serviceEntryDate)}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Objectif journalier */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Objectif journalier:</span>
                            <div className="flex items-center space-x-2">
                                <span>{vehicle.dailyIncomeTarget ? `${vehicle.dailyIncomeTarget.toLocaleString()} FCFA` : 'Non défini'}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                        setDailyTarget(vehicle.dailyIncomeTarget || '');
                                        setOpenTargetDialog(true);
                                    }}
                                >
                                    <Edit className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Notes */}
                    <div className="py-3">
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-500">Notes:</span>
                            <p className="text-sm">{vehicle.notes || 'Aucune note pour ce véhicule.'}</p>
                        </div>
                    </div>
                </div>
            </div>



            {/* Dialog pour définir l'objectif journalier */}
            <Dialog open={openTargetDialog} onOpenChange={setOpenTargetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Définir l'objectif journalier</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="target" className="text-right">
                                Montant (FCFA)
                            </Label>
                            <Input
                                id="target"
                                type="number"
                                value={dailyTarget}
                                onChange={(e) => setDailyTarget(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenTargetDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSetDailyTarget}>Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>




            {/* Dialog pour ajouter des photos */}
            <Dialog open={openPhotoDialog} onOpenChange={setOpenPhotoDialog}>
                <DialogContent className="max-w-[95vw] w-[900px] h-[600px] flex flex-col"> {/* Augmentation de la taille */}
                    <DialogHeader>
                        <DialogTitle>Gérer les photos du véhicule</DialogTitle>
                        <DialogDescription>
                            {vehicle?.photos?.length || 0} photo(s) existante(s)
                        </DialogDescription>
                    </DialogHeader>

                    {/* Message de conseil réduit pour gagner de l'espace */}
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

                    {/* Contenu principal avec scroll */}
                    <div className="flex-1 overflow-auto space-y-4"> {/* Flex-1 pour prendre tout l'espace disponible */}
                        {/* Section des photos existantes */}
                        {vehicle?.photos && vehicle.photos.length > 0 && (
                            <div className="space-y-2">
                                <Label>Photos existantes</Label>
                                <div className="border rounded-md p-2">
                                    <div className="grid grid-cols-3 gap-3"> {/* Espacement augmenté */}
                                        {vehicle.photos.map((photo, index) => (
                                            <div key={index} className="relative group h-40"> {/* Hauteur augmentée */}
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

                        {/* Séparateur seulement si les deux sections existent */}
                        {(vehicle?.photos?.length > 0 && previewImages.length > 0) && (
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
                                                    onClick={() => removePreviewImage(index)}
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

            {/* Dialog pour modifier le véhicule */}
            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DialogContent className="sm:max-w-[625px]">

                    <DialogHeader>
                        <DialogTitle>Modifier le véhicule</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dailyIncomeTarget" className="required">Objectif journalier (FCFA)</Label>
                                <Input
                                    id="dailyIncomeTarget"
                                    name="dailyIncomeTarget"
                                    type="number"
                                    value={editFormData.dailyIncomeTarget}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type" className="required">Type de véhicule</Label>
                                <Select
                                    name="type"
                                    value={editFormData.type}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}
                                    required
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
                                <Label htmlFor="licensePlate" className="required">Immatriculation</Label>
                                <Input
                                    id="licensePlate"
                                    name="licensePlate"
                                    value={editFormData.licensePlate}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="brand" className="required">Marque</Label>
                                <Input
                                    id="brand"
                                    name="brand"
                                    value={editFormData.brand}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="model" className="required">Modèle</Label>
                                <Input
                                    id="model"
                                    name="model"
                                    value={editFormData.model}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="registrationDate" className="required">Date d'immatriculation</Label>
                                <Input
                                    id="registrationDate"
                                    name="registrationDate"
                                    type="date"
                                    value={editFormData.registrationDate}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serviceEntryDate" className="required">Date de mise en service</Label>
                                <Input
                                    id="serviceEntryDate"
                                    name="serviceEntryDate"
                                    type="date"
                                    value={editFormData.serviceEntryDate}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status" className="required">Statut</Label>
                                <Select
                                    name="status"
                                    value={editFormData.status}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOpenEditDialog(false);
                                setEditFormData({});
                            }} className="mr-2"
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleUpdateVehicle}>Modifier</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="mt-8">
                <ChartVehicleRevenue vehicleId={id} />
            </div>
        </div>
    );
}

export default VehicleDetail