// src/pages/Drivers/DriverPersonal.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, driverService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Car, Smartphone, BadgeInfo, User, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChartDriverSchedulePeriod } from '@/components/ChartDriverSchedulePeriod';
import { ChartDriverRevenue } from '@/components/ChartDriverRevenue';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';

// URL de base pour les photos
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_PHOTO_URL = import.meta.env.VITE_API_PHOTO || API_URL;

const DriverPersonal = () => {
    const [driverInfo, setDriverInfo] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    // États pour le carrousel de photos
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchDriverData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Récupérer les infos de l'utilisateur
                const userResponse = await authService.getCurrentUser();

                if (!isMounted) return;

                if (userResponse.data.role !== 'driver') {
                    navigate('/');
                    return;
                }

                // 2. Récupérer les détails du chauffeur
                const driverResponse = await authService.getDriverDetails(userResponse.data._id);

                if (!isMounted) return;

                // 3. Récupérer tous les plannings du chauffeur
                const schedulesResponse = await driverService.getAllMySchedules();

                if (isMounted) {
                    setDriverInfo(driverResponse.data);
                    setSchedules(schedulesResponse.data);
                }
            } catch (error) {
                console.error("Error fetching driver data:", error);
                if (isMounted) {
                    setError("Impossible de charger vos informations");
                    toast({
                        title: "Erreur",
                        description: "Impossible de charger vos informations",
                        variant: "destructive"
                    });
                }
                navigate('/');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDriverData();

        return () => {
            isMounted = false;
        };
    }, []); // Exécuté uniquement au montage du composant

    // Fonctions pour naviguer dans le carrousel
    const nextPhoto = () => {
        if (driverInfo?.driverDetails?.photos && driverInfo.driverDetails.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === driverInfo.driverDetails.photos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const prevPhoto = () => {
        if (driverInfo?.driverDetails?.photos && driverInfo.driverDetails.photos.length > 0) {
            setCurrentPhotoIndex((prevIndex) =>
                prevIndex === 0 ? driverInfo.driverDetails.photos.length - 1 : prevIndex - 1
            );
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!driverInfo) {
        return (
            <div className="flex justify-center items-center h-64">
                <p>Aucune donnée disponible</p>
            </div>
        );
    }

    // Récupérer les photos du chauffeur
    const driverPhotos = driverInfo.driverDetails?.photos || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col">
                {/* Section principale */}
                <div className="flex-1 space-y-6">
                    {/* Ajout du carrousel de photos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <User className="h-6 w-6" />
                                Mes photos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 relative w-full h-80 rounded-lg overflow-hidden">
                                {driverPhotos && driverPhotos.length > 0 ? (
                                    <>
                                        <button
                                            onClick={() => setLightboxOpen(true)}
                                            className="w-full h-full focus:outline-none"
                                        >
                                            <img
                                                src={driverPhotos[currentPhotoIndex]?.startsWith('http')
                                                    ? driverPhotos[currentPhotoIndex]
                                                    : `${API_PHOTO_URL}/${driverPhotos[currentPhotoIndex]}`}
                                                alt={`Photo du chauffeur ${driverInfo.user.firstName} ${driverInfo.user.lastName}`}
                                                className="w-full h-full object-cover cursor-zoom-in"
                                            />
                                        </button>

                                        {/* Lightbox Dialog */}
                                        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                                            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <img
                                                        src={driverPhotos[currentPhotoIndex]?.startsWith('http')
                                                            ? driverPhotos[currentPhotoIndex]
                                                            : `${API_PHOTO_URL}/${driverPhotos[currentPhotoIndex]}`}
                                                        alt={`Photo du chauffeur ${driverInfo.user.firstName} ${driverInfo.user.lastName}`}
                                                        className="max-w-full max-h-full object-contain"
                                                    />

                                                    <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
                                                        <X className="h-6 w-6" />
                                                    </DialogClose>

                                                    {/* Navigation buttons in lightbox */}
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
                                                        {currentPhotoIndex + 1} / {driverPhotos.length}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Navigation buttons on carousel */}
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
                                            {currentPhotoIndex + 1} / {driverPhotos.length}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                                        <p className="text-gray-500">Aucune photo disponible</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <User className="h-6 w-6" />
                                Mes informations personnelles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Prénom</p>
                                    <p className="text-lg font-medium">{driverInfo.user.firstName}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Nom</p>
                                    <p className="text-lg font-medium">{driverInfo.user.lastName}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="text-lg font-medium">{driverInfo.user.email}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
                                    <p className="text-lg font-medium">{driverInfo.user.username}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <BadgeInfo className="h-6 w-6" />
                                Informations professionnelles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        Téléphone
                                    </p>
                                    <p className="text-lg font-medium">{driverInfo.driverDetails.phoneNumber}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <BadgeInfo className="h-4 w-4" />
                                        Numéro de permis
                                    </p>
                                    <p className="text-lg font-medium">{driverInfo.driverDetails.licenseNumber}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Date d'embauche
                                    </p>
                                    <p className="text-lg font-medium">
                                        {format(new Date(driverInfo.driverDetails.hireDate), 'PP', { locale: fr })}
                                    </p>
                                </div>
                                {driverInfo.driverDetails.departureDate && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Date de départ
                                        </p>
                                        <p className="text-lg font-medium">
                                            {format(new Date(driverInfo.driverDetails.departureDate), 'PP', { locale: fr })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Calendar className="h-6 w-6" />
                                Mes plannings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {schedules.length === 0 ? (
                                <p>Aucun planning trouvé</p>
                            ) : (
                                <div className="space-y-4">
                                    {schedules.map(schedule => (
                                        <div key={schedule._id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">
                                                        {format(new Date(schedule.scheduleDate), 'PP', { locale: fr })}
                                                        {schedule.endDate && ` au ${format(new Date(schedule.endDate), 'PP', { locale: fr })}`}

                                                    </p>
                                                    {schedule.shiftStart && schedule.shiftEnd && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {schedule.shiftStart} - {schedule.shiftEnd}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs ${schedule.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                                    schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        schedule.status === 'canceled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {schedule.status === 'assigned' ? 'Actif' :
                                                        schedule.status === 'completed' ? 'Terminé' :
                                                            schedule.status === 'canceled' ? 'Annulé' : 'En attente'}
                                                </span>
                                            </div>
                                            {schedule.vehicle && (
                                                <p className="text-sm mt-2">
                                                    Véhicule: {schedule.vehicle.brand} {schedule.vehicle.model} ({schedule.vehicle.licensePlate})
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {driverInfo.assignedVehicle && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <Car className="h-6 w-6" />
                                    Véhicule assigné
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Marque</p>
                                        <p className="text-lg font-medium">
                                            {driverInfo.assignedVehicle.brand}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Modèle</p>
                                        <p className="text-lg font-medium">
                                            {driverInfo.assignedVehicle.model}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Type</p>
                                        <p className="text-lg font-medium">
                                            {driverInfo.assignedVehicle.type}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Plaque d'immatriculation</p>
                                        <p className="text-lg font-medium">
                                            {driverInfo.assignedVehicle.licensePlate}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Section secondaire */}
                <div className="flex-1 space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Statut
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Statut actuel</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${driverInfo.driverDetails.departureDate
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-success/10 text-success'
                                    }`}>
                                    {driverInfo.driverDetails.departureDate ? 'Inactif' : 'Actif'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Mes revenus</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {driverInfo && driverInfo.driverDetails && (
                                <ChartDriverRevenue driverId={driverInfo.driverDetails._id} />
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Périodes de planning</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {driverInfo && driverInfo.driverDetails && (
                                <ChartDriverSchedulePeriod driverId={driverInfo.driverDetails._id} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DriverPersonal;