// src/pages/Users/UsersList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, PlusIcon, EditIcon, TrashIcon, SearchIcon } from 'lucide-react';

const UsersList = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

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

    // Charger les utilisateurs
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            toast.error("Erreur lors du chargement des utilisateurs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filtrer les utilisateurs
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.username.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.firstName.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower)
        );
    });

    // Ouvrir le formulaire
    const handleOpenForm = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive
            });
        } else {
            setSelectedUser(null);
            setFormData({
                username: '',
                email: '',
                firstName: '',
                lastName: '',
                role: 'driver',
                isActive: true
            });
        }
        setIsFormOpen(true);
    };

    // Confirmer la suppression
    const confirmDelete = (user) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    // Supprimer un utilisateur
    const handleDelete = async () => {
        if (!userToDelete) return;

        try {
            await userService.delete(userToDelete._id);
            toast.success("Utilisateur supprimé avec succès");
            fetchUsers();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Impossible de supprimer l'utilisateur");
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    // Soumettre le formulaire
    const handleSubmit = async () => {
        try {
            if (selectedUser) {
                // Mise à jour
                await userService.update(selectedUser._id, formData);
                toast.success("Utilisateur mis à jour avec succès");
            } else {
                // Création
                await userService.register({
                    ...formData,
                    password: 'Password123!' // Mot de passe par défaut
                });
                toast.success("Utilisateur créé avec succès");
            }
            setIsFormOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement");
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

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestion des Utilisateurs</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Visualisez et gérez les utilisateurs de l'application
                            <span
                                className="underline cursor-pointer text-blue-500 hover:text-blue-700"
                                onClick={() => setIsTutorialOpen(true)}
                            >
                                Comment ça marche
                            </span>
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Ajouter un utilisateur
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Barre de recherche */}
                    <div className="relative mb-6">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un utilisateur..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Tableau des utilisateurs */}
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <p>Chargement des utilisateurs...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom d'utilisateur</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Nom complet</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Créé le</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell className="font-medium">
                                            {user.username}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.firstName} {user.lastName}
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(user.role)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(user.isActive)}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => navigate(`/users/${user._id}`)}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleOpenForm(user)}
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => confirmDelete(user)}
                                                    disabled={user.role === 'admin'} // Empêche la suppression des admins
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modale de formulaire */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedUser ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedUser
                                ? 'Modifiez les détails de cet utilisateur'
                                : 'Remplissez les informations pour ajouter un nouvel utilisateur'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="username" className="required">Nom d'utilisateur</label>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="john_doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="required">Email</label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="firstName" className="required">Prénom</label>
                                <Input
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="lastName" className="required">Nom</label>
                                <Input
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="role" className="required">Rôle</label>
                                <Select
                                    name="role"
                                    value={formData.role}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                    required
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
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="isActive">Statut</label>
                                <Select
                                    name="isActive"
                                    value={formData.isActive ? 'true' : 'false'}
                                    onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Actif</SelectItem>
                                        <SelectItem value="false">Inactif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {!selectedUser && (
                            <div className="bg-yellow-50 p-3 rounded-md text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                <p className="font-medium">Mot de passe par défaut</p>
                                <p className="text-sm">Un mot de passe temporaire sera envoyé à l'utilisateur (Password123!)</p>
                                <p className="text-xs mt-1">L'utilisateur devra changer ce mot de passe lors de sa première connexion.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit}>
                            {selectedUser ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

            {/* Dialogue de tutoriel */}
            <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
                <DialogContent className="sm:max-w-[90%] max-w-[1200px] h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Tutoriel - Gestion des utilisateurs</DialogTitle>
                    </DialogHeader>
                    <div className="h-full overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg mb-2">1. Création d'un utilisateur</h3>
                                <p>Cliquez sur "Ajouter un utilisateur" pour créer un nouveau compte.</p>
                                <p>Remplissez les informations requises : nom d'utilisateur, email, nom, prénom et rôle.</p>
                                <p className="text-muted-foreground">Note : Un mot de passe temporaire sera généré automatiquement.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">2. Filtrage des utilisateurs</h3>
                                <p>Utilisez la barre de recherche pour trouver facilement les utilisateurs :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Recherche par nom d'utilisateur</li>
                                    <li>Recherche par email</li>
                                    <li>Recherche par nom ou prénom</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">3. Modification des utilisateurs</h3>
                                <p>Cliquez sur l'icône <EditIcon className="inline h-4 w-4" /> pour modifier un utilisateur.</p>
                                <p>Vous pouvez modifier toutes les informations sauf le mot de passe.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">4. Statut des utilisateurs</h3>
                                <p>Vous pouvez activer ou désactiver un compte utilisateur :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Actif : l'utilisateur peut se connecter</li>
                                    <li>Inactif : l'utilisateur ne peut pas se connecter</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">5. Suppression d'utilisateurs</h3>
                                <p>Cliquez sur l'icône <TrashIcon className="inline h-4 w-4" /> pour supprimer un utilisateur.</p>
                                <p className="text-red-500">Attention : Cette action est irréversible.</p>
                                <p className="text-muted-foreground">Note : Les administrateurs ne peuvent pas être supprimés.</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-2">6. Rôles des utilisateurs</h3>
                                <p>Chaque utilisateur a un rôle qui définit ses permissions :</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Administrateur</Badge> : Accès complet à toutes les fonctionnalités</li>
                                    <li><Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Manager</Badge> : Gestion des plannings et des véhicules</li>
                                    <li><Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Chauffeur</Badge> : Consultation de ses plannings uniquement</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UsersList;