// src/components/ui/DatePicker.jsx
import React from "react";
import { Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function DatePicker({
    selected,
    onChange,
    placeholderText = "Sélectionner une date",
    selectsStart,
    selectsEnd,
    startDate,
    endDate,
    minDate,
    className = "",
    ...props
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${className}`}
                >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selected ? (
                        format(selected, "PPP", { locale: fr })
                    ) : (
                        <span>{placeholderText}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <CalendarComponent
                    mode="single"
                    selected={selected}
                    onSelect={onChange}
                    initialFocus
                    fromDate={selectsStart ? minDate : startDate}
                    toDate={selectsEnd ? undefined : endDate}
                    locale={fr}
                    {...props}
                />
            </PopoverContent>
        </Popover>
    );
}