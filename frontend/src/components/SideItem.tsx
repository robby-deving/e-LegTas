import { NavLink } from 'react-router-dom';

type SideItemProps = {
  icon: string;
  label: string;
  to: string;
  collapsed: boolean;
};

export default function SideItem({ icon, label, to, collapsed }: SideItemProps) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`group relative flex items-center transition-colors px-5 py-2 rounded-sm
            ${isActive ? 'bg-[#0C955B] text-white' : 'text-black hover:bg-gray-100'}
            ${collapsed ? 'justify-center px-2' : 'gap-3'}`}
        >
          <img
            src={icon}
            alt={`${label} icon`}
            className={`w-6 h-6 object-contain ${isActive ? 'filter brightness-0 invert' : ''}`}
          />
          {!collapsed && (
            <span className="text-l font-medium whitespace-nowrap">{label}</span>
          )}

          {/* tool tip */}
          {collapsed && (
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-4 z-10 opacity-0 group-hover:opacity-100
              bg-green-100 text-green-800 text-xs font-medium rounded px-3 py-1  transition-opacity duration-300 pointer-events-none whitespace-nowrap">
              {label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
}
