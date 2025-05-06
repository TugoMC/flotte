// src/pages/PaymentsList.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { paymentService, driverService, vehicleService } from '@/services/api';
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
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import PaymentForm from '@/components/forms/PaymentForm';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon, FilterIcon, RefreshCwIcon, CalendarIcon } from 'lucide-react';

const PaymentsList = () => {
    // États
    const [payments, setPayments] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [filterDriver, setFilterDriver] = useState('all');
    const [filterVehicle, setFilterVehicle] = useState('all');

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
    const [paymentToChangeStatus, setPaymentToChangeStatus] = useState(null);
    const [newStatus, setNewStatus] = useState('pending');

    // Charger les données
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const paymentsRes = await paymentService.getAll();
                setPayments(paymentsRes.data);
            } catch (error) {
                console.error('Erreur:', error);
                toast.error("Erreur de chargement des paiements");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filtrer les paiements en fonction des critères
    const filteredPayments = payments.filter(payment => {
        // Filtrer par onglet actif
        if (activeTab === 'pending' && payment.status !== 'pending') return false;
        if (activeTab === 'confirmed' && payment.status !== 'confirmed') return false;
        if (activeTab === 'rejected' && payment.status !== 'rejected') return false;

        // Filtrer par terme de recherche
        const driverName = payment.schedule?.driver
            ? `${payment.schedule.driver.firstName || ''} ${payment.schedule.driver.lastName || ''}`.toLowerCase()
            : '';
        const vehicleInfo = payment.schedule?.vehicle
            ? `${payment.schedule.vehicle.brand || ''} ${payment.schedule.vehicle.model || ''} ${payment.schedule.vehicle.licensePlate || ''}`.toLowerCase()
            : '';
        const searchLower = searchTerm.toLowerCase();

        if (searchTerm && !driverName.includes(searchLower) && !vehicleInfo.includes(searchLower)) {
            return false;
        }

        // Filtrer par date
        if (filterDate && payment.paymentDate) {
            const paymentDate = new Date(payment.paymentDate);
            const selectedDate = new Date(filterDate);
            if (
                paymentDate.getDate() !== selectedDate.getDate() ||
                paymentDate.getMonth() !== selectedDate.getMonth() ||
                paymentDate.getFullYear() !== selectedDate.getFullYear()
            ) {
                return false;
            }
        }

        // Filtrer par chauffeur
        if (filterDriver !== 'all' && (!payment.schedule?.driver || payment.schedule.driver._id !== filterDriver)) {
            return false;
        }

        // Filtrer par véhicule
        if (filterVehicle !== 'all' && (!payment.schedule?.vehicle || payment.schedule.vehicle._id !== filterVehicle)) {
            return false;
        }

        return true;
    });

    // Formater le montant
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    };

    // Formater la date
    const formatPaymentDate = (dateString) => {
        if (!dateString) return 'N/A';
        return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    };

    const getDriverInfo = (payment) => {
        if (!payment.schedule?.driver) return 'Non spécifié';
        return `${payment.schedule.driver.firstName || ''} ${payment.schedule.driver.lastName || ''}`.trim();
    };

    const getVehicleInfo = (payment) => {
        if (!payment.schedule?.vehicle) return 'Non spécifié';
        return `${payment.schedule.vehicle.brand || ''} ${payment.schedule.vehicle.model || ''} ${payment.schedule.vehicle.licensePlate ? `(${payment.schedule.vehicle.licensePlate})` : ''}`.trim();
    };

    // Statut du paiement avec couleur
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">En attente</Badge>;
            case 'confirmed':
                return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">Confirmé</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300">Rejeté</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Gérer le changement de statut d'un paiement
    const handleStatusChange = async () => {
        if (!paymentToChangeStatus || !newStatus) return;

        try {
            await paymentService.changeStatus(paymentToChangeStatus._id, newStatus);

            // Mettre à jour le paiement dans la liste
            setPayments(payments.map(p =>
                p._id === paymentToChangeStatus._id ? { ...p, status: newStatus } : p
            ));

            toast.success(`Le statut du paiement a été mis à jour avec succès`);
        } catch (error) {
            console.error('Erreur lors du changement de statut:', error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de changer le statut du paiement"
            });
        } finally {
            setStatusChangeDialogOpen(false);
            setPaymentToChangeStatus(null);
            setNewStatus('pending');
        }
    };

    // Gérer la suppression d'un paiement
    const handleDelete = async () => {
        if (!paymentToDelete) return;

        try {
            await paymentService.delete(paymentToDelete._id);

            // Supprimer le paiement de la liste
            setPayments(payments.filter(p => p._id !== paymentToDelete._id));

            toast.success(`Le paiement a été supprimé avec succès`);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de supprimer le paiement"
            });
        } finally {
            setDeleteDialogOpen(false);
            setPaymentToDelete(null);
        }
    };

    // Gérer le succès du formulaire (création/mise à jour)
    const handleFormSuccess = () => {
        // Recharger tous les paiements pour être sûr d'avoir les données à jour
        paymentService.getAll()
            .then(response => {
                // Enrichir les données de paiement avec les détails de driver et vehicle
                const processedPayments = response.data.map(payment => {
                    if (payment.schedule) {
                        const driverId = payment.schedule.driver?._id || payment.schedule.driver;
                        const vehicleId = payment.schedule.vehicle?._id || payment.schedule.vehicle;

                        const driver = drivers.find(d => d._id === driverId);
                        const vehicle = vehicles.find(v => v._id === vehicleId);

                        return {
                            ...payment,
                            schedule: {
                                ...payment.schedule,
                                driver: driver || null,
                                vehicle: vehicle || null
                            }
                        };
                    }
                    return payment;
                });

                setPayments(processedPayments);
                setIsFormOpen(false);
                setSelectedPayment(null);
            })
            .catch(error => {
                console.error('Erreur lors du rechargement des paiements:', error);
                // Fermer quand même la modale en cas d'erreur
                setIsFormOpen(false);
                setSelectedPayment(null);
            });
    };

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSearchTerm('');
        setFilterDate(null);
        setFilterDriver('all');
        setFilterVehicle('all');
        setActiveTab('all');
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Paiements</CardTitle>
                        <CardDescription>
                            Gérez les paiements des chauffeurs et des véhicules
                        </CardDescription>
                    </div>
                    <Button onClick={() => {
                        setSelectedPayment(null);
                        setIsFormOpen(true);
                    }}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Nouveau paiement
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
                    {(searchTerm || filterDate || filterDriver !== 'all' || filterVehicle !== 'all' || activeTab !== 'all') && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                <RefreshCwIcon className="mr-2 h-4 w-4" />
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Onglets pour filtrer par statut */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-4">
                            <TabsTrigger value="all">Tous</TabsTrigger>
                            <TabsTrigger value="pending">En attente</TabsTrigger>
                            <TabsTrigger value="confirmed">Confirmés</TabsTrigger>
                            <TabsTrigger value="rejected">Rejetés</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Tableau des paiements */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des paiements...</p>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucun paiement trouvé</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Chauffeur</TableHead>
                                    <TableHead>Véhicule</TableHead>
                                    <TableHead>Montant</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.map((payment) => (
                                    <TableRow key={payment._id}>
                                        <TableCell>{formatPaymentDate(payment.paymentDate)}</TableCell>
                                        <TableCell className="font-medium">{getDriverInfo(payment)}</TableCell>
                                        <TableCell>{getVehicleInfo(payment)}</TableCell>
                                        <TableCell>{formatAmount(payment.amount)}</TableCell>
                                        <TableCell>
                                            {payment.paymentType === 'cash' ? 'Espèces' :
                                                payment.paymentType === 'mobile_money' ? 'Mobile Money' :
                                                    payment.paymentType}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                {payment.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => {
                                                            setPaymentToChangeStatus(payment);
                                                            setNewStatus('confirmed');
                                                            setStatusChangeDialogOpen(true);
                                                        }}
                                                    >
                                                        <CheckIcon className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                )}
                                                {payment.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => {
                                                            setPaymentToChangeStatus(payment);
                                                            setNewStatus('rejected');
                                                            setStatusChangeDialogOpen(true);
                                                        }}
                                                    >
                                                        <XIcon className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedPayment(payment);
                                                        setIsFormOpen(true);
                                                    }}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => {
                                                        setPaymentToDelete(payment);
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
                            {selectedPayment ? 'Modifier le paiement' : 'Nouveau paiement'}
                        </DialogTitle>
                    </DialogHeader>
                    <PaymentForm
                        payment={selectedPayment}
                        onSubmitSuccess={handleFormSuccess}
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
                            Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible.
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
                            Sélectionnez le nouveau statut pour ce paiement.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <Select
                        value={newStatus || "pending"}
                        onValueChange={(value) => setNewStatus(value || "pending")}
                    >
                        <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="confirmed">Confirmé</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                        </SelectContent>
                    </Select>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStatusChange}>
                            Confirmer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PaymentsList;