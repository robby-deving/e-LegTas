
import { usePageTitle } from '../hooks/usePageTitle';

export default function Profile(){
    usePageTitle('Profile');

    return(
        <div className='text-black'>
            Profile Page
        </div>
    );
}