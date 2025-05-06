// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { vehicleService, driverService } from '@/services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleDollarSign, Users, Car, Calendar, AlertCircle } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalVehicles: 0,
        activeVehicles: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0
    });
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Données simulées pour les véhicules et conducteurs
                // (ces valeurs seront utilisées si les API retournent 404)
                let vehiclesData = [];
                let driversData = [];

                try {
                    const vehiclesRes = await vehicleService.getAll();
                    vehiclesData = vehiclesRes.data;
                } catch (error) {
                    console.log('API véhicules pas encore implémentée, utilisation de données simulées');
                    // Données simulées
                    vehiclesData = [
                        { id: 1, status: 'active' },
                        { id: 2, status: 'active' },
                        { id: 3, status: 'maintenance' }
                    ];
                }

                try {
                    const driversRes = await driverService.getAll();
                    driversData = driversRes.data;
                } catch (error) {
                    console.log('API chauffeurs pas encore implémentée, utilisation de données simulées');
                    // Données simulées
                    driversData = [
                        { id: 1, status: 'active' },
                        { id: 2, status: 'active' },
                        { id: 3, status: 'inactive' }
                    ];
                }

                // Simulation de données de revenus
                const mockRevenue = {
                    today: Math.floor(Math.random() * 5000) + 1000,
                    week: Math.floor(Math.random() * 25000) + 15000,
                    month: Math.floor(Math.random() * 100000) + 50000
                };

                // Simulation d'alertes
                const mockAlerts = [
                    { id: 1, type: 'maintenance', message: 'Entretien du véhicule ABC-123 prévu demain', severity: 'info' },
                    { id: 2, type: 'document', message: 'Assurance du véhicule XYZ-789 expire dans 5 jours', severity: 'warning' },
                    { id: 3, type: 'payment', message: 'Objectif de recette non atteint hier pour le taxi TXI-456', severity: 'error' }
                ];

                setStats({
                    totalVehicles: vehiclesData.length,
                    activeVehicles: vehiclesData.filter(v => v.status === 'active').length,
                    totalDrivers: driversData.length,
                    activeDrivers: driversData.filter(d => d.status === 'active').length,
                    todayRevenue: mockRevenue.today,
                    weekRevenue: mockRevenue.week,
                    monthRevenue: mockRevenue.month
                });

                setAlerts(mockAlerts);
            } catch (error) {
                console.error('Erreur lors du chargement des données du dashboard:', error);
                // Configurer des données par défaut même en cas d'erreur
                setStats({
                    totalVehicles: 3,
                    activeVehicles: 2,
                    totalDrivers: 3,
                    activeDrivers: 2,
                    todayRevenue: 1500,
                    weekRevenue: 18000,
                    monthRevenue: 75000
                });

                setAlerts([
                    { id: 1, type: 'system', message: 'APIs en cours d\'implémentation', severity: 'info' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Tableau de bord</h1>
                <p className="text-gray-500">Vue d'ensemble de votre flotte de véhicules</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">Chargement des données...</div>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
                                <Car className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.activeVehicles} / {stats.totalVehicles}</div>
                                <p className="text-xs text-gray-500">véhicules actifs</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Chauffeurs</CardTitle>
                                <Users className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.activeDrivers} / {stats.totalDrivers}</div>
                                <p className="text-xs text-gray-500">chauffeurs actifs</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Recette du jour</CardTitle>
                                <CircleDollarSign className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
                                <p className="text-xs text-gray-500">aujourd'hui</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Recette mensuelle</CardTitle>
                                <Calendar className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats.monthRevenue)}</div>
                                <p className="text-xs text-gray-500">ce mois-ci</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="revenue">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="revenue">Recettes</TabsTrigger>
                            <TabsTrigger value="alerts">Alertes</TabsTrigger>
                            <TabsTrigger value="schedule">Planning du jour</TabsTrigger>
                        </TabsList>

                        <TabsContent value="revenue">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recettes</CardTitle>
                                    <CardDescription>Vue d'ensemble des recettes</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span>Aujourd'hui</span>
                                            <span className="font-bold">{formatCurrency(stats.todayRevenue)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Cette semaine</span>
                                            <span className="font-bold">{formatCurrency(stats.weekRevenue)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Ce mois</span>
                                            <span className="font-bold">{formatCurrency(stats.monthRevenue)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="alerts">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Alertes récentes</CardTitle>
                                    <CardDescription>Notifications importantes nécessitant votre attention</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {alerts.length === 0 ? (
                                        <p className="text-center py-4 text-gray-500">Aucune alerte pour le moment</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {alerts.map(alert => (
                                                <div
                                                    key={alert.id}
                                                    className={`p-3 rounded-md flex items-start gap-3 ${alert.severity === 'error' ? 'bg-red-50 text-red-700' :
                                                        alert.severity === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                                                            'bg-blue-50 text-blue-700'
                                                        }`}
                                                >
                                                    <AlertCircle className="h-5 w-5 mt-0.5" />
                                                    <div>
                                                        <h4 className="font-medium">
                                                            {alert.type === 'maintenance' ? 'Maintenance' :
                                                                alert.type === 'document' ? 'Document' :
                                                                    alert.type === 'payment' ? 'Paiement' : 'Système'}
                                                        </h4>
                                                        <p className="text-sm">{alert.message}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="schedule">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Planning du jour</CardTitle>
                                    <CardDescription>Affectations des chauffeurs pour aujourd'hui</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-center py-4 text-gray-500">
                                        Fonctionnalité à implémenter - Planning des chauffeurs
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
};

export default Dashboard;