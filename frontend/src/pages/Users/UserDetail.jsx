// src/pages/Users/UserDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { userService } from '@/services/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeftIcon,
    EditIcon,
    TrashIcon,
    LockIcon,
    MailIcon,
    UserIcon,
    CalendarIcon,
    ShieldIcon
} from 'lucide-react';
import ChangePasswordDialog from '@/components/Users/ChangePasswordDialog';

const UserDetail = () => {
    const { id } = useParams();
    console.log('User ID:', id);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

    // État du formulaire
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'driver',
        isActive: true
    });

    // Rôles disponibles
    const roles = [
        { value: 'admin', label: 'Administrateur' },
        { value: 'manager', label: 'Manager' },
        { value: 'driver', label: 'Chauffeur' }
    ];

    // Charger les données de l'utilisateur
    const fetchUser = async () => {
        try {
            setLoading(true);
            const response = await userService.getById(id);
            setUser(response.data);
            setFormData({
                username: response.data.username,
                email: response.data.email,
                firstName: response.data.firstName,
                lastName: response.data.lastName,
                role: response.data.role,
                isActive: response.data.isActive
            });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            if (error.response?.status === 404) {
                toast.error("Utilisateur non trouvé");
            } else {
                toast.error("Erreur lors du chargement des données utilisateur");
            }
            navigate('/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [id]);

    // Mettre à jour l'utilisateur
    const handleUpdate = async () => {
        try {
            await userService.update(id, formData);
            toast.success("Utilisateur mis à jour avec succès");
            setEditMode(false);
            fetchUser();
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            toast.error(error.response?.data?.message || "Erreur lors de la mise à jour");
        }
    };

    // Supprimer l'utilisateur
    const handleDelete = async () => {
        try {
            await userService.delete(id);
            toast.success("Utilisateur supprimé avec succès");
            navigate('/users');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer l'utilisateur");
        }
    };

    // Gérer les changements de formulaire
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Obtenir le badge de rôle
    const getRoleBadge = (role) => {
        const roleColors = {
            admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            driver: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        };
        return (
            <Badge className={roleColors[role]}>
                {roles.find(r => r.value === role)?.label || role}
            </Badge>
        );
    };

    // Obtenir le badge de statut
    const getStatusBadge = (isActive) => {
        return isActive ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                Actif
            </Badge>
        ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                Inactif
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex justify-center items-center h-64">
                    <p>Chargement des données utilisateur...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-10">
                    <p className="text-muted-foreground">Utilisateur non trouvé</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Bouton de retour */}
            <Button
                variant="outline"
                onClick={() => navigate('/users')}
                className="gap-2"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Retour à la liste
            </Button>

            {/* Carte principale */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Détails de l'utilisateur</CardTitle>
                        <CardDescription>
                            Informations complètes et gestion de l'utilisateur
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {editMode ? (
                            <>
                                <Button variant="outline" onClick={() => setEditMode(false)}>
                                    Annuler
                                </Button>
                                <Button onClick={handleUpdate}>
                                    Enregistrer
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setPasswordDialogOpen(true)}
                                    className="gap-2"
                                >
                                    <LockIcon className="h-4 w-4" />
                                    Changer mot de passe
                                </Button>
                                <Button
                                    onClick={() => setEditMode(true)}
                                    className="gap-2"
                                >
                                    <EditIcon className="h-4 w-4" />
                                    Modifier
                                </Button>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        {/* Section informations de base */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Nom complet</p>
                                        {editMode ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="Prénom"
                                                    className="mt-1"
                                                />
                                                <Input
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="Nom"
                                                    className="mt-1"
                                                />
                                            </div>
                                        ) : (
                                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <MailIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        {editMode ? (
                                            <Input
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="Email"
                                                className="mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium">{user.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <ShieldIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Rôle</p>
                                        {editMode ? (
                                            <Select
                                                name="role"
                                                value={formData.role}
                                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                                                className="mt-1"
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un rôle" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role.value} value={role.value}>
                                                            {role.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="mt-1">{getRoleBadge(user.role)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="h-5 w-5 text-muted-foreground opacity-0" /> {/* Pour l'alignement */}
                                    <div>
                                        <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
                                        {editMode ? (
                                            <Input
                                                name="username"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                placeholder="Nom d'utilisateur"
                                                className="mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium">{user.username}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date de création</p>
                                        <p className="font-medium">
                                            {format(new Date(user.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <ShieldIcon className="h-5 w-5 text-muted-foreground opacity-0" /> {/* Pour l'alignement */}
                                    <div>
                                        <p className="text-sm text-muted-foreground">Statut</p>
                                        {editMode ? (
                                            <Select
                                                name="isActive"
                                                value={formData.isActive ? 'true' : 'false'}
                                                onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
                                                className="mt-1"
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un statut" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Actif</SelectItem>
                                                    <SelectItem value="false">Inactif</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="mt-1">{getStatusBadge(user.isActive)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section statistiques/activité (peut être étendue) */}
                        <div className="border-t pt-6">
                            <h3 className="font-semibold mb-4">Activité récente</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Dernière connexion</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {user.lastLogin ? (
                                            <p className="font-medium">
                                                {format(new Date(user.lastLogin), 'dd MMM yyyy HH:mm', { locale: fr })}
                                            </p>
                                        ) : (
                                            <p className="text-muted-foreground">Jamais connecté</p>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Nombre de connexions</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-medium">N/A</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Dernière activité</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-medium">N/A</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bouton de suppression (seulement si pas en mode édition) */}
            {!editMode && (
                <div className="flex justify-end">
                    <Button
                        variant="destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={user.role === 'admin'} // Empêche la suppression des admins
                        className="gap-2"
                    >
                        <TrashIcon className="h-4 w-4" />
                        Supprimer l'utilisateur
                    </Button>
                </div>
            )}

            {/* Dialogue de confirmation de suppression */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogue de changement de mot de passe */}
            <ChangePasswordDialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
                userId={id}
            />
        </div>
    );
};

export default UserDetail;