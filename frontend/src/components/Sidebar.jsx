// src/components/Sidebar.jsx
import { useLocation, Link } from 'react-router-dom';
import { ThemeToggle } from "@/components/ThemeToggle";
import {
    LayoutDashboard,
    Car,
    Users,
    Calendar,
    CreditCard,
    Wrench,
    FileText,
    BarChart2,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Sidebar = ({ user }) => {
    const location = useLocation();

    // Définir les liens en fonction du rôle de l'utilisateur
    const links = [
        {
            href: '/users',
            label: 'Utilisateurs',
            icon: <Users className="h-5 w-5" />,
            roles: ['admin']
        },
        {
            href: '/driver',
            label: 'Moi',
            icon: <Users className="h-5 w-5" />,
            roles: ['driver']
        },
        {
            href: '/profile',
            label: 'Profil',
            icon: <Users className="h-5 w-5" />,
            roles: ['admin', 'manager', 'driver']
        },
        {
            href: '/',
            label: 'Tableau de bord',
            icon: <LayoutDashboard className="h-5 w-5" />,
            roles: ['admin', 'manager']
        },
        {
            href: '/vehicles',
            label: 'Véhicules',
            icon: <Car className="h-5 w-5" />,
            roles: ['admin', 'manager']
        },
        {
            href: '/drivers',
            label: 'Chauffeurs',
            icon: <Users className="h-5 w-5" />,
            roles: ['admin', 'manager']
        },
        {
            href: '/schedules',
            label: 'Plannings',
            icon: <Calendar className="h-5 w-5" />,
            roles: ['admin', 'manager']
        },
        {
            href: '/payments',
            label: 'Paiements',
            icon: <CreditCard className="h-5 w-5" />,
            roles: ['admin', 'manager']
        },
        {
            href: '/maintenances',
            label: 'Maintenances',
            icon: <Wrench className="h-5 w-5" />,
            roles: ['admin', 'manager']
        },
        {
            href: '/settings',
            label: 'Paramètres',
            icon: <Settings className="h-5 w-5" />,
            roles: ['admin']
        }
    ];

    // Filtrer les liens selon le rôle de l'utilisateur
    const filteredLinks = links.filter(link =>
        user && link.roles.includes(user.role)
    );

    return (
        <aside className="hidden md:flex md:flex-shrink-0">
            <div className="flex flex-col w-56 lg:w-64">
                <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-card border-2 border-border rounded-xl">
                    <div className="flex items-center flex-shrink-0 px-4">
                        <h2 className="text-xl font-semibold text-foreground">Gestion de Flotte</h2>
                    </div>
                    <div className="mt-5 flex-grow flex flex-col">
                        <nav className="flex-1 px-2 space-y-1">
                            {filteredLinks.map((link) => (
                                <Link key={link.href} to={link.href}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start",
                                            location.pathname === link.href
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {link.icon}
                                        <span className="ml-3">{link.label}</span>
                                    </Button>
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="flex-shrink-0 flex border-t border-border p-4">
                        <div className="flex items-center w-full justify-between">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                                        <span className="text-xl text-secondary-foreground">
                                            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                        </span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">{user?.role}</p>
                                </div>
                            </div>
                            <div className="ml-4">
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );

};

export default Sidebar;