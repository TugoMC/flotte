// src/pages/Settings/Settings.jsx
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Bell, RefreshCw } from 'lucide-react';
import { settingsService } from '@/services/api';
import { notificationService } from '@/services/notificationService';

const Settings = () => {
    const { toast } = useToast();
    const [navbarTitle, setNavbarTitle] = useState('Gestion de Flotte');
    const [sidebarTitle, setSidebarTitle] = useState('Gestion de Flotte');
    const [isCheckingDocuments, setIsCheckingDocuments] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        expirationAlerts: true,
        maintenanceAlerts: false,
        paymentAlerts: false,
        alertThreshold: '30'
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await settingsService.getSettings();
                setNavbarTitle(response.data.navbarTitle || 'Gestion de Flotte');
                setSidebarTitle(response.data.sidebarTitle || 'Gestion de Flotte');

                // Charger les paramètres de notification si disponibles
                if (response.data.notificationSettings) {
                    setNotificationSettings({
                        expirationAlerts: response.data.notificationSettings.expirationAlerts ?? true,
                        maintenanceAlerts: response.data.notificationSettings.maintenanceAlerts ?? false,
                        paymentAlerts: response.data.notificationSettings.paymentAlerts ?? false,
                        alertThreshold: response.data.notificationSettings.alertThreshold ?? '30'
                    });
                }
            } catch (error) {
                console.error('Erreur lors du chargement des paramètres:', error);
            }
        };
        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        try {
            await settingsService.updateSettings({
                navbarTitle,
                sidebarTitle,
                notificationSettings
            });

            toast({
                title: "Paramètres enregistrés",
                description: "Les paramètres ont été mis à jour.",
            });

            window.dispatchEvent(new CustomEvent('settingsUpdated', {
                detail: { navbarTitle, sidebarTitle }
            }));
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de l'enregistrement.",
                variant: "destructive"
            });
        }
    };

    const handleCheckExpiringDocuments = async () => {
        setIsCheckingDocuments(true);
        try {
            const response = await notificationService.checkExpiringDocuments();
            toast({
                title: "Vérification terminée",
                description: `${response.data.message}`,
            });
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors de la vérification des documents",
                variant: "destructive"
            });
        } finally {
            setIsCheckingDocuments(false);
        }
    };

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6">Paramètres</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="general">Général</TabsTrigger>
                    <TabsTrigger value="appearance">Apparence</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Paramètres généraux</CardTitle>
                            <CardDescription>
                                Personnalisez les paramètres généraux de l'application
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="navbarTitle">Titre de la navbar</Label>
                                <Input
                                    id="navbarTitle"
                                    value={navbarTitle}
                                    onChange={(e) => setNavbarTitle(e.target.value)}
                                    placeholder="Entrez le titre pour la navbar"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sidebarTitle">Titre de la sidebar</Label>
                                <Input
                                    id="sidebarTitle"
                                    value={sidebarTitle}
                                    onChange={(e) => setSidebarTitle(e.target.value)}
                                    placeholder="Entrez le titre pour la sidebar"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveSettings}>
                                <Save className="mr-2 h-4 w-4" />
                                Enregistrer
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Apparence</CardTitle>
                            <CardDescription>
                                Personnalisez l'apparence de l'application
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Les options d'apparence seront disponibles dans une future mise à jour.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Notifications</CardTitle>
                                <CardDescription>
                                    Gérez les notifications et alertes du système
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium mb-4">Vérification des documents</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Déclenchez manuellement une vérification des documents expirants ou arrivant à expiration.
                                    </p>
                                    <Button
                                        onClick={handleCheckExpiringDocuments}
                                        disabled={isCheckingDocuments}
                                        variant="outline"
                                    >
                                        {isCheckingDocuments ? (
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Bell className="mr-2 h-4 w-4" />
                                        )}
                                        Vérifier les documents
                                    </Button>
                                </div>

                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-medium mb-4">Configuration des alertes</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>Notifications d'expiration</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Configuration manuelle non disponible
                                                </p>
                                            </div>
                                            <Switch
                                                checked={notificationSettings.expirationAlerts}
                                                onChange={(checked) => setNotificationSettings({ ...notificationSettings, expirationAlerts: checked })}
                                                disabled
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>Délai d'alerte (jours)</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Nombre de jours avant expiration des documents pour déclencher l'alerte
                                                </p>
                                            </div>
                                            <Select
                                                value={notificationSettings.alertThreshold}
                                                onValueChange={(value) => setNotificationSettings({ ...notificationSettings, alertThreshold: value })}
                                            >
                                                <SelectTrigger className="w-24">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="7">7</SelectItem>
                                                    <SelectItem value="15">15</SelectItem>
                                                    <SelectItem value="30">30</SelectItem>
                                                    <SelectItem value="60">60</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>Notifications de maintenance</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Configuration manuelle non disponible
                                                </p>
                                            </div>
                                            <Switch
                                                checked={notificationSettings.maintenanceAlerts}
                                                onChange={(checked) => setNotificationSettings({ ...notificationSettings, maintenanceAlerts: checked })}
                                                disabled
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>Notifications de paiement</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Configuration manuelle non disponible
                                                </p>
                                            </div>
                                            <Switch
                                                checked={notificationSettings.paymentAlerts}
                                                onChange={(checked) => setNotificationSettings({ ...notificationSettings, paymentAlerts: checked })}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Settings;