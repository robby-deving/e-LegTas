import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { DateTimePicker } from '../ui/date-time-picker';
import { toISODateLocal } from '@/utils/dateInput';
import BirthdayMaskedInput from '../EvacuationCenterDetail/BirthdayMaskedInput';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: UserFormData) => Promise<void>;
    barangays: { id: number; name: string }[];
    evacuationCenters: { id: number; name: string }[];
    roles: { id: number; name: string }[];
    rolesLoading: boolean;
    canSelectRole: boolean;
    hasAssignRole: boolean;
    currentUserRoleId?: number;
    getAssignableRoles: () => { id: number; name: string }[];
    canManageEvacuationCenterForUser: (roleId?: number) => boolean;
}

export interface UserFormData {
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    sex: string;
    barangay_of_origin: string;
    employee_number: string;
    birthdate: string;
    email: string;
    password: string;
    role_id: string;
    assigned_evacuation_center: string;
    assigned_barangay: string;
}

export const AddUserModal = ({
    isOpen,
    onClose,
    onSubmit,
    barangays,
    evacuationCenters,
    rolesLoading,
    canSelectRole,
    hasAssignRole,
    currentUserRoleId,
    getAssignableRoles,
    canManageEvacuationCenterForUser,
}: AddUserModalProps) => {
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState<UserFormData>({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        sex: '',
        barangay_of_origin: '',
        employee_number: '',
        birthdate: '',
        email: '',
        password: '',
        role_id: '',
        assigned_evacuation_center: '',
        assigned_barangay: ''
    });

    const handleFormChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        handleFormChange(name, value);
    };

    const handleSelectChange = (name: string, value: string) => {
        handleFormChange(name, value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            await onSubmit(formData);
            // Reset form on success
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                sex: '',
                barangay_of_origin: '',
                employee_number: '',
                birthdate: '',
                email: '',
                password: '',
                role_id: '',
                assigned_evacuation_center: '',
                assigned_barangay: ''
            });
        } finally {
            setFormLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form when closing
        setFormData({
            first_name: '',
            middle_name: '',
            last_name: '',
            suffix: '',
            sex: '',
            barangay_of_origin: '',
            employee_number: '',
            birthdate: '',
            email: '',
            password: '',
            role_id: '',
            assigned_evacuation_center: '',
            assigned_barangay: ''
        });
        onClose();
    };

    const targetRoleId = canSelectRole ? parseInt(formData.role_id) : currentUserRoleId;

    const renderAssignedField = () => {
        // Show barangay field if target role is 7 (Barangay Official)
        if (targetRoleId === 7) {
            return (
                <div className="space-y-2">
                    <Label htmlFor='assigned_barangay'>
                        Assigned Barangay
                    </Label>
                    <Select
                        value={formData.assigned_barangay}
                        onValueChange={(value) => handleSelectChange('assigned_barangay', value)}
                    >
                        <SelectTrigger id='assigned_barangay' className="w-full">
                            <SelectValue placeholder="Select barangay (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            {barangays.map(barangay => (
                                <SelectItem key={barangay.id} value={barangay.id.toString()}>
                                    {barangay.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        } else {
            // Only show evacuation center field if user can manage it
            if (canManageEvacuationCenterForUser(targetRoleId)) {
                return (
                    <div className="space-y-2">
                        <Label htmlFor='assigned_evacuation_center'>
                            Assigned Evacuation Center
                        </Label>
                        <Select
                            value={formData.assigned_evacuation_center}
                            onValueChange={(value) => handleSelectChange('assigned_evacuation_center', value)}
                        >
                            <SelectTrigger id='assigned_evacuation_center' className="w-full">
                                <SelectValue placeholder="Select evacuation center (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {evacuationCenters.map(center => (
                                    <SelectItem key={center.id} value={center.name}>
                                        {center.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            }
            return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent size="large" showCloseButton={true}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#0C955B]">
                        Add User
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-4 px-1 min-h-0">
                    {/* Row 1: First Name | Middle Name */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div className="space-y-2">
                            <Label htmlFor='first_name'>
                                First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id='first_name'
                                type='text'
                                name='first_name'
                                value={formData.first_name}
                                onChange={handleInputChange}
                                placeholder='Enter first name'
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='middle_name'>
                                Middle Name
                            </Label>
                            <Input
                                id='middle_name'
                                type='text'
                                name='middle_name'
                                value={formData.middle_name}
                                onChange={handleInputChange}
                                placeholder='Enter middle name'
                            />
                        </div>
                    </div>

                    {/* Row 2: Last Name | Suffix */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div className="space-y-2">
                            <Label htmlFor='last_name'>
                                Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id='last_name'
                                type='text'
                                name='last_name'
                                value={formData.last_name}
                                onChange={handleInputChange}
                                placeholder='Enter last name'
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='suffix'>
                                Suffix
                            </Label>
                            <Input
                                id='suffix'
                                type='text'
                                name='suffix'
                                value={formData.suffix}
                                onChange={handleInputChange}
                                placeholder='Enter suffix (optional)'
                            />
                        </div>
                    </div>

                    {/* Row 3: Sex | Barangay of Origin */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div className="space-y-2">
                            <Label htmlFor='sex'>
                                Sex <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.sex}
                                onValueChange={(value) => handleSelectChange('sex', value)}
                                required
                            >
                                <SelectTrigger id='sex' className="w-full">
                                    <SelectValue placeholder="Select sex" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='barangay_of_origin'>
                                Barangay of Origin <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.barangay_of_origin}
                                onValueChange={(value) => handleSelectChange('barangay_of_origin', value)}
                                required
                            >
                                <SelectTrigger id='barangay_of_origin' className="w-full">
                                    <SelectValue placeholder="Select barangay" />
                                </SelectTrigger>
                                <SelectContent>
                                    {barangays.map((barangay) => (
                                        <SelectItem key={barangay.id} value={barangay.id.toString()}>
                                            {barangay.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 4: Employee Number | Birthdate */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div className="space-y-2">
                            <Label htmlFor='employee_number'>
                                Employee Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id='employee_number'
                                type='text'
                                name='employee_number'
                                value={formData.employee_number}
                                onChange={handleInputChange}
                                placeholder='Enter employee number'
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='birthdate'>
                                Birthdate <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative w-full">
                                {/* Masked text input */}
                                <BirthdayMaskedInput
                                    value={formData.birthdate}
                                    onChange={(iso) => handleSelectChange('birthdate', iso)}
                                    required
                                    className="pl-10 pr-10"
                                />

                                {/* LEFT calendar trigger */}
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 z-30">
                                    {/* Invisible clickable button from DateTimePicker */}
                                    <DateTimePicker
                                        value={formData.birthdate ? new Date(formData.birthdate) : undefined}
                                        onChange={(d) => handleSelectChange('birthdate', d ? toISODateLocal(d) : '')}
                                        showTime={false}
                                        placeholder=" "
                                        className="absolute inset-0 h-10 w-10 p-0 opacity-0 cursor-pointer"
                                        minYear={1900}
                                        maxYear={new Date().getFullYear()}
                                    />
                                    {/* Visible calendar icon */}
                                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground">
                                            <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm13 6H4v12h16V8Z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor='email'>
                            Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id='email'
                            type='email'
                            name='email'
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder='Enter email address'
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor='password'>
                            Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id='password'
                            type='password'
                            name='password'
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder='Enter password'
                            required
                        />
                    </div>

                    {/* Role - Show only when allowed by role config AND permission */}
                    {canSelectRole && hasAssignRole && (
                        <div className="space-y-2">
                            <Label htmlFor='role_id'>
                                Role <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.role_id}
                                onValueChange={(value) => handleSelectChange('role_id', value)}
                                required
                            >
                                <SelectTrigger id='role_id' className="w-full">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {!rolesLoading && getAssignableRoles().map(role => (
                                        <SelectItem key={role.id} value={role.id.toString()}>
                                            {role.name.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                    {rolesLoading && (
                                        <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Optional note when assignment is restricted */}
                    {canSelectRole && !hasAssignRole && (
                        <p className='text-xs text-gray-500'>You don't have permission to assign roles.</p>
                    )}

                    {/* Assigned Field (Barangay or Evacuation Center) */}
                    {renderAssignedField()}
                    </div>

                    <DialogFooter>
                        <Button
                            type='button'
                            onClick={handleClose}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            disabled={formLoading}
                            className='bg-[#00824E] hover:bg-[#00824E]/90 text-white'
                        >
                            {formLoading ? 'Adding...' : 'Add User'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
