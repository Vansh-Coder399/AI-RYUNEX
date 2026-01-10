import React from 'react';
import { MenuIcon, XIcon, SparklesIcon } from './Icons';

export default function Header({ isSidebarOpen, setIsSidebarOpen, activeMode }) {
  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-[#0b0f1a]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 md:px-6 transition-all duration-300">

      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-[#22d3ee] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              RYUNEX AI
            </span>
          </h1>
          <span className="text-[10px] text-gray-400 tracking-wider uppercase hidden sm:block">Your Smart AI Companion</span>
        </div>
      </div>

      {/* Center: Mode Indicator */}
      <div className="hidden md:flex items-center px-4 py-1.5 rounded-full bg-purple-900/20 border border-purple-500/30 shadow-[0_0_10px_rgba(147,51,234,0.1)]">
        <SparklesIcon className="w-3.5 h-3.5 text-[#22d3ee] mr-2 animate-pulse" />
        <span className="text-xs font-medium text-purple-100">Mode: <span className="text-[#22d3ee]">{activeMode}</span></span>
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all group cursor-default">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,199,89,0.6)] group-hover:scale-110 transition-transform"></div>
          <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Online</span>
        </div>

        {/* Window Icons (Visual) */}
        <div className="hidden sm:flex gap-2">
          <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-[#22d3ee] hover:shadow-[0_0_8px_#22d3ee] transition-all duration-300 cursor-pointer"></div>
          <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-purple-500 hover:shadow-[0_0_8px_purple] transition-all duration-300 cursor-pointer"></div>
        </div>
      </div>
    </header>
  );
}