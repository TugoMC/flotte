// src/pages/Maintenances/MaintenanceDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InfoIcon } from 'lucide-react';
import { maintenanceService } from '@/services/api';
import { vehicleService } from '@/services/api';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Edit,
    Camera,
    Wrench,
    CheckCircle2,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE_URL = import.meta.env?.VITE_API_PHOTO;

const MaintenanceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [maintenance, setMaintenance] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [photoUploadError, setPhotoUploadError] = useState('');

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
        description: '',
        completed: false
    });

    useEffect(() => {
        const fetchMaintenanceDetails = async () => {
            setLoading(true);
            try {
                const response = await maintenanceService.getById(id);
                const maintenanceData = response.data;
                setMaintenance(maintenanceData);

                // Récupérer les détails du véhicule associé
                if (maintenanceData.vehicle) {
                    const vehicleRes = await vehicleService.getById(maintenanceData.vehicle._id);
                    setVehicle(vehicleRes.data);
                }

                // Remplir le formulaire
                setFormData({
                    vehicle: maintenanceData.vehicle?._id || '',
                    maintenanceType: maintenanceData.maintenanceType || 'oil_change',
                    maintenanceNature: maintenanceData.maintenanceNature || 'preventive',
                    maintenanceDate: maintenanceData.maintenanceDate ?
                        format(new Date(maintenanceData.maintenanceDate), 'yyyy-MM-dd') : '',
                    completionDate: maintenanceData.completionDate ?
                        format(new Date(maintenanceData.completionDate), 'yyyy-MM-dd') : '',
                    cost: maintenanceData.cost || '',
                    duration: maintenanceData.duration || '',
                    technicianName: maintenanceData.technicianName || '',
                    notes: maintenanceData.notes || '',
                    description: maintenanceData.description || '',
                    completed: maintenanceData.completed || false
                });

                setError(null);
            } catch (err) {
                setError("Erreur lors du chargement des détails de la maintenance: " +
                    (err.response?.data?.message || err.message));
                console.error("Erreur:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMaintenanceDetails();
    }, [id, refreshKey]);

    const [formErrors, setFormErrors] = useState({
        vehicle: false,
        maintenanceType: false,
        maintenanceNature: false,
        maintenanceDate: false,
        duration: false
    });

    const validateForm = () => {
        const errors = {
            vehicle: !formData.vehicle,
            maintenanceType: !formData.maintenanceType,
            maintenanceNature: !formData.maintenanceNature,
            maintenanceDate: !formData.maintenanceDate
        };

        setFormErrors(errors);
        return !Object.values(errors).some(error => error);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
        } catch (e) {
            return dateString;
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleUpdateMaintenance = async () => {
        // Validation des champs obligatoires
        if (!validateForm()) {
            toast.error("Veuillez remplir tous les champs obligatoires");
            return;
        }

        // Vérification des valeurs numériques
        if (formData.cost && formData.cost < 0) {
            toast.error("Le coût ne peut pas être négatif");
            return;
        }

        if (formData.duration && formData.duration <= 0) {
            toast.error("La durée doit être positive");
            return;
        }

        // Vérification des dates
        if (formData.completionDate && formData.maintenanceDate &&
            new Date(formData.completionDate) < new Date(formData.maintenanceDate)) {
            toast.error("La date de fin ne peut pas être antérieure à la date de début");
            return;
        }

        try {
            await maintenanceService.update(id, formData);
            toast.success("Maintenance mise à jour avec succès");
            setOpenEditDialog(false);
            setRefreshKey(oldKey => oldKey + 1);
        } catch (err) {
            console.error("Détails de l'erreur:", err.response?.data);
            toast.error(`Erreur lors de la mise à jour: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleCompleteMaintenance = async () => {
        try {
            await maintenanceService.completeMaintenance(id);
            toast.success("Maintenance marquée comme terminée");
            setRefreshKey(oldKey => oldKey + 1);
        } catch (err) {
            toast.error("Erreur: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    const handleDeleteMaintenance = async () => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette maintenance ?")) {
            try {
                await maintenanceService.delete(id);
                toast.success("Maintenance supprimée avec succès");
                navigate('/maintenances');
            } catch (err) {
                toast.error("Erreur lors de la suppression: " + (err.response?.data?.message || err.message));
                console.error("Erreur:", err);
            }
        }
    };

    // Navigation du carrousel
    const nextPhoto = () => {
        if (maintenance?.photos && maintenance.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === maintenance.photos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevPhoto = () => {
        if (maintenance?.photos && maintenance.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === 0 ? maintenance.photos.length - 1 : prevIndex - 1
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
            await maintenanceService.uploadPhotos(id, selectedFiles);
            toast.success("Photos ajoutées avec succès");
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
                await maintenanceService.deletePhoto(id, photoIndex);
                toast.success("Photo supprimée avec succès");
                setRefreshKey(oldKey => oldKey + 1);
            } catch (err) {
                toast.error("Erreur lors de la suppression: " + (err.response?.data?.message || err.message));
                console.error("Erreur:", err);
            }
        }
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

    const renderStatus = (completed) => {
        return completed ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Terminée
            </Badge>
        ) : (
            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                <Wrench className="w-4 h-4 mr-1" />
                En cours
            </Badge>
        );
    };

    if (loading && !maintenance) {
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

    if (error && !maintenance) {
        return (
            <div className="container">
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate('/maintenances')}
                    className="mt-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Button>
            </div>
        );
    }

    if (!maintenance) return null;

    return (
        <div className="container max-w-6xl py-4">
            <div className="flex space-x-2 mb-4">
                <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                </Button>
                <Button
                    variant="outline"
                    onClick={() => navigate('/maintenances')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la liste
                </Button>
            </div>

            {/* Photo Carousel */}
            <div className="mb-6 relative w-full h-80 rounded-lg overflow-hidden">
                {maintenance.photos && maintenance.photos.length > 0 ? (
                    <>
                        <button
                            onClick={() => setLightboxOpen(true)}
                            className="w-full h-full focus:outline-none"
                        >
                            <img
                                src={maintenance.photos[currentPhotoIndex]?.startsWith('http')
                                    ? maintenance.photos[currentPhotoIndex]
                                    : `${API_BASE_URL}/${maintenance.photos[currentPhotoIndex]}`}
                                alt={`Photo de la maintenance`}
                                className="w-full h-full object-cover cursor-zoom-in"
                            />
                        </button>

                        {/* Lightbox Dialog */}
                        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img
                                        src={maintenance.photos[currentPhotoIndex]?.startsWith('http')
                                            ? maintenance.photos[currentPhotoIndex]
                                            : `${API_BASE_URL}/${maintenance.photos[currentPhotoIndex]}`}
                                        alt={`Photo de la maintenance`}
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
                                        {currentPhotoIndex + 1} / {maintenance.photos.length}
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
                            {currentPhotoIndex + 1} / {maintenance.photos.length}
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

            {/* Maintenance Details Container */}
            <div className="bg-card text-card-foreground rounded-lg p-6 border">
                {/* Header with title and action buttons */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Maintenance #{maintenance._id.slice(-6).toUpperCase()}
                        </h1>
                        <p className="text-gray-500">Détails de la maintenance</p>
                    </div>
                    <div className="flex space-x-2">


                        <Button
                            variant="outline"
                            onClick={() => setOpenEditDialog(true)}
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
                                {renderStatus(maintenance.completed)}
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Véhicule */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Véhicule:</span>
                            <span>{maintenance.vehicle.brand} - {maintenance.vehicle.model} - {maintenance.vehicle.licensePlate}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Type */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Type:</span>
                            <span>{getTypeLabel(maintenance.maintenanceType)}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Nature */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Nature:</span>
                            <span>{getNatureLabel(maintenance.maintenanceNature)}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Date de début */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Date de début de maintenance:</span>
                            <span>{formatDate(maintenance.maintenanceDate)}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Date de fin */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Date de fin de maintenance:</span>
                            <span>{maintenance.completionDate ? formatDate(maintenance.completionDate) : '—'}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Technicien */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Technicien:</span>
                            <span>{maintenance.technicianName || '—'}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Coût */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Coût:</span>
                            <span>{maintenance.cost ? `${maintenance.cost} FCFA` : '—'}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Durée */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Durée d'immobilisation du véhicule (Sans travailler):</span>
                            <span>{maintenance.duration ? `${maintenance.duration} jours` : '—'}</span>
                        </div>
                    </div>
                    <Separator />

                    {/* Notes */}
                    <div className="py-3">
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-500">Notes:</span>
                            <p className="text-sm">{maintenance.notes || 'Aucune note pour cette maintenance.'}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Description */}
                    <div className="py-3">
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-500">Description:</span>
                            <p className="text-sm">{maintenance.description || 'Aucune description pour cette maintenance.'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog pour ajouter des photos */}
            <Dialog open={openPhotoDialog} onOpenChange={setOpenPhotoDialog}>
                <DialogContent className="max-w-[95vw] w-[900px] h-[600px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Gérer les photos de la maintenance</DialogTitle>
                        <DialogDescription>
                            {maintenance?.photos?.length || 0} photo(s) existante(s)
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
                        {maintenance?.photos && maintenance.photos.length > 0 && (
                            <div className="space-y-2">
                                <Label>Photos existantes</Label>
                                <div className="border rounded-md p-2">
                                    <div className="grid grid-cols-3 gap-3">
                                        {maintenance.photos.map((photo, index) => (
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

                        {(maintenance?.photos?.length > 0 && previewImages.length > 0) && (
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

            {/* Dialog pour modifier la maintenance */}
            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Modifier la maintenance</DialogTitle>
                        <DialogDescription>
                            Modifiez les détails de cette maintenance. Les champs marqués d'un * sont obligatoires.
                            <br />
                            Pour modifier la date de fin, changez le statut de la maintenance à "Terminée".
                            <br />
                            La durée d'immobilisation n'a aucun lien avec la periode de maintenance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicle" className="required">Véhicule</Label>
                                <Select
                                    name="vehicle"
                                    value={formData.vehicle}
                                    onValueChange={(value) => setFormData({ ...formData, vehicle: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un véhicule" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicle && (
                                            <SelectItem value={vehicle._id}>
                                                {`${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model}`}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maintenanceType" className="required">Type de maintenance</Label>
                                <Select
                                    name="maintenanceType"
                                    value={formData.maintenanceType}
                                    onValueChange={(value) => setFormData({ ...formData, maintenanceType: value })}
                                    required
                                >
                                    <SelectTrigger className={formErrors.maintenanceType ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="oil_change">Vidange</SelectItem>
                                        <SelectItem value="tire_replacement">Changement pneus</SelectItem>
                                        <SelectItem value="engine">Moteur</SelectItem>
                                        <SelectItem value="other">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.maintenanceType && (
                                    <p className="text-sm text-red-500">Ce champ est obligatoire</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maintenanceNature" className="required">Nature de maintenance</Label>
                                <Select
                                    name="maintenanceNature"
                                    value={formData.maintenanceNature}
                                    onValueChange={(value) => setFormData({ ...formData, maintenanceNature: value })}
                                    required
                                >
                                    <SelectTrigger className={formErrors.maintenanceNature ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Sélectionner une nature" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="preventive">Préventive</SelectItem>
                                        <SelectItem value="corrective">Corrective</SelectItem>
                                        <SelectItem value="predictive">Prédictive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.maintenanceNature && (
                                    <p className="text-sm text-red-500">Ce champ est obligatoire</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="technicianName" className="required">Technicien</Label>
                                <Input
                                    id="technicianName"
                                    name="technicianName"
                                    value={formData.technicianName}
                                    onChange={handleInputChange}
                                    placeholder="Nom du technicien ou structure"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maintenanceDate" className="required">Date de début de maintenance</Label>
                                <Input
                                    id="maintenanceDate"
                                    name="maintenanceDate"
                                    type="date"
                                    value={formData.maintenanceDate}
                                    onChange={handleInputChange}
                                    className={formErrors.maintenanceDate ? "border-red-500" : ""}
                                    required
                                />
                                {formErrors.maintenanceDate && (
                                    <p className="text-sm text-red-500">Ce champ est obligatoire</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="completionDate">Date de fin de maintenance</Label>
                                <Input
                                    id="completionDate"
                                    name="completionDate"
                                    type="date"
                                    value={formData.completionDate}
                                    onChange={handleInputChange}
                                    disabled={!formData.completed}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cost">Coût (FCFA)</Label>
                                <Input
                                    id="cost"
                                    name="cost"
                                    type="number"
                                    value={formData.cost}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration" className="required">Durée d'immobilisation du véhicule (Sans travailler) en jours</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    type="number"
                                    value={formData.duration}
                                    onChange={handleInputChange}
                                    className={formErrors.maintenanceDate ? "border-red-500" : ""}
                                    required
                                />

                                {formErrors.maintenanceDate && (
                                    <p className="text-sm text-red-500">Ce champ est obligatoire</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="completed" className="required">Statut</Label>
                                <Select
                                    name="completed"
                                    value={formData.completed ? 'true' : 'false'}
                                    onValueChange={(value) => setFormData({ ...formData, completed: value === 'true' })}
                                    required
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
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm  placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={5}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm  placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
                        <Button
                            variant="outline"
                            onClick={() => setOpenEditDialog(false)}
                            className="mr-2"
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleUpdateMaintenance}>
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default MaintenanceDetail;