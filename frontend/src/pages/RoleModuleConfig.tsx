import { usePageTitle } from '../hooks/usePageTitle';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';

export default function RoleModuleConfig() {
    usePageTitle('User Roles');
    
    const currentUser = useSelector(selectCurrentUser);
    
    // Only allow access for System Admin (role_id: 1)
    if (!currentUser || currentUser.role_id !== 1) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className='p-6'>
            {/* Title */}
            <h1 
                className='font-bold mb-6'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                User Roles
            </h1>
            
            {/* Add User Roles Button */}
            <div className="mb-6 flex justify-end">
                <button
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
                    Add User Roles
                </button>
            </div>
            
            {/* Content */}
            <div 
                className='overflow-x-auto rounded-md'
                style={{
                    border: '1px solid #E4E4E7'
                }}
            >
                {/* Table */}
                <table className='min-w-full'>
                    <thead className='bg-white border-b border-gray-200'>
                        <tr>
                            <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                Name
                            </th>
                            <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                Users
                            </th>
                            <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                Permissions
                            </th>
                        </tr>
                    </thead>
                    <tbody className='bg-white'>
                        {/* Table content placeholder */}
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base">
                                No roles configured yet
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base"></td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}