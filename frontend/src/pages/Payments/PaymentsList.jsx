// src/pages/Payments/PaymentsList.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { paymentService, driverService, vehicleService } from '@/services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Eye } from "lucide-react";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
    const [data, setData] = useState({
        payments: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1
    });
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [filterDriver, setFilterDriver] = useState('all');
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [sortConfig, setSortConfig] = useState({
        field: 'paymentDate',
        order: 'desc'
    });
    const { user } = useAuth();

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
    const [paymentToChangeStatus, setPaymentToChangeStatus] = useState(null);
    const [newStatus, setNewStatus] = useState('pending');
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // Charger les données initiales
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const [driversRes, vehiclesRes] = await Promise.all([
                    driverService.getAll(),
                    vehicleService.getAll()
                ]);
                setDrivers(driversRes.data);
                setVehicles(vehiclesRes.data);
                fetchPayments();
            } catch (error) {
                console.error('Erreur:', error);
                toast.error("Erreur de chargement des données initiales");
            }
        };
        fetchInitialData();
    }, []);

    // Charger les paiements avec les filtres actuels
    const fetchPayments = async () => {
        try {
            setLoading(true);
            const params = {
                page: data.page,
                limit: data.limit,
                sortField: sortConfig.field,
                sortOrder: sortConfig.order
            };

            if (activeTab !== 'all') {
                params.status = activeTab;
            }

            if (searchTerm) {
                params.search = searchTerm;
            }

            if (filterDate) {
                params.startDate = format(filterDate, 'yyyy-MM-dd');
                params.endDate = format(filterDate, 'yyyy-MM-dd');
            }

            if (filterDriver !== 'all') {
                params.driverId = filterDriver;
            }

            if (filterVehicle !== 'all') {
                params.vehicleId = filterVehicle;
            }

            const response = await paymentService.getPaginatedPayments(params);
            setData({
                payments: response.data.data,
                total: response.data.pagination.total,
                page: response.data.pagination.page,
                limit: response.data.pagination.limit,
                totalPages: response.data.pagination.totalPages
            });
        } catch (error) {
            console.error('Erreur:', error);
            toast.error("Erreur de chargement des paiements");
        } finally {
            setLoading(false);
        }
    };

    // Recharger les paiements quand les filtres changent
    useEffect(() => {
        fetchPayments();
    }, [activeTab, searchTerm, filterDate, filterDriver, filterVehicle, sortConfig, data.page]);

    const navigate = useNavigate();

    const handleViewDetails = (paymentId) => {
        navigate(`/payments/${paymentId}`);
    };

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
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">En attente</Badge>;
            case 'confirmed':
                return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Confirmé</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Rejeté</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Gérer le changement de statut d'un paiement
    const handleStatusChange = async () => {
        if (!paymentToChangeStatus || !newStatus) return;

        try {
            await paymentService.changeStatus(paymentToChangeStatus._id, newStatus);
            toast.success(`Le statut du paiement a été mis à jour avec succès`);
            fetchPayments(); // Recharger les données
        } catch (error) {
            console.error('Erreur lors du changement de statut:', error);
            toast.error("Impossible de changer le statut du paiement");
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
            toast.success(`Le paiement a été supprimé avec succès`);
            fetchPayments(); // Recharger les données
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer le paiement");
        } finally {
            setDeleteDialogOpen(false);
            setPaymentToDelete(null);
        }
    };

    // Gérer le succès du formulaire (création/mise à jour)
    const handleFormSuccess = () => {
        fetchPayments(); // Recharger les données
        setIsFormOpen(false);
        setSelectedPayment(null);
    };

    // Réinitialiser les filtres
    const resetFilters = () => {
        setSearchTerm('');
        setFilterDate(null);
        setFilterDriver('all');
        setFilterVehicle('all');
        setActiveTab('all');
        setSortConfig({ field: 'paymentDate', order: 'desc' });
        setData(prev => ({ ...prev, page: 1 }));
    };

    // Gérer le tri
    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Gérer le changement de page
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= data.totalPages) {
            setData(prev => ({ ...prev, page: newPage }));
        }
    };

    // Afficher l'icône de tri
    const renderSortIcon = (field) => {
        if (sortConfig.field !== field) return null;
        return sortConfig.order === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Paiements</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Gérez les paiements des chauffeurs et des véhicules
                            <span
                                className="underline cursor-pointer text-blue-500 hover:text-blue-700"
                                onClick={() => setIsTutorialOpen(true)}
                            >
                                Comment ça marche
                            </span>
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
                    ) : data.payments.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucun paiement trouvé</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => handleSort('paymentDate')}
                                        >
                                            Date {renderSortIcon('paymentDate')}
                                        </TableHead>
                                        <TableHead>Chauffeur</TableHead>
                                        <TableHead>Véhicule</TableHead>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => handleSort('amount')}
                                        >
                                            Montant {renderSortIcon('amount')}
                                        </TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.payments.map((payment) => (
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
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleViewDetails(payment._id)}
                                                        className="text-muted-foreground hover:text-primary"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

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
                                                    {user?.role !== 'manager' && (
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
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="mt-4">
                                {/* Pagination */}
                                {data.payments.length > 0 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            Page {data.page} sur {data.totalPages} • Affichage de {data.payments.length} paiements sur {data.total}
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(data.page - 1)}
                                                disabled={data.page === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(data.page + 1)}
                                                disabled={data.page === data.totalPages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </>
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

            {/* Modale tutoriel */}
            <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
                <DialogContent className="sm:max-w-[90%] max-w-[1200px] h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Tutoriel - Gestion des paiements</DialogTitle>
                    </DialogHeader>
                    <div className="h-full overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg mb-2">1. Ajout d'un paiement</h3>
                                <p>Les paiements sont générés automatiquement chaque jour du planning.</p>
                                <p>En cas de problème, vous pouvez créer manuellement un paiement.</p>
                                <p>Cliquez sur "Nouveau paiement" pour enregistrer un nouveau paiement.</p>
                                <p>Remplissez toutes les informations requises : montant, type de paiement, chauffeur concerné, etc.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">2. Filtrage des paiements</h3>
                                <p>Utilisez les différents filtres pour trouver facilement les paiements :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Recherche par nom de chauffeur ou véhicule</li>
                                    <li>Filtre par date spécifique</li>
                                    <li>Filtre par chauffeur ou véhicule spécifique</li>
                                    <li>Onglets pour filtrer par statut (en attente, confirmés, rejetés)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">3. Modification des paiements</h3>
                                <p>Cliquez sur l'icône <EditIcon className="inline h-4 w-4" /> pour modifier un paiement.</p>
                                <p>Vous pouvez mettre à jour toutes les informations.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">4. Visualisation des détails</h3>
                                <p>Cliquez sur l'icône <Eye className="inline h-4 w-4" /> pour voir les détails complets d'un paiement.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">5. Gestion des statuts</h3>
                                <p>Pour changer le statut d'un paiement, cliquez sur l'icône <EditIcon className="inline h-4 w-4" /> ou sur la page de détail sur <Eye className="inline h-4 w-4" />.</p>
                                <p>Les statuts possibles sont : En attente, Confirmé, Rejeté.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">6. Suppression de paiements</h3>
                                <p>Cliquez sur l'icône <TrashIcon className="inline h-4 w-4" /> pour supprimer un paiement.</p>
                                <p className="text-red-500">Attention : Cette action est irréversible.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PaymentsList;