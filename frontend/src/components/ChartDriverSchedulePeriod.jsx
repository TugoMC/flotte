// src/components/ChartDriverSchedulePeriod.jsx
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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
import { driverService } from "@/services/api"
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// Configuration des couleurs pour les différents statuts
const statusColors = {
    pending: "hsl(var(--warning))",
    assigned: "hsl(var(--primary))",
    completed: "hsl(var(--success))",
    canceled: "hsl(var(--destructive))",
}

const chartConfig = {
    duration: {
        label: "Durée (jours)",
        color: "hsl(var(--chart-2))",
    }
}

export function ChartDriverSchedulePeriod({ driverId }) {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("30d")
    const [chartData, setChartData] = React.useState([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d")
        }
    }, [isMobile])

    React.useEffect(() => {
        const fetchScheduleData = async () => {
            try {
                setLoading(true)
                // Récupérer les plannings du chauffeur
                const response = await driverService.getAllMySchedules()
                const schedules = response.data

                // Transformer les données pour le graphique
                const transformedData = schedules.map(schedule => {
                    const startDate = new Date(schedule.scheduleDate)
                    const endDate = schedule.endDate ? new Date(schedule.endDate) : startDate
                    const duration = differenceInDays(endDate, startDate) + 1 // +1 pour inclure le premier jour

                    return {
                        date: schedule.scheduleDate,
                        duration: duration,
                        status: schedule.status,
                        statusColor: statusColors[schedule.status] || "hsl(var(--muted-foreground))"
                    }
                })

                // Trier par date
                transformedData.sort((a, b) => new Date(a.date) - new Date(b.date))

                setChartData(transformedData)
            } catch (error) {
                console.error("Erreur lors de la récupération des plannings:", error)
            } finally {
                setLoading(false)
            }
        }

        if (driverId) {
            fetchScheduleData()
        }
    }, [driverId])

    const filteredData = chartData.filter((item) => {
        if (!item.date) return false

        const date = new Date(item.date)
        const referenceDate = new Date()
        let daysToSubtract = 90

        if (timeRange === "30d") {
            daysToSubtract = 30
        } else if (timeRange === "7d") {
            daysToSubtract = 7
        }

        const startDate = new Date(referenceDate)
        startDate.setDate(startDate.getDate() - daysToSubtract)
        return date >= startDate
    })

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

    if (filteredData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Périodes de planning</CardTitle>
                    <CardDescription>Aucune donnée disponible</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader className="relative">
                <CardTitle>Périodes de planning</CardTitle>
                <CardDescription>
                    <span className="@[540px]/card:block hidden">
                        Durée des plannings en jours
                    </span>
                    <span className="@[540px]/card:hidden">Durée des plannings</span>
                </CardDescription>

            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                    <AreaChart data={filteredData}>
                        <defs>
                            <linearGradient id="fillDuration" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-duration)" stopOpacity={1.0} />
                                <stop offset="95%" stopColor="var(--color-duration)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return format(date, 'dd MMM', { locale: fr })
                            }} />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return format(new Date(value), 'PPPP', { locale: fr })
                                    }}
                                    formatter={(value, name, props) => {
                                        const status = props.payload.status;
                                        const statusText = {
                                            pending: "En attente",
                                            assigned: "Assigné",
                                            completed: "Terminé",
                                            canceled: "Annulé"
                                        }[status] || status;

                                        return [
                                            `${value} jours`,
                                            <span key="status" style={{ color: props.payload.statusColor }}>
                                                Statut: {statusText}
                                            </span>
                                        ];
                                    }}
                                    indicator="dot" />
                            } />
                        <Area
                            dataKey="duration"
                            type="natural"
                            fill="url(#fillDuration)"
                            stroke="var(--color-duration)"
                            stackId="a" />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}