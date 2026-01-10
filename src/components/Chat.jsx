import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendIcon, SparklesIcon, TargetIcon, BrainIcon, MenuIcon, XIcon } from './Icons';

// Configuration
const MODEL_CONFIG = [
    {
        modelName: "Mistral 7B Instruct v0.3",
        id: "mistralai/Mistral-7B-Instruct-v0.3",
        apiKeys: [import.meta.env.VITE_HF_KEY_MISTRAL] // Load securely from .env
    },
    {
        modelName: "Qwen 2.5",
        id: "Qwen/Qwen2.5-72B-Instruct",
        apiKeys: [import.meta.env.VITE_HF_KEY_QWEN]
    },
    {
        modelName: "Llama 3",
        id: "meta-llama/Meta-Llama-3-8B-Instruct",
        apiKeys: [import.meta.env.VITE_HF_KEY_LLAMA]
    }
];
const MAX_DAILY_MESSAGES = 25;
const SYSTEM_PROMPTS = {
    DEFAULT: "You are a helpful assistant that speaks in Hinglish and is friendly to students.",
    SOLANCE: "You are a calm, empathetic, and supportive AI. Speak in peaceful, soothing language to provide solace and comfort."
};

const Chat = () => {
    // State
    const [conversations, setConversations] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSolanceMode, setIsSolanceMode] = useState(false);
    const [dailyUsage, setDailyUsage] = useState({ count: 0, date: new Date().toDateString() });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

    // Failover State
    const [activeModelIndex, setActiveModelIndex] = useState(() => {
        const saved = localStorage.getItem('activeModelConfig');
        return saved ? JSON.parse(saved).modelIndex : 0;
    });
    const [activeKeyIndex, setActiveKeyIndex] = useState(() => {
        const saved = localStorage.getItem('activeModelConfig');
        return saved ? JSON.parse(saved).keyIndex : 0;
    });
    const [notification, setNotification] = useState(null);

    // Refs
    const messagesEndRef = useRef(null);

    // Load conversations from LocalStorage on mount
    useEffect(() => {
        try {
            const savedChats = localStorage.getItem('chatHistory');
            if (savedChats) {
                try {
                    const parsedChats = JSON.parse(savedChats);
                    setConversations(parsedChats);
                    if (parsedChats.length > 0) {
                        setCurrentChatId(parsedChats[0].id);
                    } else {
                        createNewChat();
                    }
                } catch (error) {
                    // console.error("Error parsing chat history:", error);
                    createNewChat();
                }
            } else {
                createNewChat();
            }
        } catch (e) {
            createNewChat();
        }
    }, []);

    // Load Daily Usage & Check for Reset
    useEffect(() => {
        const today = new Date().toDateString();
        
        try {
            const savedUsage = localStorage.getItem('dailyUsage');
            if (savedUsage) {
                const parsed = JSON.parse(savedUsage);
                if (parsed.date === today) {
                    setDailyUsage(parsed);
                } else {
                    // Reset for new day
                    const newUsage = { count: 0, date: today };
                    setDailyUsage(newUsage);
                    try { localStorage.setItem('dailyUsage', JSON.stringify(newUsage)); } catch (e) {}
                }
            } else {
                const newUsage = { count: 0, date: today };
                setDailyUsage(newUsage);
                try { localStorage.setItem('dailyUsage', JSON.stringify(newUsage)); } catch (e) {}
            }
        } catch (e) {
            // Fallback if storage is disabled
            setDailyUsage({ count: 0, date: today });
        }
    }, []);

    // Save conversations to LocalStorage whenever they change
    useEffect(() => {
        if (conversations.length > 0) {
            try { localStorage.setItem('chatHistory', JSON.stringify(conversations)); } catch (e) {}
        }
    }, [conversations]);

    // Save active model config to LocalStorage
    useEffect(() => {
        try {
            localStorage.setItem('activeModelConfig', JSON.stringify({
                modelIndex: activeModelIndex,
                keyIndex: activeKeyIndex
            }));
        } catch (e) {}
    }, [activeModelIndex, activeKeyIndex]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversations, currentChatId, isLoading, notification]);

    // Helper to get current chat object
    const getCurrentChat = () => conversations.find(c => c.id === currentChatId);

    const createNewChat = () => {
        const newChat = {
            id: Date.now(),
            title: `Chat ${new Date().toLocaleTimeString()}`,
            messages: []
        };
        setConversations(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setInput("");
    };

    const handleDeleteChat = (e, chatId) => {
        e.stopPropagation();
        const updatedConversations = conversations.filter(c => c.id !== chatId);

        if (updatedConversations.length === 0) {
            const newChat = {
                id: Date.now(),
                title: `Chat ${new Date().toLocaleTimeString()}`,
                messages: []
            };
            setConversations([newChat]);
            setCurrentChatId(newChat.id);
        } else {
            setConversations(updatedConversations);
            if (chatId === currentChatId) {
                setCurrentChatId(updatedConversations[0].id);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const currentChat = getCurrentChat();
        if (!currentChat) return;

        // Check Daily Limit
        if (dailyUsage.count >= MAX_DAILY_MESSAGES) {
            setNotification("Daily limit reached (25 messages). Please come back tomorrow!");
            return;
        }

        const userMessage = { role: 'user', content: input };
        const updatedMessages = [...currentChat.messages, userMessage];

        // Update state immediately with user message
        setConversations(prev => prev.map(c =>
            c.id === currentChatId ? { ...c, messages: updatedMessages } : c
        ));

        // Update Daily Usage
        const newUsage = { ...dailyUsage, count: dailyUsage.count + 1 };
        setDailyUsage(newUsage);
        try { localStorage.setItem('dailyUsage', JSON.stringify(newUsage)); } catch (e) {}

        setInput("");
        setIsLoading(true);
        setNotification(null);

        let currentModelIdx = activeModelIndex;
        let currentKeyIdx = activeKeyIndex;
        let success = false;
        let botText = "";
        const systemPrompt = isSolanceMode ? SYSTEM_PROMPTS.SOLANCE : SYSTEM_PROMPTS.DEFAULT;

        // Failover Loop
        while (!success && currentModelIdx < MODEL_CONFIG.length) {
            const model = MODEL_CONFIG[currentModelIdx];
            // Ensure key index is valid for the current model
            if (currentKeyIdx >= model.apiKeys.length) {
                currentKeyIdx = 0;
            }
            const apiKey = model.apiKeys[currentKeyIdx];

            try {
                const response = await fetch(
                    `https://router.huggingface.co/models/${model.id}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            inputs: `<s>[INST] ${systemPrompt}\n\n${input} [/INST]`,
                            parameters: {
                                max_new_tokens: 500,
                                return_full_text: false
                            }
                        }),
                    }
                );

                if (response.status === 429 || response.status === 503) {
                    throw new Error("RateLimit");
                }

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `HTTP ${response.status}`);
                }

                const data = await response.json();

                if (Array.isArray(data) && data[0]?.generated_text) {
                    botText = data[0].generated_text;
                } else if (data.error) {
                    botText = `Error: ${data.error}`;
                } else {
                    botText = "No response generated.";
                }

                success = true;

                // Update persistent state if we found a working configuration
                if (currentModelIdx !== activeModelIndex || currentKeyIdx !== activeKeyIndex) {
                    setActiveModelIndex(currentModelIdx);
                    setActiveKeyIndex(currentKeyIdx);
                    setNotification(`Success: Connected to ${model.modelName}`);
                    setTimeout(() => setNotification(null), 3000);
                }

            } catch (error) {
                // console.warn(`Failover: ${model.modelName} (Key ${currentKeyIdx}) failed:`, error);

                if (error.message === "RateLimit" || error.message.includes("Loading")) {
                    // Try next key
                    currentKeyIdx++;
                    if (currentKeyIdx >= model.apiKeys.length) {
                        // Try next model
                        currentKeyIdx = 0;
                        currentModelIdx++;
                        if (currentModelIdx < MODEL_CONFIG.length) {
                            setNotification(`Alert: ${model.modelName} limit reached, switching to ${MODEL_CONFIG[currentModelIdx].modelName}...`);
                        }
                    } else {
                        setNotification(`Alert: Key limit reached for ${model.modelName}, switching key...`);
                    }
                } else {
                    // Non-retryable error
                    botText = `Error: ${error.message}`;
                    break;
                }
            }
        }

        if (!success && !botText) {
            botText = "System Error: All models and keys are currently unavailable.";
        }

        const botMessage = { role: 'assistant', content: botText };

        setConversations(prev => prev.map(c =>
            c.id === currentChatId ? { ...c, messages: [...updatedMessages, botMessage] } : c
        ));
        setIsLoading(false);
    };

    // Calculate Limit Bar Percentage
    const limitPercent = Math.min((dailyUsage.count / MAX_DAILY_MESSAGES) * 100, 100);

    const currentChat = conversations.find(c => c.id === currentChatId);

    return (
        <div className={`flex h-screen transition-colors duration-500 ${isSolanceMode ? 'bg-[#0b0f1a] text-gray-100' : 'bg-white text-gray-900'}`}>
            
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-opacity-90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50">
                <span className="font-bold text-lg flex items-center gap-2">
                    <BrainIcon className={`w-6 h-6 ${isSolanceMode ? 'text-[#00ffcc]' : 'text-purple-600'}`} />
                    Ryunex AI
                </span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside 
                className={`fixed md:static inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out flex flex-col border-r
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isSolanceMode ? 'bg-[#0f1423] border-[#00ffcc]/20' : 'bg-gray-50 border-gray-200'}
                pt-20 md:pt-4`}
            >
                <div className="px-4 mb-6">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createNewChat}
                    className={`w-full py-3 px-4 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2
                    ${isSolanceMode 
                        ? 'bg-[#00ffcc] text-black hover:bg-[#00ccaa]' 
                        : 'bg-gradient-to-r from-purple-600 to-[#22d3ee] text-white'}`}
                >
                    <SparklesIcon className="w-4 h-4" /> New Chat
                </motion.button>
                </div>

                <div className="px-4 mb-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsSolanceMode(!isSolanceMode)}
                    className={`w-full py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all
                    ${isSolanceMode 
                        ? 'border-[#00ffcc] text-[#00ffcc] bg-[#00ffcc]/10' 
                        : 'border-purple-200 text-purple-600 bg-purple-50'}`}
                >
                    {isSolanceMode ? <><SparklesIcon className="w-4 h-4" /> Disable Solance</> : <><TargetIcon className="w-4 h-4" /> Enable Solance</>}
                </motion.button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 space-y-1">
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 px-2 ${isSolanceMode ? 'text-gray-500' : 'text-gray-400'}`}>History</h3>
                    {conversations.map(chat => (
                        <motion.div
                            key={chat.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => setCurrentChatId(chat.id)}
                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all
                            ${chat.id === currentChatId 
                                ? (isSolanceMode ? 'bg-white/10 text-white' : 'bg-white shadow-sm border border-gray-100') 
                                : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-500'}`}
                        >
                            <span className="truncate text-sm max-w-[160px]">{chat.title}</span>
                            <button
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity px-2"
                                title="Delete Chat"
                            >
                                ×
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Limit Bar */}
                <div className={`mt-auto p-4 border-t ${isSolanceMode ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-medium opacity-70">Daily Usage</span>
                        <span className={`text-[10px] font-bold ${isSolanceMode ? 'text-[#00ffcc]' : 'text-purple-600'}`}>{dailyUsage.count} / {MAX_DAILY_MESSAGES}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSolanceMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${limitPercent}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full ${limitPercent >= 100 ? 'bg-red-500' : (isSolanceMode ? 'bg-[#00ffcc]' : 'bg-gradient-to-r from-purple-600 to-[#22d3ee]')}`}
                        />
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden pt-16 md:pt-0">
                {/* Notification Area */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-full shadow-lg text-sm"
                        >
                            {notification}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                    <AnimatePresence>
                        {currentChat ? currentChat.messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
                            >
                                {msg.role !== 'user' && (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border
                                        ${isSolanceMode ? 'bg-[#00ffcc]/10 border-[#00ffcc]/30 text-[#00ffcc]' : 'bg-purple-100 border-purple-200 text-purple-600'}`}>
                                        <SparklesIcon className="w-4 h-4" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-2xl shadow-sm backdrop-blur-sm
                                    ${msg.role === 'user' 
                                        ? (isSolanceMode ? 'bg-[#00ffcc]/20 border border-[#00ffcc]/30 text-white rounded-tr-sm' : 'bg-gradient-to-br from-purple-600 to-[#22d3ee] text-white rounded-tr-sm')
                                        : (isSolanceMode ? 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm')
                                    }
                                `}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-50">
                                <BrainIcon className="w-16 h-16 mb-4" />
                                <p>Start a new conversation</p>
                            </div>
                        )}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-gray-500 text-sm ml-12"
                        >
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-75" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
                            {isSolanceMode ? "Seeking solace..." : "Thinking..."}
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`p-4 border-t ${isSolanceMode ? 'bg-[#0b0f1a] border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`max-w-3xl mx-auto flex items-center gap-2 p-1.5 rounded-full border shadow-sm
                        ${isSolanceMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isSolanceMode ? "Type gently..." : "Ask anything..."}
                        disabled={isLoading || dailyUsage.count >= MAX_DAILY_MESSAGES}
                        className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm md:text-base disabled:opacity-50"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSendMessage}
                        disabled={isLoading || dailyUsage.count >= MAX_DAILY_MESSAGES}
                        className={`p-2 rounded-full text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed
                            ${isSolanceMode ? 'bg-[#00ffcc] text-black' : 'bg-gradient-to-r from-purple-600 to-[#22d3ee]'}`}
                    >
                        <SendIcon className="w-5 h-5" />
                    </motion.button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-500">Ryunex AI can make mistakes. Check important info.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Chat;
