import { NavLink } from 'react-router-dom';

interface SideItemProps {
  collapsed: boolean;
  icon: string;
  label: string;
  to: string;
}

export default function SideItem({ collapsed, icon, label, to }: SideItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-5 py-2 rounded-sm font-medium overflow-hidden transition-all duration-300 ease-in-out
        ${isActive ? 'bg-[#1CA567] text-white' : 'text-black hover:bg-gray-100'}`
      }
    >
      {({ isActive }) => (
        <>
          <img 
            className={`h-4.5 w-4.5 flex-shrink-0 transition-all duration-300 ease-in-out ${isActive ? 'brightness-0 invert' : 'brightness-0'}`}
            src={icon} 
            alt={label} 
          />
          <span className={`whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
