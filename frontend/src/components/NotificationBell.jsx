// src/components/NotificationBell.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, AlertTriangle, Calendar, CreditCard, Wrench, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NotificationBell = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadNotifications();
        // Recharger les notifications toutes les 30 secondes
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadNotifications = async () => {
        try {
            const response = await notificationService.getNotifications();
            setNotifications(response.data);
            const unread = response.data.filter(n => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Erreur lors du chargement des notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(notifications.map(n =>
                n._id === notificationId ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de marquer la notification comme lue",
                variant: "destructive"
            });
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;

        setIsLoading(true);
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast({
                title: "Notifications marquées",
                description: "Toutes les notifications ont été marquées comme lues"
            });
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de marquer toutes les notifications comme lues",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'document_expiry':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case 'payment_due':
                return <CreditCard className="h-4 w-4 text-red-500" />;
            case 'payment_pending':
                return <CreditCard className="h-4 w-4 text-yellow-500" />;
            case 'maintenance':
                return <Wrench className="h-4 w-4 text-blue-500" />;
            case 'system':
                return <SettingsIcon className="h-4 w-4 text-gray-500" />;
            default:
                return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'text-red-600';
            case 'medium':
                return 'text-orange-600';
            case 'low':
                return 'text-gray-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatNotificationDate = (date) => {
        return formatDistanceToNow(new Date(date), {
            addSuffix: true,
            locale: fr
        });
    };

    // Limiter à 10 notifications dans le dropdown
    const displayedNotifications = notifications.slice(0, 10);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2">
                    <DropdownMenuLabel className="p-0">
                        Notifications ({unreadCount} non lues)
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            disabled={isLoading}
                            className="h-6 px-2"
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Tout marquer
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />

                {displayedNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p>Aucune notification</p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        {displayedNotifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification._id}
                                className={`flex items-start space-x-3 p-4 cursor-pointer ${!notification.isRead ? 'bg-muted/50' : ''
                                    }`}
                                onClick={() => {
                                    if (!notification.isRead) {
                                        markAsRead(notification._id);
                                    }
                                }}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {getNotificationIcon(notification.notificationType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-muted-foreground">
                                            {formatNotificationDate(notification.createdAt)}
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${getPriorityColor(notification.priority)}`}
                                            >
                                                {notification.priority === 'high' ? 'Élevée' :
                                                    notification.priority === 'medium' ? 'Moyenne' : 'Faible'}
                                            </Badge>
                                            {!notification.isRead && (
                                                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                                            )}
                                        </div>
                                    </div>
                                    {notification.expiryDate && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Expire le {new Date(notification.expiryDate).toLocaleDateString('fr-FR')}
                                        </p>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}

                {notifications.length > 10 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="px-4 py-2 text-center">
                            <p className="text-xs text-muted-foreground">
                                {notifications.length - 10} notification(s) supplémentaire(s)
                            </p>
                        </div>
                    </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer justify-center"
                    onClick={() => navigate("/notifications")}
                >
                    <Button variant="ghost" size="sm" className="w-full">
                        Voir toutes les notifications
                    </Button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationBell;