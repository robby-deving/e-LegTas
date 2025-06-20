import { usePageTitle } from '../hooks/usePageTitle';

export default function Evacuees(){
    usePageTitle('Evacuee Information');

    return(
        <div className='text-black'>
            Evacuee Information Page
        </div>
    );
}