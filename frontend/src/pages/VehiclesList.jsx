// src/pages/VehiclesList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { vehicleService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Eye,
    CarIcon,
    BikeIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    SearchIcon,
    ImageIcon,
    XIcon,
    InfoIcon,
    ChevronLeft,
    ChevronRight
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

const VehiclesList = () => {
    const navigate = useNavigate();

    // Estados para los modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalVehicles, setTotalVehicles] = useState(0);

    // Form state
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

    // Photo management state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [photosPreviews, setPhotosPreviews] = useState([]);

    // Create preview URLs when files are selected
    useEffect(() => {
        if (!selectedFiles.length) {
            setPhotosPreviews([]);
            return;
        }

        const newPreviews = selectedFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setPhotosPreviews(newPreviews);

        // Clean up object URLs on unmount
        return () => {
            newPreviews.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, [selectedFiles]);

    // Fetch data effect
    useEffect(() => {
        fetchData();
    }, [activeTab, page, searchTerm, filterType]);

    // Filtered vehicles based on search, type, and status
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesSearch = !searchTerm ||
            vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || vehicle.type === filterType;
        const matchesStatus = activeTab === 'all' || vehicle.status === activeTab;

        return matchesSearch && matchesType && matchesStatus;
    });

    const fetchData = async () => {
        try {
            setLoading(true);

            // Query parameters
            const params = {
                page,
                limit: 10,
                search: searchTerm,
                type: filterType !== 'all' ? filterType : undefined,
                status: activeTab !== 'all' ? activeTab : undefined
            };

            const response = await vehicleService.getAll(params);

            setVehicles(response.data.vehicles || []);
            setTotalPages(response.data.totalPages || 1);
            setTotalVehicles(response.data.totalCount || 0);
        } catch (error) {
            console.error('Error:', error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

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

    // Navigate to detail page
    const handleViewDetails = (id) => {
        navigate(`/vehicles/${id}`);
    };

    const handleDelete = async () => {
        if (!vehicleToDelete) return;

        try {
            await vehicleService.delete(vehicleToDelete._id);
            toast.success("Vehicle deleted successfully");
            fetchData();
        } catch (error) {
            console.error('Deletion error:', error);
            toast.error("Unable to delete vehicle");
        } finally {
            setDeleteDialogOpen(false);
            setVehicleToDelete(null);
        }
    };

    const handleSubmit = async () => {
        try {
            // Validate required fields
            const { type, licensePlate, brand, model, registrationDate, serviceEntryDate } = formData;

            if (!type || !licensePlate || !brand || !model || !registrationDate || !serviceEntryDate) {
                toast.error("All required fields must be filled");
                return;
            }

            let vehicleId;

            if (selectedVehicle) {
                // Update existing vehicle
                await vehicleService.update(selectedVehicle._id, formData);
                vehicleId = selectedVehicle._id;
                toast.success("Vehicle updated successfully");
            } else {
                // Create new vehicle
                const response = await vehicleService.create(formData);
                vehicleId = response.data._id;
                toast.success("Vehicle added successfully");
            }

            // Upload photos only if a vehicle exists and files are selected
            if (vehicleId && selectedFiles.length > 0) {
                await vehicleService.uploadPhotos(vehicleId, selectedFiles);
                toast.success(`${selectedFiles.length} photo(s) added successfully`);
            }

            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.message || "An error occurred");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileSelect = (e) => {
        if (e.target.files.length === 0) return;

        // Check file size (max 5MB)
        const filesArray = Array.from(e.target.files);
        const validFiles = filesArray.filter(file => file.size <= 5 * 1024 * 1024);

        if (validFiles.length < filesArray.length) {
            toast.warning("Some files exceed the 5 MB size limit and have been ignored", {
                description: "Please select smaller files",
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
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Active</Badge>;
            case 'inactive':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Inactive</Badge>;
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
        if (!driver) return 'Not assigned';
        return `${driver.firstName} ${driver.lastName}`;
    };

    // Reset filters
    const resetFilters = () => {
        setSearchTerm('');
        setFilterType('all');
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Vehicle Management</CardTitle>
                        <CardDescription>
                            View and manage vehicle information
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Vehicle
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by brand, model, or license plate..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="taxi">Taxi</SelectItem>
                                <SelectItem value="moto">Motorcycle</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Reset filters button */}
                    {(searchTerm || filterType !== 'all') && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Reset Filters
                            </Button>
                        </div>
                    )}

                    {/* Status tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid grid-cols-4">
                            <TabsTrigger value="all">All Vehicles</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="inactive">Inactive</TabsTrigger>
                            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Vehicle table */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Loading vehicles...</p>
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No vehicles found</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>License Plate</TableHead>
                                        <TableHead>Brand / Model</TableHead>
                                        <TableHead>Service Entry</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVehicles.map((vehicle) => (
                                        <TableRow key={vehicle._id}>
                                            <TableCell className="flex items-center gap-2">
                                                {getVehicleIcon(vehicle.type)}
                                                {vehicle.type === 'taxi' ? 'Taxi' : 'Motorcycle'}
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
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="text-red-500"
                                                        onClick={() => confirmDelete(vehicle)}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {vehicles.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        Page {page} of {totalPages}
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Vehicle Form Modal (Create/Edit) */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedVehicle
                                ? 'Modify the details of this vehicle'
                                : 'Fill in the information to add a new vehicle'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="type" className='required'>Vehicle Type</label>
                                <Select
                                    name="type"
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="taxi">Taxi</SelectItem>
                                        <SelectItem value="moto">Motorcycle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="licensePlate" className='required'>License Plate</label>
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
                                <label htmlFor="brand" className='required'>Brand</label>
                                <Input
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="model" className='required'>Model</label>
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
                                <label htmlFor="registrationDate" className='required'>Registration Date</label>
                                <Input
                                    type="date"
                                    name="registrationDate"
                                    value={formData.registrationDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="serviceEntryDate" className='required'>Service Entry Date</label>
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
                                <label htmlFor="status" className='required'>Status</label>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="dailyIncomeTarget" className='required'>Daily Income Target</label>
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
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Add a note..."
                            />
                        </div>

                        {/* Photo Management Section */}
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-base font-medium">Vehicle Photos</label>
                                <Button variant="outline" asChild>
                                    <label className="cursor-pointer">
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Add Photos
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

                            {/* Photo Information Message */}
                            <div className="bg-accent p-3 rounded-md text-sm flex items-start gap-2">
                                <InfoIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-accent-foreground mb-1">Photo Guidelines</p>
                                    <p className="text-muted-foreground">
                                        For optimal quality, use images with a minimum resolution of 1200×800 pixels
                                        and a 3:2 aspect ratio. Accepted formats: JPG, PNG. Maximum size: 5 MB per image.
                                    </p>
                                </div>
                            </div>

                            {/* Photo Previews */}
                            {photosPreviews.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-500 mb-2">
                                        {photosPreviews.length} photo(s) selected
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {photosPreviews.map((item, index) => (
                                            <div
                                                key={index}
                                                className="relative aspect-[3/2] bg-gray-100 rounded-md overflow-hidden group"
                                            >
                                                <img
                                                    src={item.preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index)}
                                                    className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remove"
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
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {selectedVehicle ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this vehicle? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default VehiclesList;