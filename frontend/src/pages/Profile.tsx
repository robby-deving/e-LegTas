import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Edit } from "lucide-react";
import { useState } from 'react';
import profileIllustration from '../assets/profile-illustration.svg';
import EditProfileModal from '../components/modals/EditProfile';
import type { UserData } from '../components/modals/EditProfile';

export default function Profile() {
    usePageTitle('Profile');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Mock user data - in real app, this would come from context or API
    const [userData, setUserData] = useState<UserData>({
        name: "Juan dela Cruz",
        role: "CDRRMO",
        employeeId: "XYZ0106198502",
        email: "cdrrmo1@gmail.com",
        phone: "09123456789"
    });

    const handleEditProfile = () => {
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async (updatedData: UserData) => {
        setIsUpdating(true);
        
        try {
            // Simulate API call
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 1000);
            });

            // Update the user data (but keep the role unchanged)
            setUserData({
                ...updatedData,
                role: userData.role // Keep the original role
            });
            setIsEditModalOpen(false);
            
        } catch (error) {
            console.error('Error updating profile:', error);
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
                            {/* Left Side - User Details */}
                            <div className="flex-1 space-y-3">
                                {/* Role Badge */}
                                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-green-100">
                                    <span className="text-sm font-bold text-green-600">{userData.role}</span>
                                </div>

                                {/* User Name */}
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">{userData.name}</h2>
                                </div>

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