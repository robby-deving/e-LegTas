import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Edit } from "lucide-react";
import { useState } from 'react';
import profileIllustration from '../assets/profile-illustration.svg';
import EditProfileModal from '../components/modals/EditProfile';
import type { UserData } from '../components/modals/EditProfile';
import { useEffect } from "react";

export default function Profile() {
    usePageTitle('Profile');

    // Temporary hardcoded userId (will be replaced by authenticated user's ID later)
    const user_id = "32";

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    // Local state for profile
    const [userData, setUserData] = useState<UserData | null>(null);

    const fetchProfile = async () => {
    try {
        const res = await fetch(`http://localhost:3000/api/v1/profile/${user_id}`);
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
    }, [user_id]); // re-fetch if userId changes

    // useEffect(() => {
    //     const fetchProfile = async () => {
    //         try {
    //             const res = await fetch(`http://localhost:3000/api/v1/profile/${user_id}`);
    //             const json = await res.json();

    //             console.log("📡 Response status:", res.status);
    //             console.log("📡 Response JSON:", json);

    //             if (res.ok) {
    //                 // Flatten backend data into frontend format
    //                 setUserData({
    //                     name: `${json.data.first_name ?? ''} ${json.data.last_name ?? ''}`.trim(),
    //                     role: json.data.role ?? "-",
    //                     employeeId: json.data.employee_number ?? "-",
    //                     email: json.data.email ?? "-",
    //                     phone: json.data.phone_number ?? "-"
    //                 });
    //             } else {
    //                 console.error("Error fetching profile:", json.message);
    //             }
    //         } catch (err) {
    //             console.error("Network error fetching profile:", err);
    //         }
    //     };

    //     fetchProfile();
    // }, [user_id]); // re-fetch if userId changes

    if (!userData) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-center"> 
                <div className="text-lg text-gray-500 max-w-2xl">
                    Loading profile...
                </div>
            </div>
        );
    }

    const handleEditProfile = () => {
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async (updatedData: UserData) => {
        setIsUpdating(true);
        
        // try {
        //     // Simulate API call
        //     await new Promise((resolve) => {
        //         setTimeout(() => {
        //             resolve(null);
        //         }, 1000);
        //     });

        //     // Update the user data (but keep the role unchanged)
        //     setUserData({
        //         ...updatedData,
        //         role: userData.role // Keep the original role
        //     });
        //     setIsEditModalOpen(false);
            
        // } catch (error) {
        //     console.error('Error updating profile:', error);
        // } finally {
        //     setIsUpdating(false);
        // }
        try {
            // split "First Last ...", keep everything after first token as last name
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed to update profile');

            // Option A: refetch from backend for truth
            await fetchProfile();

            // Option B (optional): or optimistic update (you already had this)
            // setUserData(prev => prev ? { ...prev, ...updatedData, role: prev.role } : updatedData);

            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(error.message ?? 'Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

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

                                {/* Edit Profile Button */}
                                <div className="pt-3">
                                    <Button 
                                        className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
                                        onClick={handleEditProfile}
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Profile
                                    </Button>
                                </div>
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