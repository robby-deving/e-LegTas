import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Edit } from "lucide-react";
import { useState } from 'react';
import profileIllustration from '../assets/profile-illustration.svg';
import EditProfileModal from '../components/modals/EditProfile';
import type { UserData } from '../components/modals/EditProfile';
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCredentials, selectCurrentUser, selectToken } from "../features/auth/authSlice";
import { usePermissions } from "../contexts/PermissionContext";
import StatusCodes from "../components/StatusCodes";

export default function Profile() {
    usePageTitle('Profile');
    const currentUser = useSelector(selectCurrentUser);
    const token = useSelector(selectToken);
    const dispatch = useDispatch();
    const { hasPermission } = usePermissions();

    // Check if user has permission to view profile
    if (!hasPermission('view_profile')) {
        return <StatusCodes code={403} />;
    }

    // Check if user has permission to update profile
    const canUpdateProfile = hasPermission('update_profile');

    // Use the actual authenticated user's ID instead of hardcoded value
    const user_id = currentUser?.user_id;

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);

    const fetchProfile = async () => {
    if (!user_id || !token) return;

    try {
        const res = await fetch(`http://localhost:3000/api/v1/profile/${user_id}`, {
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            },
        });
        const json = await res.json();

        console.log("📡 Response status:", res.status);
        console.log("📡 Response JSON:", json);

        if (res.ok) {
        setUserData({
            name: `${json.data.first_name ?? ''} ${json.data.last_name ?? ''}`.trim(),
            role: json.data.role ?? "-",
            employeeId: json.data.employee_number ?? "-",
            email: json.data.email ?? "-",
            phone: json.data.phone_number ?? "-"
        });
        } else {
        console.error("Error fetching profile:", json.message);
        }
    } catch (err) {
        console.error("Network error fetching profile:", err);
    }
    };

    useEffect(() => {
    fetchProfile();
    }, [user_id, token]); // re-fetch if userId changes

    const handleEditProfile = () => {
        // Check if user has permission to update profile
        if (!canUpdateProfile) {
            console.warn("User does not have permission to update profile");
            alert("You don't have permission to edit your profile");
            return;
        }
        
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async (updatedData: UserData) => {
        if (!user_id || !token) return;
        
        // Check if user has permission to update profile
        if (!canUpdateProfile) {
            console.warn("User does not have permission to update profile");
            alert("You don't have permission to update your profile");
            return;
        }
        
        setIsUpdating(true);

        try {
            // split "First Last ...", keep everything after first token
            const parts = updatedData.name.trim().split(/\s+/);
            const firstName = parts[0] ?? '';
            const lastName = parts.slice(1).join(' ') || '';

            const payload = {
            email: updatedData.email,
            phone_number: updatedData.phone.replace(/[^\d]/g, ''), // digits only
            first_name: firstName,
            last_name: lastName
            };

            const res = await fetch(`http://localhost:3000/api/v1/profile/${user_id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed to update profile');

            // refetch from backend for truth
            await fetchProfile();

            dispatch(setCredentials({
            user: {
                ...currentUser, // keep existing fields
                first_name: firstName,
                last_name: lastName,
                email: updatedData.email
            },
            token
            }));

            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(error.message ?? 'Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

    if (!userData) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-center"> 
                <div className="text-lg text-gray-500 max-w-2xl">
                    Loading profile...
                </div>
            </div>
        );
    }

    return (
        <div className="text-black p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-3xl font-bold text-green-800">Profile</h1>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Profile Information Card */}
                <Card className="border border-gray-200 shadow-sm">
                    <CardContent>
                        <div className="flex items-start gap-8 p-2">
                            <div className="flex-1 space-y-3">
                                {/* Role Badge */}
                                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-green-100">
                                    <span className="text-sm font-bold text-green-600">{userData.role}</span>
                                </div>

                                {/* User Name */}
                                <h2 className="text-3xl font-bold text-gray-900">{userData.name}</h2>

                                {/* Contact Information */}
                                <div className="space-y-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 mb-1">Employee ID:</span>
                                        <span className="text-gray-900 font-medium">{userData.employeeId}</span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 mb-1">Email Address:</span>
                                        <span className="text-gray-900 font-medium">{userData.email}</span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 mb-1">Phone Number:</span>
                                        <span className="text-gray-900 font-medium">{userData.phone}</span>
                                    </div>
                                </div>

                                {/* Edit Profile Button - Only visible with update_profile permission */}
                                {canUpdateProfile && (
                                    <div className="pt-3">
                                        <Button 
                                            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
                                            onClick={handleEditProfile}
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Profile
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Right Side - Illustration */}
                            <div className="w-75 flex-shrink-0 self-stretch">
                                <img 
                                    src={profileIllustration} 
                                    alt="Profile Illustration" 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Profile Modal */}
            <EditProfileModal
                isOpen={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                userData={userData}
                onSave={handleSaveProfile}
                isUpdating={isUpdating}
            />
        </div>
    );
}