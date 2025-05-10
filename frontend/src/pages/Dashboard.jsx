// src/pages/Dashboard.jsx
import { React, useState, useEffect } from "react";
import { RevenueChart, MaintenanceChart } from "@/components/ChartDashboardStats"
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

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




const Dashboard = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecentActivities = async () => {
            try {
                setLoading(true);
                const response = await historyService.getRecentActivities(5);
                setActivities(response.data);
            } catch (err) {
                console.error("Failed to fetch activities:", err);
                toast.error(err.response?.data?.message || "Failed to load recent activities");
            } finally {
                setLoading(false);
            }
        };

        fetchRecentActivities();
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
                < div className="px-4 py-6 lg:px-6" >

                    <div >
                        <SectionCards />
                    </div>
                </div >

                {/* Bottom section - Grid 2 */}
                < div className="grid gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6" >
                    {/* Recent Events card */}
                    < Card >
                        <CardHeader>
                            <CardTitle>Evenements recents</CardTitle>
                            <CardDescription>
                                Dernieres actions effectuees
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    Aucun évenement recent
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
                    </Card >

                    {/* Upcoming schedules card */}
                    < Card >
                        <CardHeader>
                            <CardTitle>Upcoming Schedules</CardTitle>
                            <CardDescription>
                                Next 7 days of scheduled trips
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((schedule) => (
                                    <div key={schedule} className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            <CalendarClock className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Route #{schedule}0{schedule}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {schedule === 1 ? "Today" : schedule === 2 ? "Tomorrow" : `In ${schedule} days`},
                                                {schedule === 1 ? " 15:30" : schedule === 2 ? " 09:00" : schedule === 3 ? " 14:15" : " 11:45"}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full">View all schedules</Button>
                        </CardFooter>
                    </Card >
                </div >
            </main >
        </div >
    );
};

export default Dashboard;