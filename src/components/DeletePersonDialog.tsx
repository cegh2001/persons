import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";

interface DeletePersonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nameToDelete: string;
  submitting: boolean;
  onSubmit: () => void;
}

export function DeletePersonDialog({
  isOpen,
  onOpenChange,
  nameToDelete,
  submitting,
  onSubmit
}: DeletePersonDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">¿Eliminar del Censo?</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible. ¿Estás seguro de que querés eliminar a <strong>{nameToDelete}</strong> del registro de damnificados?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <DialogClose render={<Button type="button" variant="ghost">Cancelar</Button>} />
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Eliminando..." : "Confirmar Eliminación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
