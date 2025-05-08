// src/pages/PaymentDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { paymentService } from '@/services/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    Receipt,
    Calendar,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    User,
    Info,
    Camera,
    Clock,
    CheckCircle,
    AlertCircle,
    XCircle,
    CreditCard,
    Banknote,
    FileText
} from 'lucide-react';
import PaymentForm from '@/components/forms/PaymentForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

const PaymentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // États
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('pending');

    // États pour le carrousel de photos
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [photoUploadError, setPhotoUploadError] = useState('');

    useEffect(() => {
        fetchPaymentData();
    }, [id]);

    const safeFormatDate = (dateString, dateFormat = 'dd MMMM yyyy') => {
        if (!dateString) return "Non spécifiée";

        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? "Non spécifiée" : format(date, dateFormat, { locale: fr });
        } catch {
            return "Non spécifiée";
        }
    };

    const fetchPaymentData = async () => {
        try {
            setLoading(true);
            const paymentRes = await paymentService.getById(id);
            setPayment(paymentRes.data);
        } catch (err) {
            console.error('Erreur lors de la récupération des données du paiement:', err);
            setError("Impossible de charger les informations du paiement");
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        if (!payment) return;
        setIsFormOpen(true);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        toast.success("Informations du paiement mises à jour");
        fetchPaymentData();
    };

    const handleStatusChange = async () => {
        try {
            await paymentService.changeStatus(id, newStatus);
            setIsStatusDialogOpen(false);
            toast.success(`Statut du paiement mis à jour: ${getStatusLabel(newStatus)}`);
            fetchPaymentData();
        } catch (err) {
            toast.error("Erreur lors du changement de statut: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    // Navigation du carrousel
    const nextPhoto = () => {
        if (payment?.photos && payment.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === payment.photos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevPhoto = () => {
        if (payment?.photos && payment.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === 0 ? payment.photos.length - 1 : prevIndex - 1
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
            await paymentService.uploadPhotos(id, selectedFiles);
            setOpenPhotoDialog(false);
            setSelectedFiles([]);
            setPreviewImages([]);
            fetchPaymentData();
        } catch (err) {
            setPhotoUploadError("Erreur lors de l'upload des photos: " + (err.response?.data?.message || err.message));
            console.error("Erreur:", err);
        }
    };

    const handleDeletePhoto = async (photoIndex) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
            try {
                await paymentService.deletePhoto(id, photoIndex);
                fetchPaymentData();
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

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'En attente';
            case 'confirmed': return 'Confirmé';
            case 'rejected': return 'Rejeté';
            case 'completed': return 'Complété';
            case 'cancelled': return 'Annulé';
            default: return status;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>;
            case 'confirmed':
                return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">Confirmé</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complété</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejeté</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Annulé</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentTypeIcon = (type) => {
        switch (type) {
            case 'cash':
                return <Banknote className="h-4 w-4 text-green-600" />;
            case 'card':
                return <CreditCard className="h-4 w-4 text-blue-600" />;
            case 'transfer':
                return <FileText className="h-4 w-4 text-gray-600" />;
            default:
                return <Receipt className="h-4 w-4 text-gray-600" />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getDriverInfo = (payment) => {
        if (!payment?.schedule?.driver) return 'Non spécifié';
        return `${payment.schedule.driver.firstName || ''} ${payment.schedule.driver.lastName || ''}`.trim();
    };

    const getVehicleInfo = (payment) => {
        if (!payment?.schedule?.vehicle) return 'Non spécifié';
        return `${payment.schedule.vehicle.brand || ''} ${payment.schedule.vehicle.model || ''} ${payment.schedule.vehicle.licensePlate ? `(${payment.schedule.vehicle.licensePlate})` : ''}`.trim();
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

    if (error || !payment) {
        return (
            <div className="container">
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error || "Paiement non trouvé"}</AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate('/payments')}
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
                onClick={() => navigate('/payments')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
            </Button>



            {/* Photo Carousel */}
            <div className="mb-6 relative w-full h-80 rounded-lg overflow-hidden">
                {payment.photos && payment.photos.length > 0 ? (
                    <>
                        <button
                            onClick={() => setLightboxOpen(true)}
                            className="w-full h-full focus:outline-none"
                        >
                            <img
                                src={payment.photos[currentPhotoIndex]?.startsWith('http')
                                    ? payment.photos[currentPhotoIndex]
                                    : `${API_BASE_URL}/${payment.photos[currentPhotoIndex]}`}
                                alt={`Photo du reçu de paiement ${payment.referenceNumber || payment._id}`}
                                className="w-full h-full object-cover cursor-zoom-in"
                            />
                        </button>

                        {/* Lightbox Dialog */}
                        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img
                                        src={payment.photos[currentPhotoIndex]?.startsWith('http')
                                            ? payment.photos[currentPhotoIndex]
                                            : `${API_BASE_URL}/${payment.photos[currentPhotoIndex]}`}
                                        alt={`Photo du reçu de paiement ${payment.referenceNumber || payment._id}`}
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
                                        {currentPhotoIndex + 1} / {payment.photos.length}
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
                            {currentPhotoIndex + 1} / {payment.photos.length}
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
                        <Receipt className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-gray-500">Aucune photo de reçu disponible</p>
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

            {/* Payment Details Container */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                {/* Header with title and edit button */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {payment.referenceNumber || `Paiement #${payment._id.substring(0, 8)}`}
                        </h1>
                        <p className="text-gray-500">Détails du paiement</p>
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
                                {getStatusBadge(payment.status)}
                            </div>
                            <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-500 mr-2">Montant:</span>
                                <span className="text-xl font-semibold">{formatCurrency(payment.amount)}</span>
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Informations de base */}
                    <div className="py-3">
                        <h3 className="text-lg font-medium mb-2">Informations de paiement</h3>
                        <Separator className="mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date de paiement</p>
                                <p>{safeFormatDate(payment.paymentDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Type de paiement</p>
                                <div className="flex items-center">
                                    {getPaymentTypeIcon(payment.paymentType)}
                                    <p className="ml-2">{payment.paymentType ? payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1) : "Non spécifié"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Numéro de référence</p>
                                <p>{payment._id.substring(0, 8)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date de création</p>
                                <p>{safeFormatDate(payment.createdAt, 'dd MMMM yyyy HH:mm')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Objectif atteint</p>
                                <div className="flex items-center">
                                    {payment.isMeetingTarget ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                    )}
                                    <p>{payment.isMeetingTarget ? "Oui" : "Non"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Separator />

                    {/* Chauffeur associé */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-500">Chauffeur:</span>
                                {payment.schedule?.driver ? (
                                    <div className="flex items-center">
                                        <User className="h-4 w-4 text-gray-500 mr-2" />
                                        <span>{getDriverInfo(payment)}</span>
                                    </div>
                                ) : (
                                    <Badge variant="outline">Non assigné</Badge>
                                )}
                            </div>
                            {payment.schedule?.driver && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/drivers/${payment.schedule.driver._id}`)}
                                >
                                    Voir le chauffeur
                                </Button>
                            )}
                        </div>
                    </div>
                    <Separator />

                    {/* Véhicule associé */}
                    <div className="py-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-500">Véhicule:</span>
                                {payment.schedule?.vehicle ? (
                                    <div className="flex items-center">
                                        <Car className="h-4 w-4 text-gray-500 mr-2" />
                                        <span>{getVehicleInfo(payment)}</span>
                                    </div>
                                ) : (
                                    <Badge variant="outline">Non assigné</Badge>
                                )}
                            </div>
                            {payment.schedule?.vehicle && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/vehicles/${payment.schedule.vehicle._id}`)}
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
                            <p className="text-sm">{payment.comments || 'Aucune note pour ce paiement.'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog pour ajouter des photos */}
            <Dialog open={openPhotoDialog} onOpenChange={setOpenPhotoDialog}>
                <DialogContent className="max-w-[95vw] w-[900px] h-[600px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Gérer les photos du paiement</DialogTitle>
                        <DialogDescription>
                            {payment?.photos?.length || 0} photo(s) existante(s)
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4 py-2">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <AlertTitle className="text-sm">Conseils pour les photos</AlertTitle>
                                <AlertDescription className="text-xs">
                                    Assurez-vous que toutes les informations du reçu sont clairement visibles • Formats: JPG, PNG • Max: 5 MB/image
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>

                    <div className="flex-1 overflow-auto space-y-4">
                        {/* Section des photos existantes */}
                        {payment?.photos && payment.photos.length > 0 && (
                            <div className="space-y-2">
                                <Label>Photos existantes</Label>
                                <div className="border rounded-md p-2">
                                    <div className="grid grid-cols-3 gap-3">
                                        {payment.photos.map((photo, index) => (
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

                        {(payment?.photos?.length > 0 && previewImages.length > 0) && (
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
                            />
                            {photoUploadError && <p className="text-red-500 text-xs mt-1">{photoUploadError}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setOpenPhotoDialog(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog pour modifier le paiement */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Modifier le paiement</DialogTitle>
                    </DialogHeader>
                    <PaymentForm
                        payment={payment}
                        onSubmitSuccess={handleFormSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PaymentDetail;