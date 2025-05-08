// src/pages/Dashboard.jsx
import React from "react";
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    Wallet,
    Car,
    Wrench,
    Bell,
    UserCircle,
    CreditCard,
    LogOut
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

// Import the chart component
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

// Assuming you have this component or similar
import { SectionCards } from "@/components/section-cards";

const Dashboard = () => {
    // Mock user data
    const user = {
        name: "Jean Dupont",
        email: "jean.dupont@example.com",
        avatar: "/api/placeholder/32/32"
    };

    // Quick nav items
    const navItems = [
        { title: "Dashboard", icon: LayoutDashboard, href: "/" },
        { title: "Drivers", icon: Users, href: "/drivers" },
        { title: "Schedules", icon: CalendarClock, href: "/schedules" },
        { title: "Payments", icon: Wallet, href: "/payments" },
        { title: "Vehicles", icon: Car, href: "/vehicles" },
        { title: "Maintenance", icon: Wrench, href: "/maintenances" },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-background">

            {/* Main content */}
            <main className="flex-1 overflow-auto">


                {/* Stats cards */}
                <div className="px-4 py-6 lg:px-6">
                    <h2 className="text-lg font-semibold mb-4">Overview</h2>
                    <SectionCards />
                </div>

                {/* Charts section */}
                <div className="grid gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6">
                    <ChartAreaInteractive />

                    {/* Activity card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>
                                Latest actions from your fleet management system
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="flex items-start gap-4 rounded-lg border p-3">
                                    <div className="rounded-full bg-primary/10 p-2">
                                        {item % 2 === 0 ?
                                            <Car className="h-4 w-4 text-primary" /> :
                                            <Users className="h-4 w-4 text-primary" />
                                        }
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {item % 2 === 0 ? "Vehicle maintenance completed" : "Driver assignment updated"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item % 2 === 0 ? "Vehicle #A-" + (item * 103) : "Driver #" + (item * 21)}
                                        </p>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {item} hour{item !== 1 ? "s" : ""} ago
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full">View all activity</Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Tasks and upcoming section */}
                <div className="grid gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6">
                    {/* Tasks */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Pending Tasks</CardTitle>
                                <CardDescription>
                                    Tasks requiring attention
                                </CardDescription>
                            </div>
                            <Badge>{3}</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3].map((task) => (
                                    <div key={task} className="flex items-center gap-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded-sm border"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">
                                                {task === 1
                                                    ? "Schedule maintenance for Vehicle #A-103"
                                                    : task === 2
                                                        ? "Review driver reports for the week"
                                                        : "Process pending payment invoices"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Due in {task} day{task !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <Badge variant={task === 1 ? "destructive" : task === 2 ? "warning" : "outline"}>
                                            {task === 1 ? "Urgent" : task === 2 ? "Medium" : "Low"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full">View all tasks</Button>
                        </CardFooter>
                    </Card>

                    {/* Upcoming schedules */}
                    <Card>
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
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;