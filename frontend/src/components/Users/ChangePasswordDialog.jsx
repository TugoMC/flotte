// src/components/Users/ChangePasswordDialog.jsx
import { useState } from 'react';
import { toast } from 'sonner';
import { userService } from '@/services/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LockIcon } from 'lucide-react';

const ChangePasswordDialog = ({ open, onOpenChange, userId }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        try {
            setLoading(true);
            await userService.changePassword(userId, {
                currentPassword,
                newPassword
            });
            toast.success("Mot de passe changé avec succès");
            onOpenChange(false);
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            toast.error(error.response?.data?.message || "Erreur lors du changement de mot de passe");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Changer le mot de passe</DialogTitle>
                    <DialogDescription>
                        Définissez un nouveau mot de passe pour cet utilisateur
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="currentPassword">Mot de passe actuel</label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Entrez le mot de passe actuel"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="newPassword">Nouveau mot de passe</label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Entrez le nouveau mot de passe"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmez le nouveau mot de passe"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        <LockIcon className="mr-2 h-4 w-4" />
                        {loading ? "En cours..." : "Changer le mot de passe"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ChangePasswordDialog;