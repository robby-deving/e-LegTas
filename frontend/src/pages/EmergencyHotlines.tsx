import { usePageTitle } from '../hooks/usePageTitle';

export default function EmergencyHotlines(){
    usePageTitle('Emergency Hotlines');
    
    return(
        <div className='text-black'>
            Emergency Hotlines Page
        </div>
    );
}