// src/pages/HistoryList.jsx
import { React, useState, useEffect } from "react";
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
    Filter,
    Search,
    X,
    SearchIcon,
    PlusIcon,
    EyeIcon,
    Car,
    Users,
    CreditCard,
    Wrench,
    CalendarClock,
    Activity
} from "lucide-react";
import { historyService } from "@/services/api";
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

const HistoryList = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        module: "",
        eventType: "",
        search: "",
        startDate: null,
        endDate: null,
    });
    const navigate = useNavigate();

    const modules = [
        { value: "vehicle", label: "Véhicule" },
        { value: "driver", label: "Chauffeur" },
        { value: "payment", label: "Paiement" },
        { value: "maintenance", label: "Maintenance" },
        { value: "schedule", label: "Planning" },
    ];




    useEffect(() => {
        fetchActivities();
    }, [page, filters]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                ...filters,

                startDate: filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : undefined,
                endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : undefined,
            };

            const response = await historyService.getAll(params);

            if (response.data && Array.isArray(response.data.activities)) {
                setActivities(response.data.activities);
                setTotalPages(response.data.totalPages || 1);
            } else {
                setActivities([]);
                setTotalPages(1);
                console.error("Réponse inattendue de l'API:", response);
                toast.error("Format de données inattendu reçu du serveur");
            }
        } catch (err) {
            console.error("Failed to fetch activities:", err);
            toast.error(err.response?.data?.message || "Failed to load activities");
            setActivities([]);
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
            module: "",

            search: "",
            startDate: null,
            endDate: null,
        });
        setPage(1);
    };

    const getActivityIcon = (module) => {
        const icons = {
            vehicle: <Car className="h-4 w-4 text-primary" />,
            driver: <Users className="h-4 w-4 text-primary" />,
            payment: <CreditCard className="h-4 w-4 text-primary" />,
            maintenance: <Wrench className="h-4 w-4 text-primary" />,
            schedule: <CalendarClock className="h-4 w-4 text-primary" />
        };
        return icons[module] || <Activity className="h-4 w-4 text-primary" />;
    };
    const formatEventType = (eventType) => {
        // Si le type contient un underscore (format API)
        if (eventType.includes('_')) {
            const [module, action] = eventType.split('_');
            const actionMap = {
                create: "Créé",
                update: "Modifié",
                delete: "Supprimé",
                assign: "Assigné",
                release: "Libéré",
                status_change: "Statut changé",
            };
            return actionMap[action] || action;
        }
        // Si c'est déjà formaté simplement
        return eventType;
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return format(date, "PPpp", { locale: fr });
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Historique des activités</CardTitle>
                        <CardDescription>
                            Visualisez l'historique des activités du système
                        </CardDescription>
                    </div>
                    <Button onClick={() => navigate("/")} variant="outline">
                        Retour au tableau de bord
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filtres */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            value={filters.module || undefined}
                            onValueChange={(value) => handleFilterChange("module", value || "")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                {modules.map((mod) => (
                                    <SelectItem key={mod.value} value={mod.value}>
                                        {mod.label}
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
                    {(filters.module || filters.search || filters.startDate || filters.endDate) && (
                        <div className="flex justify-end mb-4">
                            <Button variant="ghost" onClick={resetFilters}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}

                    {/* Tableau des activités */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des activités...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucune activité trouvée</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Icone</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Module</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Utilisateur</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activities.map((activity) => (
                                    <TableRow key={activity._id}>
                                        <TableCell>
                                            <div className="rounded-full bg-primary/10 p-2 w-fit">
                                                {getActivityIcon(activity.module)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {activity.description || `${formatEventType(activity.eventType)} ${activity.module}`}
                                        </TableCell>
                                        <TableCell>
                                            {modules.find((m) => m.value === activity.module)?.label || activity.module}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {formatEventType(activity.eventType)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {activity.performedBy?.username || "Système"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatDate(activity.eventDate)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {activities.length > 0 && (
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

export default HistoryList;