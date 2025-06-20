import { usePageTitle } from '../hooks/usePageTitle';
export default function Dashboard(){
    usePageTitle('Dashboard');
    return(
        <div className='text-black'>
            Dashboard Page
        </div>
    );
}