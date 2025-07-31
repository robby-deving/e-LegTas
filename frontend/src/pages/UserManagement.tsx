import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect } from 'react';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface User {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    sex: string;
    barangay_of_origin: string;
    employee_number: string;
    birthdate: string;
    email: string;
    role_id: number;
    role_name?: string;
    assigned_evacuation_center?: string;
}

export default function UserManagement(){
    usePageTitle('User Management');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRows, setSelectedRows] = useState(0);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [barangays, setBarangays] = useState<{id: number; name: string}[]>([]);
    const [evacuationCenters, setEvacuationCenters] = useState<{id: number; name: string}[]>([]);
    
    // Form state
    const [formData, setFormData] = useState({
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
        assigned_evacuation_center: ''
    });

    // Fetch users from backend
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:3000/api/v1/users/cswdo');
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch users: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Transform the backend data to match frontend format
                const transformedUsers = data.users
                    .filter((user: any) => user.users_profile && user.users_profile.residents) // Filter out users without complete profile data
                    .map((user: any) => ({
                        id: user.id,
                        first_name: user.users_profile.residents.first_name,
                        middle_name: user.users_profile.residents.middle_name,
                        last_name: user.users_profile.residents.last_name,
                        suffix: user.users_profile.residents.suffix,
                        sex: user.users_profile.residents.sex,
                        barangay_of_origin: user.users_profile.residents.barangays?.name || 'Unknown',
                        employee_number: user.employee_number,
                        birthdate: user.users_profile.residents.birthdate,
                        email: user.users_profile.email,
                        role_id: user.users_profile.role_id,
                        role_name: user.users_profile.roles?.role_name,
                        assigned_evacuation_center: user.assigned_evacuation_center || null // Get from backend or null
                    }));
                
                setUsers(transformedUsers);
                setFilteredUsers(transformedUsers);
                setError(null);
            } catch (err) {
                console.error('Error fetching users:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Fetch barangays from backend
    useEffect(() => {
        const fetchBarangays = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/v1/users/data/barangays');
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch barangays: ${response.status}`);
                }
                
                const data = await response.json();
                setBarangays(data.barangays || []);
            } catch (err) {
                console.error('Error fetching barangays:', err);
                // Set some default barangays if fetch fails
                setBarangays([
                    { id: 1, name: 'Barangay 1' },
                    { id: 2, name: 'Barangay 2' },
                    { id: 3, name: 'Barangay 3' }
                ]);
            }
        };

        fetchBarangays();
    }, []);

    // Fetch evacuation centers from backend
    useEffect(() => {
        const fetchEvacuationCenters = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/v1/users/data/evacuation-centers');
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch evacuation centers: ${response.status}`);
                }
                
                const data = await response.json();
                setEvacuationCenters(data.centers?.map((center: any) => ({
                    id: center.id,
                    name: center.name
                })) || []);
            } catch (err) {
                console.error('Error fetching evacuation centers:', err);
                // Set some default evacuation centers if fetch fails
                setEvacuationCenters([
                    { id: 1, name: 'Legazpi Elementary School' },
                    { id: 2, name: 'Legazpi High School' },
                    { id: 3, name: 'Bicol University Gymnasium' }
                ]);
            }
        };

        fetchEvacuationCenters();
    }, []);

    // Filter users based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user => {
                const fullName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.toLowerCase();
                const email = user.email.toLowerCase();
                const role = (user.role_name || '').toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                
                return fullName.includes(searchLower) || 
                       email.includes(searchLower) || 
                       role.includes(searchLower);
            });
            setFilteredUsers(filtered);
        }
        setCurrentPage(1); // Reset to first page when searching
    }, [searchTerm, users]);

    // Get the display name for a user
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

    // Get role display name
    const getRoleDisplayName = (roleId: number, roleName: string | undefined) => {
        // Map backend role names to display names
        if (roleName) {
            switch (roleName.toLowerCase()) {
                case 'cswdo':
                    return 'CSWDO';
                case 'camp manager':
                    return 'CAMP MANAGER';
                default:
                    return roleName.toUpperCase();
            }
        }
        
        // Fallback to role_id mapping if role name is not available
        if (roleId === 4) return 'CSWDO';
        if (roleId === 5) return 'CAMP MANAGER';
        return 'UNKNOWN ROLE';
    };

    const totalRows = filteredUsers.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    
    // Get paginated users
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Handle form input changes
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        
        try {
            const response = await fetch('http://localhost:3000/api/v1/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.first_name,
                    middleName: formData.middle_name,
                    lastName: formData.last_name,
                    suffix: formData.suffix,
                    sex: formData.sex,
                    birthdate: formData.birthdate,
                    barangayOfOrigin: formData.barangay_of_origin,
                    employeeNumber: formData.employee_number,
                    email: formData.email,
                    password: formData.password,
                    roleId: parseInt(formData.role_id),
                    assignedEvacuationCenter: formData.assigned_evacuation_center
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

            // Reset form and close modal
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
                assigned_evacuation_center: ''
            });
            setIsAddUserModalOpen(false);
            
            // Refresh users list
            const usersResponse = await fetch('http://localhost:3000/api/v1/users/cswdo');
            const usersData = await usersResponse.json();
            
            // Apply the same transformation as in the initial fetch
            const transformedUsers = usersData.users
                .filter((user: any) => user.users_profile && user.users_profile.residents)
                .map((user: any) => ({
                    id: user.id,
                    first_name: user.users_profile.residents.first_name,
                    middle_name: user.users_profile.residents.middle_name,
                    last_name: user.users_profile.residents.last_name,
                    suffix: user.users_profile.residents.suffix,
                    sex: user.users_profile.residents.sex,
                    barangay_of_origin: user.users_profile.residents.barangays?.name || 'Unknown',
                    employee_number: user.employee_number,
                    birthdate: user.users_profile.residents.birthdate,
                    email: user.users_profile.email,
                    role_id: user.users_profile.role_id,
                    role_name: user.users_profile.roles?.role_name,
                    assigned_evacuation_center: user.assigned_evacuation_center || null
                }));
            
            setUsers(transformedUsers);
            setFilteredUsers(transformedUsers);
            
        } catch (err) {
            console.error('Error creating user:', err);
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setFormLoading(false);
        }
    };

    // Reset form when modal is closed
    const handleCloseModal = () => {
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
            assigned_evacuation_center: ''
        });
        setIsAddUserModalOpen(false);
    };

    return(
        <div className='p-6'>
            {/* Title */}
            <h1 
                className='font-bold mb-6'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                User Management
            </h1>
            
            {/* Accounts Tab */}
            <div>
                <div className='border-b border-gray-200'>
                    <nav className='-mb-px flex'>
                        <button 
                            className='py-2 px-4 border-b-2 border-[#00824E] text-[#00824E] font-medium text-base focus:outline-none'
                        >
                            Accounts
                        </button>
                    </nav>
                </div>
                
                {/* Search Box and Add User Button */}
                <div className='mt-4 mb-4 flex justify-between items-center'>
                    <div className='relative w-72'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                            <Search className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                            type='text'
                            placeholder='Search'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='block w-full pl-10 pr-3 py-2 leading-5 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E] sm:text-sm'
                            style={{
                                borderRadius: '6px',
                                border: '1px solid #E4E4E7',
                                background: '#FFF',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                        />
                    </div>
                    
                    {/* Add User Button */}
                    <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className='inline-flex items-center gap-2 px-4 py-2 text-white font-medium text-base rounded-md hover:opacity-90 transition-opacity focus:outline-none'
                        style={{
                            backgroundColor: '#00824E'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <g clipPath="url(#clip0_876_48038)">
                                <path d="M7.0013 12.8327C10.223 12.8327 12.8346 10.221 12.8346 6.99935C12.8346 3.77769 10.223 1.16602 7.0013 1.16602C3.77964 1.16602 1.16797 3.77769 1.16797 6.99935C1.16797 10.221 3.77964 12.8327 7.0013 12.8327Z" stroke="#F8FAFC" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7 4.66602V9.33268" stroke="#F8FAFC" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M4.66797 7H9.33464" stroke="#F8FAFC" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                            </g>
                            <defs>
                                <clipPath id="clip0_876_48038">
                                    <rect width="14" height="14" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        Add User
                    </button>
                </div>
                
                {/* Users Table */}
                <div 
                    className='overflow-x-auto rounded-md'
                    style={{
                        border: '1px solid #E4E4E7'
                    }}
                >
                    <table className='min-w-full'>
                        <thead className='bg-white border-b border-gray-200'>
                            <tr>
                                <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                    User
                                </th>
                                <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                    Role
                                </th>
                                <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                    Assigned Evacuation Center
                                </th>
                                <th className='px-6 py-3 text-right text-base font-medium text-gray-500'>
                                    {/* Empty header for actions column */}
                                </th>
                            </tr>
                        </thead>
                        <tbody className='bg-white'>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className='px-6 py-8 text-center text-gray-500'>
                                        Loading users...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={4} className='px-6 py-8 text-center text-red-500'>
                                        Error: {error}
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className='px-6 py-8 text-center text-gray-500'>
                                        {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, index) => (
                                    <tr 
                                        key={user.id} 
                                        className={`hover:bg-gray-50 ${index !== paginatedUsers.length - 1 ? 'border-b border-gray-200' : ''}`}
                                    >
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='text-base font-medium text-gray-900'>
                                                {getDisplayName(user)}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <span 
                                                className='inline-flex px-4.5 py-1 text-base font-extrabold rounded-lg'
                                                style={{
                                                    color: '#038B53',
                                                    background: '#DAFFF0'
                                                }}
                                            >
                                                {getRoleDisplayName(user.role_id, user.role_name)}
                                            </span>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-base text-gray-900'>
                                            {user.assigned_evacuation_center || 'Not assigned'}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-right text-base font-medium'>
                                            <button className='text-gray-400 hover:text-gray-600'>
                                                <MoreHorizontal className='h-5 w-5' />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div 
                    className='flex items-center justify-between px-6 py-3 pt-5 bg-white'
                    style={{
                        border: '1px solid #E4E4E7',
                        borderTop: 'none',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                    }}
                >
                    <div className='flex items-center gap-4'>
                        <span className='text-base text-gray-500'>
                            {selectedRows} of {totalRows} row(s) selected.
                        </span>
                    </div>
                    
                    <div className='flex items-center gap-6'>
                        <div className='flex items-center gap-2'>
                            <span className='text-base text-gray-700'>Rows per page</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                className='border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E] gap-20 mr-10'
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <span className='text-base text-gray-700'>
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className='flex items-center gap-1'>
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronsLeft className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronRight className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronsRight className='h-4 w-4' />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                    <div 
                        className='fixed inset-0 flex items-center justify-center z-50'
                        style={{
                            background: 'rgba(211, 211, 211, 0.80)'
                        }}
                    >
                        <div className='bg-white rounded-lg p-6 w-[700px] shadow-lg max-h-[90vh] overflow-y-auto'>
                            {/* Modal Header */}
                            <div className='flex items-center justify-between mb-6'>
                                <h2 
                                    className='text-xl font-bold'
                                    style={{ color: '#0C955B' }}
                                >
                                    Add User
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className='hover:bg-gray-100 p-1 rounded'
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                                        <g opacity="0.7">
                                            <path d="M12 4.5L4 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M4 4.5L12 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                        </g>
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Form */}
                            <form className='space-y-4' onSubmit={handleSubmit}>
                                {/* Row 1: First Name | Middle Name */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-semibold text-black mb-1'>
                                            First Name
                                        </label>
                                        <input
                                            type='text'
                                            name='first_name'
                                            value={formData.first_name}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter first name'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Middle Name
                                        </label>
                                        <input
                                            type='text'
                                            name='middle_name'
                                            value={formData.middle_name}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter middle name'
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Last Name | Suffix */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Last Name
                                        </label>
                                        <input
                                            type='text'
                                            name='last_name'
                                            value={formData.last_name}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter last name'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Suffix
                                        </label>
                                        <input
                                            type='text'
                                            name='suffix'
                                            value={formData.suffix}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter suffix (optional)'
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Sex | Barangay of Origin */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Sex
                                        </label>
                                        <select
                                            name='sex'
                                            value={formData.sex}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        >
                                            <option value=''>Select sex</option>
                                            <option value='Male'>Male</option>
                                            <option value='Female'>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Barangay of Origin
                                        </label>
                                        <select
                                            name='barangay_of_origin'
                                            value={formData.barangay_of_origin}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        >
                                            <option value=''>Select barangay</option>
                                            {barangays.map((barangay) => (
                                                <option key={barangay.id} value={barangay.id}>
                                                    {barangay.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 4: Employee Number | Birthdate */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Employee Number
                                        </label>
                                        <input
                                            type='text'
                                            name='employee_number'
                                            value={formData.employee_number}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter employee number'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Birthdate
                                        </label>
                                        <input
                                            type='date'
                                            name='birthdate'
                                            value={formData.birthdate}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Email
                                    </label>
                                    <input
                                        type='email'
                                        name='email'
                                        value={formData.email}
                                        onChange={handleFormChange}
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        placeholder='Enter email address'
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Password
                                    </label>
                                    <input
                                        type='password'
                                        name='password'
                                        value={formData.password}
                                        onChange={handleFormChange}
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        placeholder='Enter password'
                                        required
                                    />
                                </div>

                                {/* Role */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Role
                                    </label>
                                    <select
                                        name='role_id'
                                        value={formData.role_id}
                                        onChange={handleFormChange}
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        required
                                    >
                                        <option value=''>Select a role</option>
                                        <option value='4'>CSWDO</option>
                                        <option value='5'>CAMP MANAGER</option>
                                    </select>
                                </div>

                                {/* Assigned Evacuation Center */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Assigned Evacuation Center
                                    </label>                                        <select
                                        name='assigned_evacuation_center'
                                        value={formData.assigned_evacuation_center}
                                        onChange={handleFormChange}
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                    >
                                        <option value=''>Select an evacuation center</option>
                                        {evacuationCenters.map((center) => (
                                            <option key={center.id} value={center.name}>
                                                {center.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Modal Footer - Inside Form */}
                                <div className='flex justify-end gap-3 mt-6 pt-4'>
                                    <button
                                        type='button'
                                        onClick={handleCloseModal}
                                        className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='submit'
                                        disabled={formLoading}
                                        className='px-4 py-2 text-white rounded-md hover:opacity-90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
                                        style={{ backgroundColor: '#00824E' }}
                                    >
                                        {formLoading ? 'Adding...' : 'Add User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}