import { usePageTitle } from '../hooks/usePageTitle';

export default function Dashboard(){
    usePageTitle('Dashboard');
    return (
        <div>
            <h1>Dashboard</h1>
        </div>
    );
}