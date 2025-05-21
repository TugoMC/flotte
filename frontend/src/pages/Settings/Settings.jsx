// src/pages/Settings/Settings.jsx
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { settingsService } from '@/services/api';

const Settings = () => {
    const { toast } = useToast();
    const [navbarTitle, setNavbarTitle] = useState('Gestion de Flotte');
    const [sidebarTitle, setSidebarTitle] = useState('Gestion de Flotte');


    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await settingsService.getSettings();
                setNavbarTitle(response.data.navbarTitle || 'Gestion de Flotte');
                setSidebarTitle(response.data.sidebarTitle || 'Gestion de Flotte');
            } catch (error) {
                console.error('Erreur lors du chargement des paramètres:', error);
            }
        };
        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        try {
            await settingsService.updateSettings({ navbarTitle, sidebarTitle });

            toast({
                title: "Paramètres enregistrés",
                description: "Les titres ont été mis à jour.",
            });

            // Notifier les autres composants via un événement personnalisé
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>
                                Gérez vos préférences de notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Les options de notifications seront disponibles dans une future mise à jour.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Settings;