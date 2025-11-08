
import React from 'react';

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => {
  const baseClasses = "flex items-center justify-start w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500";
  const activeClasses = "bg-cyan-500/20 text-cyan-300";
  const inactiveClasses = "text-gray-400 hover:bg-gray-800 hover:text-white";

  return (
    <li>
      <button
        onClick={onClick}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      >
        <span className="mr-3">{icon}</span>
        <span className="hidden md:inline">{label}</span>
      </button>
    </li>
  );
};

export default TabButton;
