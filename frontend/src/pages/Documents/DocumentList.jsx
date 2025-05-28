// src/pages/Documents/DocumentsList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { documentService } from '@/services/documentService';
import { vehicleService, driverService } from '@/services/api';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
    FileText,
    Eye,
    Plus,
    Edit,
    Trash2,
    Search,
    Download,
    Upload,
    File,
    AlertTriangle,

    X,
    ChevronDown,

    ChevronUp
} from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DocumentsList = () => {
    const navigate = useNavigate();

    // États
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('current');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterEntity, setFilterEntity] = useState('all');
    const [expiringDays, setExpiringDays] = useState(30);
    const [driverSearch, setDriverSearch] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const { user } = useAuth();

    // États pour les modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
    const [selectedPdfIndex, setSelectedPdfIndex] = useState(null);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [documentToArchive, setDocumentToArchive] = useState(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // État du formulaire
    const [formData, setFormData] = useState({
        documentType: 'insurance',
        expiryDate: '',
        vehicle: null,
        driver: null,
        isCurrent: true
    });

    // État pour la gestion des fichiers PDF
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    // État pour les documents expirants
    const [expiringDocuments, setExpiringDocuments] = useState([]);
    const [showExpiring, setShowExpiring] = useState(false);

    useEffect(() => {
        fetchData();
        fetchVehiclesAndDrivers();
    }, [activeTab, filterType, filterEntity]);

    const fetchData = async () => {
        try {
            setLoading(true);
            let documentsRes;

            if (showExpiring) {
                documentsRes = await documentService.getExpiringDocuments(expiringDays);
                setExpiringDocuments(documentsRes.data);
                return;
            }

            // Charger les documents selon l'onglet actif
            switch (activeTab) {
                case 'current':
                    documentsRes = await documentService.getCurrentDocuments({
                        documentType: filterType === 'all' ? undefined : filterType,
                        vehicleId: filterEntity === 'vehicle' ? undefined : undefined,
                        driverId: filterEntity === 'driver' ? undefined : undefined
                    });
                    break;
                case 'archived':
                    documentsRes = await documentService.getAllDocuments({
                        documentType: filterType === 'all' ? undefined : filterType,
                        vehicleId: filterEntity === 'vehicle' ? undefined : undefined,
                        driverId: filterEntity === 'driver' ? undefined : undefined,
                        includeArchived: true
                    });
                    break;
                default:
                    documentsRes = await documentService.getAll();
            }

            setDocuments(documentsRes.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des documents:', error);
            toast.error("Impossible de charger les documents");
        } finally {
            setLoading(false);
        }
    };

    const getPdfUrl = (pdfPath) => {
        if (pdfPath.startsWith('uploads/')) {
            return `${import.meta.env.VITE_API_PHOTO}/${pdfPath}`;
        }
        return `${import.meta.env.VITE_API_PHOTO}/${pdfPath}`;
    };

    const fetchVehiclesAndDrivers = async () => {
        try {
            // Utilisez les services existants au lieu de fetch directement
            const vehiclesRes = await vehicleService.getAll();
            const driversRes = await driverService.getAll();

            setVehicles(vehiclesRes.data);
            setDrivers(driversRes.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des véhicules et chauffeurs:', error);
            toast.error("Impossible de charger les véhicules et chauffeurs");
        }
    };

    const handleOpenForm = (document = null) => {
        if (document) {
            setSelectedDocument(document);
            setFormData({
                documentType: document.documentType,
                expiryDate: format(new Date(document.expiryDate), 'yyyy-MM-dd'),
                vehicle: document.vehicle?._id || '',
                driver: document.driver?._id || '',
                isCurrent: document.isCurrent
            });
        } else {
            setSelectedDocument(null);
            setFormData({
                documentType: 'insurance',
                expiryDate: '',
                vehicle: '',
                driver: '',
                isCurrent: true
            });
        }
        setSelectedFiles([]);
        setIsFormOpen(true);
    };

    const handleSubmit = async () => {
        try {
            // Validation des champs obligatoires
            if (!formData.documentType || !formData.expiryDate) {
                toast.error("Le type de document et la date d'expiration sont obligatoires");
                return;
            }

            // Préparer les données à envoyer
            const dataToSend = {
                ...formData,
                vehicle: formData.vehicle || null,
                driver: formData.driver || null
            };

            if (formData.documentType === 'contract') {
                if (!dataToSend.vehicle || !dataToSend.driver) {
                    toast.error("Un contrat doit avoir un véhicule ET un chauffeur");
                    return;
                }
            }

            if (formData.documentType !== 'contract' && dataToSend.vehicle && dataToSend.driver) {
                toast.error("Pour ce type de document, seul un véhicule OU un chauffeur doit être spécifié");
                return;
            }

            let documentId;

            if (selectedDocument) {
                // Mise à jour du document existant
                await documentService.update(selectedDocument._id, dataToSend);
                documentId = selectedDocument._id;
                toast.success("Document mis à jour avec succès");
            } else {
                // Création d'un nouveau document
                const response = await documentService.create(dataToSend);
                documentId = response.data._id || response.data.id;
                toast.success("Document créé avec succès");
            }

            // ⭐ AJOUT : Télécharger les fichiers PDF si des fichiers ont été sélectionnés
            if (selectedFiles.length > 0 && documentId) {
                try {
                    await documentService.addPdf(documentId, selectedFiles);
                    toast.success("PDF(s) ajouté(s) avec succès");
                } catch (pdfError) {
                    console.error('Erreur lors de l\'ajout des PDFs:', pdfError);
                    toast.warning("Document créé mais erreur lors de l'ajout des PDFs");
                }
            }

            setIsFormOpen(false);
            setSelectedFiles([]);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            toast.error(error.response?.data?.message || "Une erreur est survenue");
        }
    };

    const confirmDelete = (document) => {
        setDocumentToDelete(document);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!documentToDelete) return;

        try {
            await documentService.delete(documentToDelete._id);
            toast.success("Document supprimé avec succès");
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer le document");
        } finally {
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
        }
    };

    const confirmArchive = (document) => {
        setDocumentToArchive(document);
        setArchiveDialogOpen(true);
    };

    const handleArchive = async () => {
        if (!documentToArchive) return;

        try {
            await documentService.archiveDocument(documentToArchive._id);
            toast.success("Document archivé avec succès");
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'archivage:', error);
            toast.error("Impossible d'archiver le document");
        } finally {
            setArchiveDialogOpen(false);
            setDocumentToArchive(null);
        }
    };

    const handleAddPdf = async (documentId) => {
        if (selectedFiles.length === 0) {
            toast.warning("Veuillez sélectionner au moins un fichier PDF");
            return;
        }

        try {
            await documentService.addPdf(documentId, selectedFiles);
            toast.success("PDF(s) ajouté(s) avec succès");
            setSelectedFiles([]);
            fetchData();
        } catch (error) {
            console.error('Erreur lors de l\'ajout des PDFs:', error);
            toast.error("Impossible d'ajouter les PDFs");
        }
    };

    const handleDeletePdf = async (documentId, pdfIndex) => {
        try {
            await documentService.deletePdf(documentId, pdfIndex);
            toast.success("PDF supprimé avec succès");
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la suppression du PDF:', error);
            toast.error("Impossible de supprimer le PDF");
        }
    };

    const getDocumentTypeLabel = (type) => {
        const types = {
            insurance: 'Assurance',
            registration: 'Carte grise',
            license: 'Permis',
            contract: 'Contrat',
            vtc_license: 'Licence VTC',
            technical_inspection: 'Contrôle technique'
        };
        return types[type] || type;
    };

    const getEntityName = (document) => {
        if (document.vehicle) {
            return document.vehicle.licensePlate || `Véhicule ${document.vehicle._id}`;
        }
        if (document.driver) {
            return `${document.driver.firstName} ${document.driver.lastName}`;
        }
        return 'Non associé';
    };

    const getStatusBadge = (isCurrent, expiryDate) => {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const thirtyDaysFromNow = addDays(now, 30);

        if (expiry < now) {
            return <Badge variant="destructive">Expiré</Badge>;
        }
        if (expiry <= thirtyDaysFromNow) {
            return <Badge variant="warning">Expire bientôt</Badge>;
        }
        return isCurrent ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Archivé</Badge>;
    };

    const toggleExpiringDocuments = () => {
        setShowExpiring(!showExpiring);
        if (!showExpiring) {
            fetchExpiringDocuments();
        }
    };

    const fetchExpiringDocuments = async () => {
        try {
            setLoading(true);
            const res = await documentService.getExpiringDocuments(expiringDays);
            setExpiringDocuments(res.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des documents expirants:', error);
            toast.error("Impossible de charger les documents expirants");
        } finally {
            setLoading(false);
        }
    };
    const filteredDrivers = drivers.filter(driver => {
        const searchTerm = driverSearch.toLowerCase();
        return (
            driver.firstName.toLowerCase().includes(searchTerm) ||
            driver.lastName.toLowerCase().includes(searchTerm) ||
            driver.phoneNumber.toLowerCase().includes(searchTerm)
        );
    });

    const filteredVehicles = vehicles.filter(vehicle => {
        const searchTerm = vehicleSearch.toLowerCase();
        return (
            vehicle.brand.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm) ||
            vehicle.licensePlate.toLowerCase().includes(searchTerm)
        );
    });

    const filteredDocuments = showExpiring
        ? expiringDocuments
        : documents.filter(doc => {
            // Filtrer par terme de recherche
            const searchLower = searchTerm.toLowerCase();
            const docInfo = `${getDocumentTypeLabel(doc.documentType)} ${getEntityName(doc)}`.toLowerCase();

            if (searchTerm && !docInfo.includes(searchLower)) {
                return false;
            }

            return true;
        });

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Documents</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Visualisez et gérez tous les documents des véhicules et chauffeurs
                            <span
                                className="underline cursor-pointer text-blue-500 hover:text-blue-700"
                                onClick={() => setIsTutorialOpen(true)}
                            >
                                Comment ça marche
                            </span>
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={showExpiring ? "default" : "outline"}
                            onClick={toggleExpiringDocuments}
                        >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            {showExpiring ? "Masquer les expirants" : "Voir les expirants"}
                        </Button>
                        <Button onClick={() => handleOpenForm()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un document
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par type ou entité..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select
                            value={filterType}
                            onValueChange={setFilterType}
                            disabled={showExpiring}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="insurance">Assurance</SelectItem>
                                <SelectItem value="registration">Carte grise</SelectItem>
                                <SelectItem value="license">Permis</SelectItem>
                                <SelectItem value="contract">Contrat</SelectItem>
                                <SelectItem value="vtc_license">Licence VTC</SelectItem>
                                <SelectItem value="technical_inspection">Contrôle technique</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filterEntity}
                            onValueChange={setFilterEntity}
                            disabled={showExpiring}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrer par entité" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les entités</SelectItem>
                                <SelectItem value="vehicle">Véhicules</SelectItem>
                                <SelectItem value="driver">Chauffeurs</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {showExpiring && (
                        <div className="mb-4">
                            <div className="flex items-center gap-4">
                                <span>Documents expirant dans :</span>
                                <Select
                                    value={expiringDays.toString()}
                                    onValueChange={(value) => setExpiringDays(parseInt(value))}
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 jours</SelectItem>
                                        <SelectItem value="15">15 jours</SelectItem>
                                        <SelectItem value="30">30 jours</SelectItem>
                                        <SelectItem value="60">60 jours</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    onClick={fetchExpiringDocuments}
                                >
                                    Actualiser
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Onglets pour filtrer par statut */}
                    {!showExpiring && (
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="mb-6"
                        >
                            <TabsList className="grid grid-cols-2">
                                <TabsTrigger value="current">Documents actifs</TabsTrigger>
                                <TabsTrigger value="archived">Documents archivés</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}

                    {/* Tableau des documents */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des documents...</p>
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">
                                {showExpiring
                                    ? "Aucun document n'expire dans cette période"
                                    : "Aucun document trouvé"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Entité</TableHead>
                                    <TableHead>Date d'expiration</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>PDFs</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDocuments.map((document) => (
                                    <TableRow key={document._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                {getDocumentTypeLabel(document.documentType)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getEntityName(document)}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(document.expiryDate), 'dd MMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(document.isCurrent, document.expiryDate)}
                                        </TableCell>
                                        <TableCell>
                                            {document.pdf?.length > 0 ? (
                                                <div className="flex gap-1">
                                                    {document.pdf.slice(0, 2).map((pdf, index) => (
                                                        <Button
                                                            key={index}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2"
                                                            onClick={() => {
                                                                setSelectedDocument(document);
                                                                setSelectedPdfIndex(index);
                                                                setIsPdfDialogOpen(true);
                                                            }}
                                                        >
                                                            <File className="h-4 w-4 mr-1" />
                                                            PDF {index + 1}
                                                        </Button>
                                                    ))}
                                                    {document.pdf.length > 2 && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                                                    {document.pdf.length - 2 > 0 ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : null}
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                {document.pdf.slice(2).map((pdf, index) => (
                                                                    <DropdownMenuItem
                                                                        key={index + 2}
                                                                        onClick={() => {
                                                                            setSelectedDocument(document);
                                                                            setSelectedPdfIndex(index + 2);
                                                                            setIsPdfDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <File className="h-4 w-4 mr-2" />
                                                                        PDF {index + 3}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Aucun PDF</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedDocument(document);
                                                        setIsPdfDialogOpen(true);
                                                    }}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleOpenForm(document)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {user?.role !== 'manager' && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="text-red-500"
                                                        onClick={() => confirmDelete(document)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
                            {selectedDocument ? 'Modifier un document' : 'Ajouter un document'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedDocument
                                ? 'Modifiez les détails de ce document'
                                : 'Remplissez les informations pour ajouter un nouveau document'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="documentType" className="required">Type de document</label>
                                <Select
                                    name="documentType"
                                    value={formData.documentType}
                                    onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="insurance">Assurance</SelectItem>
                                        <SelectItem value="registration">Carte grise</SelectItem>
                                        <SelectItem value="license">Permis</SelectItem>
                                        <SelectItem value="contract">Contrat</SelectItem>
                                        <SelectItem value="vtc_license">Licence VTC</SelectItem>
                                        <SelectItem value="technical_inspection">Contrôle technique</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="expiryDate" className="required">Date d'expiration</label>
                                <Input
                                    type="date"
                                    name="expiryDate"
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {formData.documentType === 'contract' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="vehicle" className="required">Véhicule</label>
                                    <div className="relative">
                                        <Command className="rounded-lg border">
                                            <CommandInput
                                                placeholder="Rechercher un véhicule..."
                                                value={vehicleSearch}
                                                onValueChange={setVehicleSearch}
                                                className="h-10"
                                            />
                                            <CommandEmpty className="py-3 px-4 text-sm text-muted-foreground">
                                                Aucun véhicule trouvé.
                                            </CommandEmpty>
                                            <ScrollArea className={`${filteredVehicles.length > 3 ? 'h-48' : 'h-auto'} rounded-b-md`}>
                                                <CommandGroup>
                                                    {filteredVehicles.map((vehicle) => (
                                                        <CommandItem
                                                            key={vehicle._id}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, vehicle: vehicle._id });
                                                                setVehicleSearch('');
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors",
                                                                vehicle._id === formData.vehicle
                                                                    ? "bg-accent text-accent-foreground"
                                                                    : "hover:bg-accent hover:text-accent-foreground"
                                                            )}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "h-4 w-4 text-primary",
                                                                    vehicle._id === formData.vehicle ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {vehicle.licensePlate} • {vehicle.type}
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
                                            <span className="font-medium">Sélectionné :</span> {vehicles.find(v => v._id === formData.vehicle)?.brand} {vehicles.find(v => v._id === formData.vehicle)?.model}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="driver" className="required">Chauffeur</label>
                                    <div className="relative">
                                        <Command className="rounded-lg border">
                                            <CommandInput
                                                placeholder="Rechercher un chauffeur..."
                                                value={driverSearch}
                                                onValueChange={setDriverSearch}
                                                className="h-10"
                                            />
                                            <CommandEmpty className="py-3 px-4 text-sm text-muted-foreground">
                                                Aucun chauffeur trouvé.
                                            </CommandEmpty>
                                            <ScrollArea className={`${filteredDrivers.length > 3 ? 'h-48' : 'h-auto'} rounded-b-md`}>
                                                <CommandGroup>
                                                    {filteredDrivers.map((driver) => (
                                                        <CommandItem
                                                            key={driver._id}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, driver: driver._id });
                                                                setDriverSearch('');
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors",
                                                                driver._id === formData.driver
                                                                    ? "bg-accent text-accent-foreground"
                                                                    : "hover:bg-accent hover:text-accent-foreground"
                                                            )}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "h-4 w-4 text-primary",
                                                                    driver._id === formData.driver ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                                                                <p className="text-xs text-muted-foreground">{driver.phoneNumber}</p>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </ScrollArea>
                                        </Command>
                                    </div>
                                    {formData.driver && (
                                        <div className="mt-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
                                            <span className="font-medium">Sélectionné :</span> {drivers.find(d => d._id === formData.driver)?.firstName} {drivers.find(d => d._id === formData.driver)?.lastName}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="entity">
                                    {formData.documentType === 'license' || formData.documentType === 'vtc_license'
                                        ? "Chauffeur"
                                        : "Véhicule (optionnel)"}
                                </label>
                                <div className="relative">
                                    <Command className="rounded-lg border">
                                        <CommandInput
                                            placeholder={`Rechercher un ${formData.documentType === 'license' || formData.documentType === 'vtc_license' ? 'chauffeur' : 'véhicule'}...`}
                                            value={formData.documentType === 'license' || formData.documentType === 'vtc_license' ? driverSearch : vehicleSearch}
                                            onValueChange={(value) => {
                                                if (formData.documentType === 'license' || formData.documentType === 'vtc_license') {
                                                    setDriverSearch(value);
                                                } else {
                                                    setVehicleSearch(value);
                                                }
                                            }}
                                            className="h-10"
                                        />
                                        <CommandEmpty className="py-3 px-4 text-sm text-muted-foreground">
                                            Aucun {formData.documentType === 'license' || formData.documentType === 'vtc_license' ? 'chauffeur' : 'véhicule'} trouvé.
                                        </CommandEmpty>
                                        <ScrollArea className={`${(formData.documentType === 'license' || formData.documentType === 'vtc_license' ? filteredDrivers : filteredVehicles).length > 3 ? 'h-48' : 'h-auto'} rounded-b-md`}>
                                            <CommandGroup>
                                                {(formData.documentType === 'license' || formData.documentType === 'vtc_license' ? filteredDrivers : filteredVehicles).map((item) => (
                                                    <CommandItem
                                                        key={item._id}
                                                        onSelect={() => {
                                                            if (formData.documentType === 'license' || formData.documentType === 'vtc_license') {
                                                                setFormData({ ...formData, driver: item._id, vehicle: '' });
                                                                setDriverSearch('');
                                                            } else {
                                                                setFormData({ ...formData, vehicle: item._id, driver: '' });
                                                                setVehicleSearch('');
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors",
                                                            item._id === (formData.documentType === 'license' || formData.documentType === 'vtc_license' ? formData.driver : formData.vehicle)
                                                                ? "bg-accent text-accent-foreground"
                                                                : "hover:bg-accent hover:text-accent-foreground"
                                                        )}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4 text-primary",
                                                                item._id === (formData.documentType === 'license' || formData.documentType === 'vtc_license' ? formData.driver : formData.vehicle) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex-1">
                                                            {item.licensePlate ? (
                                                                <>
                                                                    <p className="font-medium">{item.brand} {item.model}</p>
                                                                    <p className="text-xs text-muted-foreground">{item.licensePlate}</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="font-medium">{item.firstName} {item.lastName}</p>
                                                                    <p className="text-xs text-muted-foreground">{item.phoneNumber}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </Command>
                                </div>
                                {(formData.documentType === 'license' || formData.documentType === 'vtc_license' ? formData.driver : formData.vehicle) && (
                                    <div className="mt-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
                                        <span className="font-medium">Sélectionné :</span> {formData.documentType === 'license' || formData.documentType === 'vtc_license'
                                            ? `${drivers.find(d => d._id === formData.driver)?.firstName} ${drivers.find(d => d._id === formData.driver)?.lastName}`
                                            : `${vehicles.find(v => v._id === formData.vehicle)?.brand} ${vehicles.find(v => v._id === formData.vehicle)?.model}`}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="pdf">Ajouter des fichiers PDF</label>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                                    className="w-full"
                                />
                                {selectedFiles.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        {selectedFiles.length} fichier(s) sélectionné(s)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit}>
                            {selectedDocument ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modale de visualisation des PDFs */}
            <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
                <DialogContent className="sm:max-w-[90%] max-w-[1200px] h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDocument && getDocumentTypeLabel(selectedDocument.documentType)} - PDFs
                        </DialogTitle>
                        <DialogDescription>
                            {selectedDocument && getEntityName(selectedDocument)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="h-full overflow-y-auto">
                        {selectedDocument && (
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    {selectedDocument.pdf?.map((pdf, index) => (
                                        <div key={index} className="w-full md:w-[calc(50%-1rem)] border rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-medium">PDF {index + 1}</h3>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(getPdfUrl(pdf), '_blank')}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Voir
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const link = document.createElement('a');
                                                            link.href = getPdfUrl(pdf);
                                                            link.download = `document_${selectedDocument._id}_${index + 1}.pdf`;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Télécharger
                                                    </Button>
                                                    {user?.role !== 'manager' && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeletePdf(selectedDocument._id, index)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Supprimer
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <iframe
                                                src={getPdfUrl(pdf)}
                                                className="w-full h-[500px] border rounded"
                                                title={`PDF ${index + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Section pour ajouter de nouveaux PDFs */}
                                <div className="border-t pt-6">
                                    <h3 className="font-medium mb-4">Ajouter de nouveaux PDFs</h3>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                                            className="w-full"
                                        />
                                        <Button
                                            onClick={() => handleAddPdf(selectedDocument._id)}
                                            disabled={selectedFiles.length === 0}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Ajouter
                                        </Button>
                                    </div>
                                    {selectedFiles.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm text-muted-foreground">
                                                {selectedFiles.length} fichier(s) sélectionné(s):
                                            </p>
                                            <ul className="list-disc pl-5 mt-2 text-sm">
                                                {selectedFiles.map((file, index) => (
                                                    <li key={index}>{file.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialogue de confirmation de suppression */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogue de confirmation d'archivage */}
            <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer l'archivage</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir archiver ce document ? La version précédente sera automatiquement restaurée.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleArchive}
                            className="bg-yellow-500 hover:bg-yellow-600"
                        >
                            Archiver
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Nouvelle modale tutoriel */}
            <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
                <DialogContent className="sm:max-w-[90%] max-w-[1200px] h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Tutoriel - Gestion des documents</DialogTitle>
                    </DialogHeader>
                    <div className="h-full overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg mb-2">1. Ajout d'un document</h3>
                                <p>Cliquez sur "Ajouter un document" pour créer un nouveau document.</p>
                                <p>Remplissez toutes les informations requises : type, date d'expiration, entité associée.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">2. Filtrage des documents</h3>
                                <p>Utilisez les différents filtres pour trouver facilement les documents :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Recherche par type ou entité</li>
                                    <li>Filtre par type de document</li>
                                    <li>Filtre par entité (véhicule ou chauffeur)</li>
                                    <li>Onglets pour filtrer par statut (actifs, archivés)</li>
                                    <li>Bouton spécial pour voir les documents expirants</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">3. Gestion des PDF</h3>
                                <p>Chaque document peut avoir plusieurs fichiers PDF associés :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Cliquez sur un PDF pour le visualiser</li>
                                    <li>Utilisez les boutons pour télécharger ou supprimer des PDF</li>
                                    <li>Ajoutez de nouveaux PDF via le formulaire d'édition</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">4. Modification des documents</h3>
                                <p>Cliquez sur l'icône <Edit className="inline h-4 w-4" /> pour modifier un document.</p>
                                <p>Vous pouvez mettre à jour toutes les informations, y compris les PDF associés.</p>
                            </div>



                            <div>
                                <h3 className="font-bold text-lg mb-2">6. Documents expirants</h3>
                                <p>Le bouton "Voir les expirants" affiche les documents qui vont expirer bientôt.</p>
                                <p>Vous pouvez configurer la période (7, 15, 30 ou 60 jours).</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">7. Suppression de documents</h3>
                                <p>Cliquez sur l'icône <Trash2 className="inline h-4 w-4" /> pour supprimer un document.</p>
                                <p className="text-red-500">Attention : Cette action est irréversible et supprimera toutes les données associées.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DocumentsList;