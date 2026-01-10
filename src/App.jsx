import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainChat from './components/MainChat';
import { getCurrentChatId, getChatHistory, createNewChat } from './utils/storage';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('Solance');
  const [currentChatId, setCurrentChatId] = useState(null);

  // Initialize chat on mount
  useEffect(() => {
    const initializeChat = () => {
      const savedChatId = getCurrentChatId();
      const chats = getChatHistory();
      
      // Find a chat for the current mode
      const modeChat = chats.find(chat => chat.mode === activeMode);
      
      if (modeChat) {
        setCurrentChatId(modeChat.id);
      } else if (savedChatId) {
        const savedChat = chats.find(chat => chat.id === Number(savedChatId));
        if (savedChat && savedChat.mode === activeMode) {
          setCurrentChatId(savedChat.id);
        } else {
          // Create new chat for current mode
          const newChat = createNewChat(activeMode);
          setCurrentChatId(newChat.id);
        }
      } else {
        // Create new chat
        const newChat = createNewChat(activeMode);
        setCurrentChatId(newChat.id);
      }
    };

    initializeChat();
  }, []);

  // When mode changes, find or create a chat for that mode
  useEffect(() => {
    const chats = getChatHistory();
    const modeChat = chats.find(chat => chat.mode === activeMode);
    
    if (modeChat) {
      setCurrentChatId(modeChat.id);
    } else {
      // Create new chat for the new mode
      const newChat = createNewChat(activeMode);
      setCurrentChatId(newChat.id);
    }
  }, [activeMode]);

  const handleChatChange = (chatId) => {
    setCurrentChatId(chatId);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden flex flex-col">
      <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} activeMode={activeMode} />
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          currentChatId={currentChatId}
          onChatChange={handleChatChange}
        />
        <MainChat
          activeMode={activeMode}
          currentChatId={currentChatId}
          onChatChange={handleChatChange}
        />
      </div>
    </div>
  );
}
