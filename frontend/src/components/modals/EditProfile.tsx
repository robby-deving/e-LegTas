import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";

export type UserData = {
  name: string;
  role: string;
  employeeId: string;
  email: string;
  phone: string;
};

export type EditProfileModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userData: UserData;
  onSave: (updatedData: UserData) => void;
  isUpdating?: boolean;
};

export default function EditProfile({
  isOpen,
  onOpenChange,
  userData,
  onSave,
  isUpdating = false
}: EditProfileModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && userData) {
      const nameParts = userData.name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmployeeId(userData.employeeId);
      setEmail(userData.email);
      setPhone(userData.phone === "-" ? "" : userData.phone);
    }
  }, [isOpen, userData]);

  const handlePhoneChange = (value: string) => {
    // Only allow numbers and basic formatting
    const cleaned = value.replace(/[^0-9\s\-()]/g, '');
    setPhone(cleaned);
  };

  const handleSave = () => {
    // Reset any old error
    setErrorMessage("");

    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !employeeId.trim() || !email.trim() || !phone.trim()) {
        setErrorMessage("Please fill in all fields");
        return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrorMessage("Please enter a valid email address");
        return;
    }

    // Save the data
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const updatedData: UserData = {
      name: fullName,
      role: userData.role,
      employeeId: employeeId.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() === "" ? "-" : phone.replace(/[^\d]/g, '') // Keep only digits
    };

    onSave(updatedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                {errorMessage}
            </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">First Name:</label>
            <Input
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isUpdating}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Last Name:</label>
            <Input
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isUpdating}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Employee ID:</label>
            <Input
              placeholder="Enter employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={true}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email:</label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={true}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Phone Number:</label>
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={isUpdating}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            className="bg-green-700 hover:bg-green-800 text-white"
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}