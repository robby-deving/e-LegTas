
import { usePageTitle } from '../hooks/usePageTitle';

export default function UserManagement(){
    usePageTitle('User Management');

    return(
        <div className='text-black'>
            User Management Page
        </div>
    );
}