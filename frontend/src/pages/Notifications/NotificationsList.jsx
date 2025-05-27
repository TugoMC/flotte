// src/pages/Notifications/NotificationsList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/DatePicker";
import {
    ChevronLeft,
    ChevronRight,
    SearchIcon,
    Bell,
    Check,
    CheckCheck,
    AlertTriangle,
    CreditCard,
    Wrench,
    Settings as SettingsIcon
} from "lucide-react";
import { notificationService } from '@/services/notificationService';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const NotificationsList = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        search: "",
        startDate: null,
        endDate: null,
    });
    const navigate = useNavigate();

    const notificationTypes = [
        { value: "document_expiry", label: "Expiration de document" },
        { value: "payment_due", label: "Paiement dû" },
        { value: "payment_pending", label: "Paiement en attente" },
        { value: "maintenance", label: "Maintenance" },
        { value: "system", label: "Système" },
    ];

    const priorities = [
        { value: "high", label: "Élevée" },
        { value: "medium", label: "Moyenne" },
        { value: "low", label: "Faible" },
    ];

    const statuses = [
        { value: "read", label: "Lue" },
        { value: "unread", label: "Non lue" },
    ];

    useEffect(() => {
        fetchNotifications();
    }, [page, filters]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationService.getNotifications();

            if (response.data && Array.isArray(response.data)) {
                // Filtrage côté client
                let filtered = response.data;

                if (filters.status) {
                    filtered = filtered.filter(n =>
                        filters.status === 'read' ? n.isRead : !n.isRead
                    );
                }

                if (filters.type) {
                    filtered = filtered.filter(n => n.notificationType === filters.type);
                }

                if (filters.priority) {
                    filtered = filtered.filter(n => n.priority === filters.priority);
                }

                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    filtered = filtered.filter(n =>
                        n.message.toLowerCase().includes(searchLower)
                    );
                }

                if (filters.startDate) {
                    filtered = filtered.filter(n =>
                        new Date(n.createdAt) >= filters.startDate
                    );
                }

                if (filters.endDate) {
                    const endOfDay = new Date(filters.endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    filtered = filtered.filter(n =>
                        new Date(n.createdAt) <= endOfDay
                    );
                }

                // Pagination côté client
                const startIndex = (page - 1) * 10;
                const paginated = filtered.slice(startIndex, startIndex + 10);

                setNotifications(paginated);
                setTotalPages(Math.ceil(filtered.length / 10));
            } else {
                setNotifications([]);
                setTotalPages(1);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            toast.error(err.response?.data?.message || "Failed to load notifications");
            setNotifications([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const resetFilters = () => {
        setFilters({
            status: "",
            type: "",
            priority: "",
            search: "",
            startDate: null,
            endDate: null,
        });
        setPage(1);
    };

    const markAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(notifications.map(n =>
                n._id === notificationId ? { ...n, isRead: true } : n
            ));
            toast.success("Notification marquée comme lue");
        } catch (error) {
            toast.error("Impossible de marquer la notification comme lue");
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            toast.success("Toutes les notifications marquées comme lues");
        } catch (error) {
            toast.error("Impossible de marquer toutes les notifications comme lues");
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'document_expiry':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case 'payment_due':
                return <CreditCard className="h-4 w-4 text-red-500" />;
            case 'maintenance':
                return <Wrench className="h-4 w-4 text-blue-500" />;
            case 'system':
                return <SettingsIcon className="h-4 w-4 text-gray-500" />;
            default:
                return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'medium':
                return 'bg-orange-100 text-orange-800';
            case 'low':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatNotificationDate = (dateString) => {
        const date = new Date(dateString);
        return format(date, "PPpp", { locale: fr });
    };

    const formatNotificationType = (type) => {
        const typeMap = {
            'document_expiry': 'Expiration de document',
            'payment_due': 'Paiement dû',
            'payment_pending': 'Paiement en attente',
            'maintenance': 'Maintenance',
            'system': 'Système'
        };
        return typeMap[type] || type;
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>
                            Liste de toutes vos notifications
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => navigate("/")} variant="outline">
                            Retour au tableau de bord
                        </Button>
                        <Button onClick={markAllAsRead} variant="outline">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Tout marquer comme lu
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-10"
                                value={filters.search}
                                onChange={(e) => handleFilterChange("search", e.target.value)}
                            />
                        </div>

                        <Select
                            value={filters.status || undefined}
                            onValueChange={(value) => handleFilterChange("status", value || "")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.type || undefined}
                            onValueChange={(value) => handleFilterChange("type", value || "")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {notificationTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.priority || undefined}
                            onValueChange={(value) => handleFilterChange("priority", value || "")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Priorité" />
                            </SelectTrigger>
                            <SelectContent>
                                {priorities.map((priority) => (
                                    <SelectItem key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DatePicker
                            selected={filters.startDate}
                            onChange={(date) => handleFilterChange("startDate", date)}
                            selectsStart
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            placeholderText="Date de début"
                            className="w-full"
                        />

                        <DatePicker
                            selected={filters.endDate}
                            onChange={(date) => handleFilterChange("endDate", date)}
                            selectsEnd
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            minDate={filters.startDate}
                            placeholderText="Date de fin"
                            className="w-full"
                        />
                    </div>

                    {/* Bouton pour réinitialiser les filtres */}
                    {(filters.status || filters.type || filters.priority || filters.search || filters.startDate || filters.endDate) && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Tableau des notifications */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucune notification trouvée</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Statut</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Priorité</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications.map((notification) => (
                                    <TableRow key={notification._id}>
                                        <TableCell>
                                            {notification.isRead ? (
                                                <CheckCheck className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {getNotificationIcon(notification.notificationType)}
                                                {notification.message}
                                            </div>
                                            {notification.notificationType === 'payment_pending' && notification.additionalData && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    ID Paiement: {notification.additionalData.paymentId}
                                                </p>
                                            )}
                                            {notification.expiryDate && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Expire le {new Date(notification.expiryDate).toLocaleDateString('fr-FR')}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatNotificationType(notification.notificationType)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getPriorityColor(notification.priority)}>
                                                {notification.priority === 'high' ? 'Élevée' :
                                                    notification.priority === 'medium' ? 'Moyenne' : 'Faible'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {formatNotificationDate(notification.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!notification.isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => markAsRead(notification._id)}
                                                >
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Marquer comme lu
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {notifications.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <div className="text-sm text-muted-foreground">
                                Page {page} sur {totalPages}
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
                </CardContent>
            </Card>
        </div>
    );
};

export default NotificationsList;