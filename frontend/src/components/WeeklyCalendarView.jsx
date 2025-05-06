import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scheduleService } from '@/services/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const WeeklyCalendarView = ({ onScheduleClick }) => {
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Calcul des dates de début et de fin de la semaine
    const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Commence le lundi
    const endDate = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Termine le dimanche

    useEffect(() => {
        fetchWeeklySchedules();
    }, [currentWeek]);

    const fetchWeeklySchedules = async () => {
        try {
            setLoading(true);
            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

            const response = await scheduleService.getByDateRange(formattedStartDate, formattedEndDate);
            setSchedules(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des plannings:', error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de charger les plannings de la semaine"
            });
        } finally {
            setLoading(false);
        }
    };

    const goToPreviousWeek = () => {
        setCurrentWeek(subWeeks(currentWeek, 1));
    };

    const goToNextWeek = () => {
        setCurrentWeek(addWeeks(currentWeek, 1));
    };

    const goToCurrentWeek = () => {
        setCurrentWeek(new Date());
        setSelectedDate(new Date());
    };

    // Fonction pour obtenir les plannings d'une date spécifique
    const getSchedulesForDay = (date) => {
        return schedules.filter(schedule => {
            const scheduleDate = typeof schedule.scheduleDate === 'string'
                ? parseISO(schedule.scheduleDate)
                : new Date(schedule.scheduleDate);
            return isSameDay(scheduleDate, date);
        });
    };

    // Générer les jours affichés dans la vue hebdomadaire
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(startDate, i);
        const daySchedules = getSchedulesForDay(day);
        return {
            date: day,
            dayName: format(day, 'EEEE', { locale: fr }),
            dayNumber: format(day, 'd', { locale: fr }),
            month: format(day, 'MMM', { locale: fr }),
            isoDate: format(day, 'yyyy-MM-dd'),
            schedules: daySchedules
        };
    });

    // Fonction pour afficher le statut avec la bonne couleur
    const getStatusBadge = (status) => {
        switch (status) {
            case 'assigned':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Assigné</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complété</Badge>;
            case 'canceled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Annulé</Badge>;
            default:
                return <Badge variant="outline">Inconnu</Badge>;
        }
    };

    // Formatage pour l'affichage du conducteur
    const formatDriverName = (driver) => {
        if (typeof driver === 'string') {
            return driver;
        }
        return driver?.firstName && driver?.lastName
            ? `${driver.firstName} ${driver.lastName}`
            : 'Chauffeur inconnu';
    };

    // Formatage pour l'affichage du véhicule
    const formatVehicleInfo = (vehicle) => {
        if (typeof vehicle === 'string') {
            return vehicle;
        }
        return vehicle?.brand && vehicle?.model
            ? `${vehicle.brand} ${vehicle.model}`
            : 'Véhicule inconnu';
    };

    // Fonction pour gérer la sélection de date dans le calendrier
    const handleCalendarSelect = (date) => {
        setSelectedDate(date);
        // Trouver la semaine correspondante et mettre à jour currentWeek
        setCurrentWeek(date);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl">Calendrier hebdomadaire</CardTitle>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousWeek}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                            >
                                <CalendarIcon className="h-4 w-4" />
                                <span>Sélectionner la date</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleCalendarSelect}
                                initialFocus
                                locale={fr}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToCurrentWeek}
                    >
                        Aujourd'hui
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextWeek}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-center mb-4">
                    <span className="font-medium">
                        {format(startDate, 'd MMMM', { locale: fr })} - {format(endDate, 'd MMMM yyyy', { locale: fr })}
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">Chargement...</div>
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map((day) => (
                            <div key={day.isoDate} className={`min-h-40 border rounded-lg overflow-hidden ${isSameDay(new Date(), day.date) ? 'border-blue-400 bg-blue-50' : ''
                                }`}>
                                <div className={`text-center p-2 ${isSameDay(new Date(), day.date)
                                        ? 'bg-blue-100 font-bold'
                                        : 'bg-gray-50'
                                    }`}>
                                    <div className="font-medium">{day.dayName}</div>
                                    <div className="text-lg">{day.dayNumber} {day.month}</div>
                                </div>
                                <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                                    {day.schedules.length === 0 ? (
                                        <div className="text-center text-sm text-gray-500 py-2">
                                            Aucun planning
                                        </div>
                                    ) : (
                                        day.schedules.map((schedule) => (
                                            <div
                                                key={schedule._id}
                                                className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                                                onClick={() => onScheduleClick && onScheduleClick(schedule)}
                                            >
                                                <div className="text-sm font-medium">
                                                    {formatDriverName(schedule.driver)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {formatVehicleInfo(schedule.vehicle)}
                                                </div>
                                                <div className="text-xs mt-1">
                                                    {schedule.shiftStart} - {schedule.shiftEnd}
                                                </div>
                                                <div className="mt-1">
                                                    {getStatusBadge(schedule.status)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default WeeklyCalendarView;