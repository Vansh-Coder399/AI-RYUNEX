import React from 'react';

const SidebarItem = ({ icon: Icon, label, active }) => (
    <button
        className={`group flex items-center w-full p-3 mb-2 rounded-xl transition-all duration-300 border border-transparent
    ${active
                ? 'bg-white/10 border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                : 'hover:bg-white/5 hover:border-purple-500/30 hover:translate-x-1'
            }`}
    >
        <Icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${active ? 'text-[#22d3ee]' : 'text-gray-400 group-hover:text-[#22d3ee]'}`} />
        <span className={`text-sm font-medium transition-colors duration-300 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
            {label}
        </span>
    </button>
);

export default SidebarItem;