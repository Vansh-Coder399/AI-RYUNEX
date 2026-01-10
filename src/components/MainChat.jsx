import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainIcon, SparklesIcon, MicIcon, SendIcon } from './Icons';
import { callGeminiAPI } from '../utils/api';
import {
  createNewChat,
  updateChatMessages,
  getChatById,
  getDailyUsage,
  incrementDailyUsage,
  isDailyLimitReached
} from '../utils/storage';

export default function MainChat({ activeMode, currentChatId, onChatChange }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [notification, setNotification] = useState(null);
  const [dailyUsage, setDailyUsage] = useState(getDailyUsage());
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load chat when currentChatId or activeMode changes
  useEffect(() => {
    if (currentChatId) {
      const chat = getChatById(currentChatId);
      if (chat && chat.mode === activeMode) {
        setMessages(chat.messages || []);
      } else {
        // Mode changed or chat not found - create new chat
        const newChat = createNewChat(activeMode);
        setMessages([]);
        if (onChatChange) onChatChange(newChat.id);
      }
    } else {
      // No current chat - create new one
      const newChat = createNewChat(activeMode);
      setMessages([]);
      if (onChatChange) onChatChange(newChat.id);
    }
  }, [currentChatId, activeMode]);

  // Update daily usage on mount and check for midnight reset
  useEffect(() => {
    const updateUsage = () => {
      const usage = getDailyUsage();
      setDailyUsage(usage);
    };

    updateUsage();

    // Check every minute for midnight reset
    const interval = setInterval(updateUsage, 60000);

    return () => clearInterval(interval);
  }, []);

  // Smart Auto-scroll
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Only scroll if it's a new message or we are already near bottom
    // For simplicity in this non-streaming setup, we scroll on new messages
    // but we could add logic to check scrollTop if needed.
    scrollToBottom();
  }, [messages, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = async (text = inputValue) => {
    if (!text.trim() || isTyping) return;

    // Check daily limit
    if (isDailyLimitReached()) {
      setNotification("Daily limit reached (25 messages). Please come back tomorrow!");
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);
    setNotification(null);

    // Save user message immediately
    if (currentChatId) {
      updateChatMessages(currentChatId, updatedMessages);
    }

    // Increment daily usage
    const newUsage = incrementDailyUsage();
    setDailyUsage(newUsage);

    // Call API
    const result = await callGeminiAPI(
      text.trim(),
      activeMode,
      updatedMessages.slice(0, -1), // Previous messages for context
      abortControllerRef.current.signal
    );

    setIsTyping(false);
    abortControllerRef.current = null;

    if (result.isCancelled) return;

    if (result.success) {
      const aiMessage = {
        id: Date.now() + 1,
        role: 'ai',
        text: result.text,
        timestamp: new Date().toISOString(),
        modelUsed: result.modelUsed
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Save AI response immediately
      if (currentChatId) {
        updateChatMessages(currentChatId, finalMessages);
      }
    } else {
      // Show error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'ai',
        text: `Sorry, I encountered an error: ${result.text}. Please try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);

      if (currentChatId) {
        updateChatMessages(currentChatId, finalMessages);
      }

      setNotification(result.text);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const getModeStyles = () => {
    if (activeMode === 'Coder') return { accent: 'text-green-400', glow: 'shadow-[0_0_30px_rgba(74,222,128,0.15)]', iconColor: 'text-green-400' };
    if (activeMode === 'Student') return { accent: 'text-yellow-400', glow: 'shadow-[0_0_30px_rgba(250,204,21,0.15)]', iconColor: 'text-yellow-400' };
    if (activeMode === 'Chill') return { accent: 'text-teal-400', glow: 'shadow-[0_0_30px_rgba(45,212,191,0.15)]', iconColor: 'text-teal-400' };
    return { accent: 'text-[#22d3ee]', glow: 'shadow-[0_0_30px_rgba(147,51,234,0.15)]', iconColor: 'text-[#22d3ee]' };
  };

  const styles = getModeStyles();
  const isLimitReached = isDailyLimitReached();

  return (
    <main className="flex-1 flex flex-col relative h-[calc(100vh-4rem)]">
      {/* Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-500/90 border border-yellow-400 text-yellow-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Welcome Section */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-10"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-[#22d3ee]/20 border border-white/10 mb-6 ${styles.glow}`}>
                <BrainIcon className={`w-8 h-8 ${styles.iconColor}`} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                Welcome to Ryunex AI{' '}
                <span className={`text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 block text-lg mt-2 font-normal ${styles.accent}`}>
                  {activeMode} Mode
                </span>
              </h2>
              <p className="text-gray-400 text-lg font-light">
                Ask anything. Think clearly. Grow calmly.
              </p>
            </motion.div>
          )}

          {/* Chat Messages */}
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(147,51,234,0.3)]">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                  <div
                    className={`${msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#22d3ee]/10 to-purple-600/10 border border-[#22d3ee]/30 text-white rounded-tr-sm'
                      : msg.isError
                        ? 'bg-red-500/10 border border-red-500/30 text-red-200 rounded-tl-sm'
                        : 'bg-white/5 border border-white/10 text-gray-100 rounded-tl-sm shadow-lg backdrop-blur-md relative overflow-hidden group'
                      } px-5 py-3.5 rounded-2xl`}
                  >
                    {msg.role === 'ai' && !msg.isError && (
                      <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all duration-500"></div>
                    )}
                    <p className="text-sm md:text-base leading-relaxed relative z-10 whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>
                  {msg.role === 'user' ? (
                    <span className="text-[10px] text-gray-500 mt-1 mr-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <div className="flex items-center gap-3 mt-2 ml-1">
                      <span className="text-[10px] text-gray-500">
                        Ryunex AI • {activeMode} {msg.modelUsed && `• ${msg.modelUsed}`}
                      </span>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && <div></div>}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(147,51,234,0.3)]">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm shadow-lg backdrop-blur-md flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a] to-transparent z-20">
        <div className="max-w-3xl mx-auto">
          {/* Input Bar */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-[#22d3ee] rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            <div className="relative flex items-center bg-[#0b0f1a]/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-2xl">
              {/* Input Field */}
              <input
                type="text"
                aria-label="Message input"
                placeholder={isLimitReached ? "Daily limit reached. Come back tomorrow!" : "Type your message to Ryunex..."}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 px-4 py-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLimitReached && !isTyping && handleSendMessage()}
                disabled={isLimitReached || isTyping}
              />

              {/* Right Icons */}
              <div className="flex items-center gap-1 pr-1">
                <button
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLimitReached || isTyping}
                >
                  <MicIcon className="w-5 h-5" />
                </button>
                <motion.button
                  whileHover={{ scale: isLimitReached || isTyping ? 1 : 1.05 }}
                  whileTap={{ scale: isLimitReached || isTyping ? 1 : 0.95 }}
                  onClick={() => !isLimitReached && !isTyping && handleSendMessage()}
                  disabled={isLimitReached || isTyping}
                  className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-[#22d3ee] text-white shadow-[0_0_10px_rgba(147,51,234,0.4)] hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-4 h-4 ml-0.5" />
                </motion.button>
              </div>
            </div>
          </div>

          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-600">
              Ryunex AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
