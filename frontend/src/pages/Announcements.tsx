import { usePageTitle } from '../hooks/usePageTitle';

export default function Announcements(){
        usePageTitle('Announcements');
    
    return(
        <div className='text-black'>
            Announcements Page
        </div>
    );
}