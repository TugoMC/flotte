// src/pages/Dashboard.jsx
import { React, useState, useEffect } from "react";
import { RevenueChart, MaintenanceChart } from "@/components/ChartDashboardStats"
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scheduleService } from "@/services/api";
import { ErrorBoundary } from 'react-error-boundary';
import {
    Users,
    CalendarClock,
    Car,
    Wrench,
    CreditCard,
    Activity
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { historyService } from "@/services/api";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
    const [activities, setActivities] = useState([]);
    const [currentSchedules, setCurrentSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSchedules, setLoadingSchedules] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setLoadingSchedules(true);

                // Fetch activities
                const activitiesResponse = await historyService.getRecentActivities(5);
                setActivities(activitiesResponse.data);

                // Fetch schedules
                const schedulesResponse = await scheduleService.getAll();
                const filtered = schedulesResponse.data.filter(schedule => {
                    // Exclure les plannings annulés ou terminés
                    if (schedule.status === 'canceled' || schedule.status === 'completed') return false;

                    // Vérifier les dates
                    if ((!isToday(parseISO(schedule.scheduleDate)) && isBefore(parseISO(schedule.scheduleDate), new Date())) ||
                        (schedule.endDate && isBefore(parseISO(schedule.endDate), new Date()))) {
                        return false;
                    }

                    return true;
                });

                setCurrentSchedules(filtered.slice(0, 4)); // Prendre les 4 premiers
            } catch (err) {
                console.error("Failed to fetch data:", err);
                toast.error(err.response?.data?.message || "Failed to load data");
            } finally {
                setLoading(false);
                setLoadingSchedules(false);
            }
        };

        fetchData();
    }, []);

    const getActivityIcon = (activity) => {
        const icons = {
            vehicle: <Car className="h-4 w-4 text-primary" />,
            driver: <Users className="h-4 w-4 text-primary" />,
            payment: <CreditCard className="h-4 w-4 text-primary" />,
            maintenance: <Wrench className="h-4 w-4 text-primary" />,
            schedule: <CalendarClock className="h-4 w-4 text-primary" />
        };
        return icons[activity.module] || <Activity className="h-4 w-4 text-primary" />;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">En attente</Badge>;
            case 'assigned':
                return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">Assigné</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800">Terminé</Badge>;
            case 'canceled':
                return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Annulé</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatSchedulePeriod = (schedule) => {
        const startDate = format(new Date(schedule.scheduleDate), 'dd MMM yyyy', { locale: fr });
        if (!schedule.endDate) return `À partir du ${startDate}`;
        const endDate = format(new Date(schedule.endDate), 'dd MMM yyyy', { locale: fr });
        return `${startDate} au ${endDate}`;
    };

    const formatScheduleHours = (schedule) => {
        if (!schedule.shiftStart || !schedule.shiftEnd) return 'Journée complète';
        return `${schedule.shiftStart} - ${schedule.shiftEnd}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Main content */}
            <main className="flex-1 overflow-auto">
                {/* Chart section - Top alone */}
                <h2 className="text-lg font-semibold mb-4">Tableau de bord</h2>
                <div className="px-4 py-6 lg:px-6">
                    <ErrorBoundary
                        fallback={<div className="text-red-500">Erreur d'affichage des statistiques</div>}
                        onError={(error) => console.error("ChartDashboardStats error:", error)}
                    >
                        <RevenueChart />
                    </ErrorBoundary>
                </div>

                <div className="px-4 py-6 lg:px-6">
                    <ErrorBoundary
                        fallback={<div className="text-red-500">Erreur d'affichage des statistiques</div>}
                        onError={(error) => console.error("ChartDashboardStats error:", error)}
                    >
                        <MaintenanceChart />
                    </ErrorBoundary>
                </div>

                {/* Stats cards - 4 in horizontal row */}
                <div className="px-4 py-6 lg:px-6">
                    <div>
                        <SectionCards />
                    </div>
                </div>

                {/* Bottom section - Grid 2 */}
                <div className="grid gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6">
                    {/* Recent Events card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Événements récents</CardTitle>
                            <CardDescription>
                                Dernières actions effectuées
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    Aucun événement récent
                                </div>
                            ) : (
                                activities.map((activity) => (
                                    <div key={activity._id} className="flex items-start gap-4 rounded-lg border p-3">
                                        <div className="rounded-full bg-primary/10 p-2">
                                            {getActivityIcon(activity)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {activity.description || `${activity.eventType.replace('_', ' ')}`}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => navigate("/history")}
                            >
                                Voir plus
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Current schedules card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Plannings en cours</CardTitle>
                            <CardDescription>
                                Plannings actuellement en cours
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {loadingSchedules ? (
                                    <div className="flex justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    </div>
                                ) : currentSchedules.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        Aucun planning en cours
                                    </div>
                                ) : (
                                    currentSchedules.map((schedule) => (
                                        <div key={schedule._id} className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                <CalendarClock className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    {schedule.driver?.firstName
                                                        ? `${schedule.driver.firstName} ${schedule.driver.lastName}`
                                                        : 'Chauffeur non spécifié'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatSchedulePeriod(schedule)} - {formatScheduleHours(schedule)}
                                                </p>
                                                <div className="mt-1">
                                                    {getStatusBadge(schedule.status)}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/schedules`)}
                                            >
                                                Voir
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => navigate("/schedules")}
                            >
                                Voir tous les plannings
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;