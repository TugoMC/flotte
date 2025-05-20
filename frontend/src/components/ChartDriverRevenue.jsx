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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const chartConfig = {
    revenue: {
        label: "Revenus",
        color: "hsl(var(--chart-1))",
    }
}

export function ChartDriverRevenue({ driverId }) {
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
        const fetchPaymentData = async () => {
            try {
                setLoading(true)
                // Récupérer les paiements du chauffeur
                const response = await paymentService.getByDriver(driverId)
                const payments = response.data

                // Transformer les données pour le graphique
                const transformedData = payments.map(payment => ({
                    date: payment.paymentDate,
                    revenue: payment.amount
                }))

                // Trier par date
                transformedData.sort((a, b) => new Date(a.date) - new Date(b.date))

                setChartData(transformedData)
            } catch (error) {
                console.error("Erreur lors de la récupération des paiements:", error)
            } finally {
                setLoading(false)
            }
        }

        if (driverId) {
            fetchPaymentData()
        }
    }, [driverId])

    const filteredData = chartData.filter((item) => {
        if (!item.date) return false

        const date = new Date(item.date)
        const referenceDate = new Date() // Date actuelle comme référence
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
                    <CardTitle>Revenus du chauffeur</CardTitle>
                    <CardDescription>Aucune donnée disponible</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader className="relative">
                <CardTitle>Revenus du chauffeur</CardTitle>
                <CardDescription>
                    <span className="@[540px]/card:block hidden">
                        Historique des revenus
                    </span>
                    <span className="@[540px]/card:hidden">Historique</span>
                </CardDescription>

            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                    <AreaChart data={filteredData}>
                        <defs>
                            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={1.0} />
                                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
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
                                    indicator="dot" />
                            } />
                        <Area
                            dataKey="revenue"
                            type="natural"
                            fill="url(#fillRevenue)"
                            stroke="var(--color-revenue)"
                            stackId="a" />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}