// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/api';
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { settingsService } from '@/services/api';

const Navbar = ({ user }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [navbarTitle, setNavbarTitle] = useState('Gestion de Flotte');
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await settingsService.getSettings();
                setNavbarTitle(response.data.navbarTitle || 'Gestion de Flotte');
            } catch (error) {
                console.error('Erreur lors du chargement des paramètres:', error);
            }
        };

        const handleSettingsUpdated = (e) => {
            // Utiliser les données de l'événement ou recharger
            if (e.detail?.navbarTitle) {
                setNavbarTitle(e.detail.navbarTitle);
            } else {
                loadSettings(); // Fallback au chargement API
            }
        };

        loadSettings();
        window.addEventListener('settingsUpdated', handleSettingsUpdated);

        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdated);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
            localStorage.removeItem('token');
            toast({
                title: "Déconnexion réussie",
                description: "À bientôt!",
            });
            navigate('/login');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    // Liens synchronisés avec la Sidebar
    const links = [
        {
            href: '/',
            label: 'Tableau de bord',
            icon: <LayoutDashboard className="h-5 w-5" />,
            roles: ['admin', 'manager']
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
            icon: <User className="h-5 w-5" />,
            roles: ['admin', 'manager', 'driver']
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
        <nav className="bg-card rounded-xl border-2 border-border">
            <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                            >
                                <span className="sr-only">Ouvrir le menu</span>
                                {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                        <div className="flex items-center flex-shrink-0 ml-4 md:ml-0">
                            <h1 className="text-xl font-bold text-foreground">{navbarTitle}</h1>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="ml-4 flex items-center">
                            <Button variant="ghost" size="icon" className="mr-2">
                                <Bell className="h-5 w-5" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <User className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <div className="px-4 py-3">
                                        <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                        <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                                        Mon profil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLogout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Déconnexion
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu mobile */}
            {isMobileMenuOpen && (
                <div className="sm:hidden bg-card border-b border-border rounded-b-xl">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {filteredLinks.map((link) => (
                            <Link
                                key={link.href}
                                to={link.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-accent"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;