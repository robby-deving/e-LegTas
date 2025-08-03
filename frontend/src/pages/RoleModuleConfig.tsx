import { usePageTitle } from '../hooks/usePageTitle';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';

export default function RoleModuleConfig() {
    usePageTitle('Role & Module Configuration');
    
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
                Role & Module Configuration
            </h1>
            
            {/* Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center py-12">
                    <div className="mb-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Role & Module Configuration
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Manage roles, permissions, and module access configurations for the system. 
                        Configure which roles can access specific modules and features.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-blue-800 text-sm">
                            🚧 This feature is under development and will be available soon.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}