import { usePageTitle } from '../hooks/usePageTitle';

export default function Reports(){
    usePageTitle('Reports');

    return(
        <div className='text-black'>
            Reports Page
        </div>
    );
}