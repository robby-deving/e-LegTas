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
        `relative flex items-center gap-3 px-5 py-2 rounded-sm font-medium transition-all duration-300 ease-in-out group
        ${isActive ? 'bg-[#0C955B] text-white' : 'text-black hover:bg-gray-100'}`
      }
    >
      {({ isActive }) => (
        <>
          <img 
            className={`h-4.5 w-4.5 flex-shrink-0 transition-all duration-300 ease-in-out ${isActive ? 'brightness-0 invert' : 'brightness-0'}`}
            src={icon} 
            alt={label} 
          />
          <span className={`whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
            {label}
          </span>
          
          {collapsed && (
            <div className="absolute left-full ml-5 px-3 py-2 bg-[#0C955B] text-white text-sm font-medium rounded-lg shadow-xl
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          transition-all duration-200 ease-out
                          transform -translate-x-2 group-hover:translate-x-0
                          whitespace-nowrap z-[9999]
                          pointer-events-none">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}
