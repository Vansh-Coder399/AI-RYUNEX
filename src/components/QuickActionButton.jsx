import React from 'react';

const QuickActionButton = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:border-purple-500/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all duration-300 group whitespace-nowrap">
    <Icon className="w-4 h-4 text-purple-400 group-hover:text-[#22d3ee] transition-colors" />
    <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{label}</span>
  </button>
);

export default QuickActionButton;