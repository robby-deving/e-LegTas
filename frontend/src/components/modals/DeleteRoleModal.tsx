import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface Role {
    id: number;
    name: string;
    is_active?: boolean;
    created_at?: string;
}

interface DeleteRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (roleId: number) => Promise<void>;
    role: Role | null;
}

export const DeleteRoleModal = ({
    isOpen,
    onClose,
    onConfirm,
    role
}: DeleteRoleModalProps) => {
    const handleConfirm = async () => {
        if (role) {
            await onConfirm(role.id);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold" style={{ color: '#00824E' }}>
                        Delete Role
                    </DialogTitle>
                </DialogHeader>
                
                <p className="text-gray-600 mb-6">
                    Are you sure you want to delete the role "{role?.name}"? This action cannot be undone.
                </p>
                
                <DialogFooter>
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
