import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SidebarItem from './SidebarItem';
import { StudentIcon, CodeIcon, LeafIcon, TargetIcon, SparklesIcon } from './Icons';
import {
  getChatHistory,
  createNewChat,
  deleteChat,
  getDailyUsage,
  MAX_DAILY_MESSAGES
} from '../utils/storage';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, activeMode, setActiveMode, currentChatId, onChatChange }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [dailyUsage, setDailyUsage] = useState(getDailyUsage());

  // Load chat history and filter by current mode
  useEffect(() => {
    const loadHistory = () => {
      const allChats = getChatHistory();
      // Filter chats by current mode
      const modeChats = allChats.filter(chat => chat.mode === activeMode);
      setChatHistory(modeChats);
    };

    loadHistory();
    
    // Reload on mode change or periodically
    const interval = setInterval(() => {
      loadHistory();
      setDailyUsage(getDailyUsage());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMode]);

  const handleNewChat = () => {
    const newChat = createNewChat(activeMode);
    setChatHistory(prev => [newChat, ...prev]);
    if (onChatChange) {
      onChatChange(newChat.id);
    }
  };

  const handleChatClick = (chatId) => {
    if (onChatChange) {
      onChatChange(chatId);
    }
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    const updatedChats = deleteChat(chatId);
    const modeChats = updatedChats.filter(chat => chat.mode === activeMode);
    setChatHistory(modeChats);

    // If deleted chat was current, switch to first available or create new
    if (chatId === currentChatId) {
      if (modeChats.length > 0) {
        if (onChatChange) onChatChange(modeChats[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  // Calculate usage percentage
  const usagePercent = Math.min((dailyUsage.count / MAX_DAILY_MESSAGES) * 100, 100);

  return (
    <>
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0b0f1a]/95 md:bg-[#0b0f1a]/50 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          top-16 h-[calc(100vh-4rem)]`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {/* New Chat Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewChat}
            className="w-full mb-6 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-[#22d3ee] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-4 h-4" />
            New Chat
          </motion.button>

          {/* Mode Selection */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Modes</h3>
            <div onClick={() => setActiveMode('Student')}>
              <SidebarItem icon={StudentIcon} label="Student Mode" active={activeMode === 'Student'} />
            </div>
            <div onClick={() => setActiveMode('Coder')}>
              <SidebarItem icon={CodeIcon} label="Coder Mode" active={activeMode === 'Coder'} />
            </div>
            <div onClick={() => setActiveMode('Chill')}>
              <SidebarItem icon={LeafIcon} label="Chill Mode" active={activeMode === 'Chill'} />
            </div>
            <div onClick={() => setActiveMode('Solance')}>
              <SidebarItem icon={TargetIcon} label="Solance Mode" active={activeMode === 'Solance'} />
            </div>
          </div>

          {/* Chat History */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">History</h3>
            <div className="space-y-1">
              {chatHistory.length === 0 ? (
                <p className="text-xs text-gray-500 px-2">No chat history for {activeMode} mode</p>
              ) : (
                chatHistory.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 2 }}
                    onClick={() => handleChatClick(chat.id)}
                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all
                      ${
                        chat.id === currentChatId
                          ? 'bg-white/10 border border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                          : 'hover:bg-white/5 hover:border-purple-500/30 border border-transparent'
                      }`}
                  >
                    <span className="truncate text-sm max-w-[160px] text-gray-300">
                      {chat.title || `Chat ${new Date(chat.createdAt).toLocaleTimeString()}`}
                    </span>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity px-2 text-lg"
                      title="Delete Chat"
                    >
                      ×
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Usage & Footer */}
        <div className="p-4 border-t border-white/10 bg-gradient-to-b from-transparent to-black/20">
          <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-medium text-gray-400">Daily Usage</span>
              <span className="text-[10px] text-[#22d3ee] font-bold">
                {dailyUsage.count} / {MAX_DAILY_MESSAGES}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full ${
                  usagePercent >= 100
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-purple-600 to-[#22d3ee]'
                } shadow-[0_0_10px_rgba(34,211,238,0.4)]`}
              />
            </div>
            {usagePercent >= 100 && (
              <p className="text-[10px] text-red-400 mt-1 text-center">
                Limit reached. Resets at midnight.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  );
}
