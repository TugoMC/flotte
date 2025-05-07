// src/components/Lightbox.jsx
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Lightbox = ({
    images,
    currentIndex,
    onClose,
    onNext,
    onPrev
}) => {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black">
                <div className="relative w-full h-full">
                    <img
                        src={images[currentIndex]}
                        alt=""
                        className="w-full h-full object-contain"
                    />

                    <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white">
                        <X className="h-6 w-6" />
                    </DialogClose>

                    <div className="absolute inset-0 flex items-center justify-between px-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="bg-black/50 hover:bg-black/70 text-white"
                            onClick={onPrev}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="bg-black/50 hover:bg-black/70 text-white"
                            onClick={onNext}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};