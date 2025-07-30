import { usePageTitle } from '../hooks/usePageTitle';
import { useState } from 'react';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function UserManagement(){
    usePageTitle('User Management');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRows, setSelectedRows] = useState(0);

    // Sample data for the table
    const sampleUsers = [
        {
            id: 1,
            user: 'John Doe',
            email: 'john.doe@email.com',
            role: 'CAMP MANAGER',
            evacuationCenter: 'Albay Cathedral and Pastoral Center'
        },
        {
            id: 2,
            user: 'Jane Smith',
            email: 'jane.smith@email.com',
            role: 'BARANGAY OFFICER',
            evacuationCenter: 'Bicol University'
        },
        {
            id: 3,
            user: 'Mike Johnson',
            email: 'mike.johnson@email.com',
            role: 'CAMP MANAGER',
            evacuationCenter: 'UST Legazpi Dome'
        }
    ];

    const totalRows = 100;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

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
                            {sampleUsers.map((user, index) => (
                                <tr 
                                    key={user.id} 
                                    className={`hover:bg-gray-50 ${index !== sampleUsers.length - 1 ? 'border-b border-gray-200' : ''}`}
                                >
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='text-base font-medium text-gray-900'>
                                            {user.user}
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
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap text-base text-gray-900'>
                                        {user.evacuationCenter}
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap text-right text-base font-medium'>
                                        <button className='text-gray-400 hover:text-gray-600'>
                                            <MoreHorizontal className='h-5 w-5' />
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
                                    onClick={() => setIsAddUserModalOpen(false)}
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
                            <form className='space-y-4'>
                                {/* Row 1: First Name | Middle Name */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-semibold text-black mb-1'>
                                            First Name
                                        </label>
                                        <input
                                            type='text'
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter first name'
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Middle Name
                                        </label>
                                        <input
                                            type='text'
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
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter last name'
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Suffix
                                        </label>
                                        <input
                                            type='text'
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
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
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
                                        <input
                                            type='text'
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter barangay'
                                        />
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
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter employee number'
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Birthdate
                                        </label>
                                        <input
                                            type='date'
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
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
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        placeholder='Enter email address'
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Password
                                    </label>
                                    <input
                                        type='password'
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        placeholder='Enter password'
                                    />
                                </div>

                                {/* Role */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Role
                                    </label>
                                    <select
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                    >
                                        <option value=''>Select a role</option>
                                        <option value='CAMP MANAGER'>CAMP MANAGER</option>
                                        <option value='BARANGAY OFFICER'>BARANGAY OFFICER</option>
                                    </select>
                                </div>

                                {/* Assigned Evacuation Center */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Assigned Evacuation Center
                                    </label>
                                    <select
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                    >
                                        <option value=''>Select an evacuation center</option>
                                        <option value='Albay Cathedral and Pastoral Center'>Albay Cathedral and Pastoral Center</option>
                                        <option value='Albay Central School'>Albay Central School</option>
                                        <option value='AMEC BCCM'>AMEC BCCM</option>
                                        <option value='Arimbay Chapel'>Arimbay Chapel</option>
                                        <option value='Arimbay Elementary School'>Arimbay Elementary School</option>
                                        <option value='Bagacay Elementary School'>Bagacay Elementary School</option>
                                        <option value='Bagong Abre Elementary School'>Bagong Abre Elementary School</option>
                                        <option value='Bagumbayan Central School'>Bagumbayan Central School</option>
                                        <option value='Bagumbayan Evacuation Center'>Bagumbayan Evacuation Center</option>
                                        <option value='Banquerohan Elementary School'>Banquerohan Elementary School</option>
                                        <option value='Banquerohan Nation HighSchool'>Banquerohan Nation HighSchool</option>
                                        <option value='Bariis Elementary School'>Bariis Elementary School</option>
                                        <option value='BFP Building'>BFP Building</option>
                                        <option value='Bicol University'>Bicol University</option>
                                        <option value='Bigaa Elementary School'>Bigaa Elementary School</option>
                                        <option value='Bigaa Pastoral Center'>Bigaa Pastoral Center</option>
                                        <option value='Bitano Elementary School'>Bitano Elementary School</option>
                                        <option value='Bogña Elementary School'>Bogña Elementary School</option>
                                        <option value='Bogtong Elementary School'>Bogtong Elementary School</option>
                                        <option value='Buenavista Elementary School'>Buenavista Elementary School</option>
                                        <option value='Buraguis Elementary School'>Buraguis Elementary School</option>
                                        <option value='Buraguis Evacuation Center'>Buraguis Evacuation Center</option>
                                        <option value='Buyoan Elementary School'>Buyoan Elementary School</option>
                                        <option value='Cabagñan Elementary School'>Cabagñan Elementary School</option>
                                        <option value='Cabagñan High School'>Cabagñan High School</option>
                                        <option value='Cagbacong Elementary School'>Cagbacong Elementary School</option>
                                        <option value='Dapdap Elementary School'>Dapdap Elementary School</option>
                                        <option value='Dita Elementary School'>Dita Elementary School</option>
                                        <option value='Divine Word High School Gymnasium'>Divine Word High School Gymnasium</option>
                                        <option value='Don Bosco Agro-Mechanical Technology Center'>Don Bosco Agro-Mechanical Technology Center</option>
                                        <option value='DZGB Radio Station'>DZGB Radio Station</option>
                                        <option value="EM's Barrio Elementary School">EM's Barrio Elementary School</option>
                                        <option value='Estanza Elementary School'>Estanza Elementary School</option>
                                        <option value='Genecom'>Genecom</option>
                                        <option value='Gogon Central School'>Gogon Central School</option>
                                        <option value='Gogon Evacuation Center'>Gogon Evacuation Center</option>
                                        <option value='Gogon JICA building'>Gogon JICA building</option>
                                        <option value='Gogon High School'>Gogon High School</option>
                                        <option value='Homapon Elementary School'>Homapon Elementary School</option>
                                        <option value='Homapon Highschool'>Homapon Highschool</option>
                                        <option value='Ibalon Central School'>Ibalon Central School</option>
                                        <option value='Imalnod Elementary School'>Imalnod Elementary School</option>
                                        <option value='Lamba Elementary School'>Lamba Elementary School</option>
                                        <option value='Legazpi City PAGCOR Multi-purpose Evacuation Center (2 flrs)'>Legazpi City PAGCOR Multi-purpose Evacuation Center (2 flrs)</option>
                                        <option value='Legazpi City Evacuation Center'>Legazpi City Evacuation Center</option>
                                        <option value='Legazpi City Science High School'>Legazpi City Science High School</option>
                                        <option value='Legazpi Port Elementary School'>Legazpi Port Elementary School</option>
                                        <option value='Mabinit Elementary School'>Mabinit Elementary School</option>
                                        <option value='Mariawa Elementary School'>Mariawa Elementary School</option>
                                        <option value='Maoyod Social Hall'>Maoyod Social Hall</option>
                                        <option value='Maslog Elementary School'>Maslog Elementary School</option>
                                        <option value='Maslog High School'>Maslog High School</option>
                                        <option value='Matanag Elementary School'>Matanag Elementary School</option>
                                        <option value='Meriam College of Technology, Inc.'>Meriam College of Technology, Inc.</option>
                                        <option value='NFA Building'>NFA Building</option>
                                        <option value='Oro Site HighSchool'>Oro Site HighSchool</option>
                                        <option value='Padang Elementary School'>Padang Elementary School</option>
                                        <option value='Pag asa Natl High School'>Pag asa Natl High School</option>
                                        <option value='Pawa Elementary School'>Pawa Elementary School</option>
                                        <option value='Pawa High School'>Pawa High School</option>
                                        <option value='Phil. Coast Guard'>Phil. Coast Guard</option>
                                        <option value='Population Commission'>Population Commission</option>
                                        <option value='Puro Elementary School'>Puro Elementary School</option>
                                        <option value='Rawis Elementary School'>Rawis Elementary School</option>
                                        <option value='Reyes Computer Oriented School'>Reyes Computer Oriented School</option>
                                        <option value='San Francisco Elementary School'>San Francisco Elementary School</option>
                                        <option value='San Joaquin Elementary School'>San Joaquin Elementary School</option>
                                        <option value='San Roque Elementary School'>San Roque Elementary School</option>
                                        <option value='SLTFI'>SLTFI</option>
                                        <option value='St. Raphael Pastoral Center'>St. Raphael Pastoral Center</option>
                                        <option value='St. Raphael Academy'>St. Raphael Academy</option>
                                        <option value='Tamaoyan Elementary School'>Tamaoyan Elementary School</option>
                                        <option value='Taysan Elementary School'>Taysan Elementary School</option>
                                        <option value='Taysan Resettlement Integrated School'>Taysan Resettlement Integrated School</option>
                                        <option value='UST Legazpi Dome'>UST Legazpi Dome</option>
                                        <option value='Victory Village Elementary School'>Victory Village Elementary School</option>
                                        <option value='Washington International School'>Washington International School</option>
                                        <option value='Wesleyan Church'>Wesleyan Church</option>
                                    </select>
                                </div>
                            </form>

                            {/* Modal Footer */}
                            <div className='flex justify-end gap-3 mt-6 pt-4'>
                                <button
                                    onClick={() => setIsAddUserModalOpen(false)}
                                    className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none'
                                >
                                    Cancel
                                </button>
                                <button
                                    className='px-4 py-2 text-white rounded-md hover:opacity-90 focus:outline-none'
                                    style={{ backgroundColor: '#00824E' }}
                                >
                                    Add User
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}