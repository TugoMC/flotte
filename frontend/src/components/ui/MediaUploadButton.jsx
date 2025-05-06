// src/components/ui/MediaUploadButton.jsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { mediaService } from '@/services/api';

const MediaUploadButton = ({ entityType, entityId, onUploadSuccess }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier le type de fichier (images uniquement)
        if (!file.type.startsWith('image/')) {
            toast.error('Seules les images sont acceptées');
            return;
        }

        // Vérifier la taille du fichier (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La taille maximale du fichier est de 5MB');
            return;
        }

        setSelectedFile(file);

        // Créer un aperçu du fichier
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setPreview(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            // Créer un FormData pour envoyer le fichier
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('entityType', entityType);
            if (entityId) {
                formData.append('entityId', entityId);
            }

            // Appeler le service d'upload
            const response = await mediaService.upload(formData);

            toast.success('Média téléchargé avec succès');
            setIsDialogOpen(false);
            clearSelection();

            // Notifier le composant parent du succès
            if (onUploadSuccess) {
                onUploadSuccess(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
            toast.error(error.response?.data?.message || 'Erreur lors du téléchargement');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                className="flex items-center"
            >
                <Upload className="h-4 w-4 mr-2" />
                Télécharger un justificatif
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Télécharger un justificatif</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {!preview ? (
                            <div className="flex items-center justify-center w-full">
                                <label
                                    htmlFor="dropzone-file"
                                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500">
                                            <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            PNG, JPG, JPEG (MAX. 5MB)
                                        </p>
                                    </div>
                                    <Input
                                        id="dropzone-file"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Aperçu"
                                    className="max-h-64 mx-auto rounded-lg"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={clearSelection}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <div className="flex justify-end space-x-2 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={uploading}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Téléchargement...
                                    </>
                                ) : 'Télécharger'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MediaUploadButton;