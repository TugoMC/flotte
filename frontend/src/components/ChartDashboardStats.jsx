// src/components/ChartDashboardStats.jsx
"use client"

import * as React from "react"
import { maintenanceService } from "@/services/api"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { paymentService } from "@/services/api"
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const timeRanges = {
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    '90d': '3 derniers mois',
    'custom': 'Période personnalisée'
}

export function RevenueChart() {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("30d")
    const [data, setData] = React.useState([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(null)

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d")
        }
    }, [isMobile])

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                let startDate, endDate
                const now = new Date()

                // Calculer les dates en fonction de la période sélectionnée
                switch (timeRange) {
                    case '7d':
                        startDate = subDays(now, 7)
                        break
                    case '30d':
                        startDate = subDays(now, 30)
                        break
                    case '90d':
                        startDate = subDays(now, 90)
                        break
                    default:
                        startDate = subDays(now, 30) // Par défaut 30 jours
                }

                endDate = now

                // Formater les dates pour l'API
                const startISO = startDate.toISOString()
                const endISO = endDate.toISOString()

                // Appel API
                const response = await paymentService.getDailyRevenue(startISO, endISO)

                if (response.data && response.data.data) { // Check for response.data.data
                    // Formater les données pour le graphique
                    const formattedData = response.data.data.map(item => ({ // Use response.data.data
                        date: new Date(item.date),
                        totalAmount: item.totalAmount,
                        count: item.count,
                        formattedDate: format(new Date(item.date), 'dd MMM', { locale: fr })
                    }))

                    setData(formattedData)
                }
            } catch (err) {
                console.error("Erreur lors de la récupération des données:", err)
                setError("Erreur lors du chargement des données")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [timeRange])

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            let date;
            try {
                date = new Date(label);
                if (isNaN(date.getTime())) {
                    date = new Date(payload[0].payload.date);
                }
            } catch (e) {
                date = new Date();
            }

            return (
                <div className="bg-popover p-4 rounded-lg shadow-md border border-border">
                    <p className="font-semibold text-popover-foreground">
                        {format(date, 'PPPP', { locale: fr })}
                    </p>
                    <p className="text-sm text-popover-foreground">
                        Revenu: {payload[0].value.toFixed(2)}FCFA
                    </p>
                    <p className="text-sm text-popover-foreground">
                        Nombre de paiements: {payload[0].payload.count}
                    </p>
                </div>
            )
        }
        return null
    }


    if (loading) {
        return (
            <div className="flex items-center justify-center h-[250px]">
                <div className="animate-pulse flex flex-col space-y-3">
                    <div className="h-[125px] w-full rounded-xl bg-gray-200"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200"></div>
                        <div className="h-4 w-[80%] bg-gray-200"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[250px]">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader className="relative">
                <CardTitle>Évolution des revenus</CardTitle>
                <CardDescription>
                    Revenus journaliers confirmés
                </CardDescription>
                <div className="absolute right-4 top-4">
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        onValueChange={setTimeRange}
                        variant="outline"
                        className="@[767px]/card:flex hidden">
                        <ToggleGroupItem value="7d" className="h-8 px-2.5">
                            7 jours
                        </ToggleGroupItem>
                        <ToggleGroupItem value="30d" className="h-8 px-2.5">
                            30 jours
                        </ToggleGroupItem>
                        <ToggleGroupItem value="90d" className="h-8 px-2.5">
                            3 mois
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="@[767px]/card:hidden flex w-40" aria-label="Select a range">
                            <SelectValue placeholder="30 derniers jours" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="7d" className="rounded-lg">
                                7 derniers jours
                            </SelectItem>
                            <SelectItem value="30d" className="rounded-lg">
                                30 derniers jours
                            </SelectItem>
                            <SelectItem value="90d" className="rounded-lg">
                                3 derniers mois
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="formattedDate"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={isMobile ? 48 : 32}
                                tick={{ fontSize: isMobile ? 10 : 12 }}

                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}F`}
                            />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="totalAmount"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}


export function MaintenanceChart() {
    const isMobile = useIsMobile();
    const [timeRange, setTimeRange] = React.useState("30d");
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d");
        }
    }, [isMobile]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                let startDate, endDate;
                const now = new Date();

                // Calculer les dates en fonction de la période sélectionnée
                switch (timeRange) {
                    case '7d':
                        startDate = subDays(now, 7);
                        break;
                    case '30d':
                        startDate = subDays(now, 30);
                        break;
                    case '90d':
                        startDate = subDays(now, 90);
                        break;
                    default:
                        startDate = subDays(now, 30); // Par défaut 30 jours
                }

                endDate = now;

                // Formater les dates pour l'API
                const startISO = startDate.toISOString();
                const endISO = endDate.toISOString();

                // Appel API
                const response = await maintenanceService.getDailyCosts(startISO, endISO);

                if (response.data && response.data.data) {
                    // Formater les données pour le graphique
                    const formattedData = response.data.data.map(item => ({
                        date: new Date(item.date),
                        totalCost: item.totalCost,
                        count: item.count,
                        formattedDate: format(new Date(item.date), timeRange === '90d' ? 'MMM dd' : 'dd MMM', { locale: fr }),
                        types: item.types
                    }));

                    setData(formattedData);
                }
            } catch (err) {
                console.error("Erreur lors de la récupération des données:", err);
                setError("Erreur lors du chargement des données");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            let date;
            try {
                date = new Date(payload[0].payload.date);
                if (isNaN(date.getTime())) {
                    date = new Date();
                }
            } catch (e) {
                date = new Date();
            }

            return (
                <div className="bg-popover p-4 rounded-lg shadow-md border border-border">
                    <p className="font-semibold text-popover-foreground">
                        {format(date, 'PPPP', { locale: fr })}
                    </p>
                    <p className="text-sm text-popover-foreground">
                        Coût total: {payload[0].value.toLocaleString()} FCFA
                    </p>
                    <p className="text-sm text-popover-foreground">
                        Nombre de maintenances: {payload[0].payload.count}
                    </p>
                    {payload[0].payload.types && payload[0].payload.types.length > 0 && (
                        <p className="text-sm text-popover-foreground">
                            Types: {payload[0].payload.types.join(', ')}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[250px]">
                <div className="animate-pulse flex flex-col space-y-3">
                    <div className="h-[125px] w-full rounded-xl bg-gray-200"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200"></div>
                        <div className="h-4 w-[80%] bg-gray-200"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[250px]">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <Card className="@container/card">
            <CardHeader className="relative">
                <CardTitle>Dépenses de maintenance</CardTitle>
                <CardDescription>
                    Coûts de maintenance journaliers
                </CardDescription>
                <div className="absolute right-4 top-4">
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        onValueChange={setTimeRange}
                        variant="outline"
                        className="@[767px]/card:flex hidden">
                        <ToggleGroupItem value="7d" className="h-8 px-2.5">
                            7 jours
                        </ToggleGroupItem>
                        <ToggleGroupItem value="30d" className="h-8 px-2.5">
                            30 jours
                        </ToggleGroupItem>
                        <ToggleGroupItem value="90d" className="h-8 px-2.5">
                            3 mois
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="@[767px]/card:hidden flex w-40" aria-label="Select a range">
                            <SelectValue placeholder="30 derniers jours" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="7d" className="rounded-lg">
                                7 derniers jours
                            </SelectItem>
                            <SelectItem value="30d" className="rounded-lg">
                                30 derniers jours
                            </SelectItem>
                            <SelectItem value="90d" className="rounded-lg">
                                3 derniers mois
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorMaintenance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="formattedDate"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={isMobile ? 48 : 32}
                                tick={{ fontSize: isMobile ? 10 : 12 }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value.toLocaleString()}F`}
                            />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="totalCost"
                                stroke="#FF6B6B"
                                fillOpacity={1}
                                fill="url(#colorMaintenance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}