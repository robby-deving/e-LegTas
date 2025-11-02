import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    user: User | null;
    isDeleting?: boolean;
}

interface User {
    user_id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    email: string;
}

export const DeleteUserModal = ({
    isOpen,
    onClose,
    onConfirm,
    user,
    isDeleting = false
}: DeleteUserModalProps) => {
    if (!user) return null;

    const getDisplayName = (user: User) => {
        const parts = [user.first_name];
        if (user.middle_name) {
            parts.push(user.middle_name);
        }
        parts.push(user.last_name);
        if (user.suffix) {
            parts.push(user.suffix);
        }
        return parts.join(' ');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="default" showCloseButton={true}>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-red-600">
                                Delete User
                            </DialogTitle>
                            <DialogDescription className="text-sm text-gray-500 mt-1">
                                This action cannot be undone
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className='text-gray-700'>
                        Are you sure you want to delete this user?
                    </p>
                    
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200'>
                        <p className='font-semibold text-gray-900 mb-1'>
                            {getDisplayName(user)}
                        </p>
                        <p className='text-sm text-gray-600'>
                            {user.email}
                        </p>
                    </div>
                    
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className='text-sm text-red-700'>
                            The user will no longer be able to access the system and all associated data will be permanently removed.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type='button'
                        onClick={onClose}
                        variant="outline"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className='bg-red-600 hover:bg-red-700 text-white'
                    >
                        {isDeleting ? 'Deleting...' : 'Delete User'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
