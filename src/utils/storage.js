// LocalStorage utilities for chat history and daily usage tracking

const STORAGE_KEYS = {
  CHAT_HISTORY: 'ryunex_chat_history',
  DAILY_USAGE: 'ryunex_daily_usage',
  CURRENT_CHAT_ID: 'ryunex_current_chat_id'
};

const MAX_DAILY_MESSAGES = 25;

/**
 * Get today's date string (YYYY-MM-DD) for usage tracking
 */
export const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Check if it's a new day (past midnight)
 */
export const isNewDay = (lastDateString) => {
  return lastDateString !== getTodayDateString();
};

/**
 * Get daily usage from localStorage
 */
export const getDailyUsage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_USAGE);
    if (!stored) {
      return { count: 0, date: getTodayDateString() };
    }
    
    const usage = JSON.parse(stored);
    
    // Check if it's a new day
    if (isNewDay(usage.date)) {
      const newUsage = { count: 0, date: getTodayDateString() };
      localStorage.setItem(STORAGE_KEYS.DAILY_USAGE, JSON.stringify(newUsage));
      return newUsage;
    }
    
    return usage;
  } catch (error) {
    return { count: 0, date: getTodayDateString() };
  }
};

/**
 * Increment daily usage count
 */
export const incrementDailyUsage = () => {
  try {
    const usage = getDailyUsage();
    const newUsage = { ...usage, count: usage.count + 1 };
    localStorage.setItem(STORAGE_KEYS.DAILY_USAGE, JSON.stringify(newUsage));
    return newUsage;
  } catch (error) {
    return { count: 0, date: getTodayDateString() };
  }
};

/**
 * Check if daily limit is reached
 */
export const isDailyLimitReached = () => {
  const usage = getDailyUsage();
  return usage.count >= MAX_DAILY_MESSAGES;
};

/**
 * Get remaining messages for today
 */
export const getRemainingMessages = () => {
  const usage = getDailyUsage();
  return Math.max(0, MAX_DAILY_MESSAGES - usage.count);
};

/**
 * Get chat history from localStorage
 */
export const getChatHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
};

/**
 * Save chat history to localStorage
 */
export const saveChatHistory = (chats) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
};

/**
 * Get current chat ID from localStorage
 */
export const getCurrentChatId = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_ID);
  } catch (error) {
    return null;
  }
};

/**
 * Save current chat ID to localStorage
 */
export const saveCurrentChatId = (chatId) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT_ID, String(chatId));
  } catch (error) {
    console.error('Failed to save current chat ID:', error);
  }
};

/**
 * Create a new chat
 */
export const createNewChat = (mode = 'Solance') => {
  const chatId = Date.now();
  const chat = {
    id: chatId,
    title: `New Chat - ${mode}`,
    mode: mode,
    messages: [],
    createdAt: new Date().toISOString()
  };
  
  const chats = getChatHistory();
  chats.unshift(chat); // Add to beginning
  saveChatHistory(chats);
  saveCurrentChatId(chatId);
  
  return chat;
};

/**
 * Update a chat's messages
 */
export const updateChatMessages = (chatId, messages) => {
  const chats = getChatHistory();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  
  if (chatIndex !== -1) {
    chats[chatIndex].messages = messages;
    
    // Update title from first user message if empty
    if (!chats[chatIndex].title || chats[chatIndex].title.startsWith('New Chat')) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const title = (firstUserMessage.text || firstUserMessage.content || '').slice(0, 50);
        chats[chatIndex].title = title || `Chat ${new Date(chats[chatIndex].createdAt).toLocaleTimeString()}`;
      }
    }
    
    saveChatHistory(chats);
  }
};

/**
 * Delete a chat
 */
export const deleteChat = (chatId) => {
  const chats = getChatHistory();
  const filtered = chats.filter(c => c.id !== chatId);
  saveChatHistory(filtered);
  return filtered;
};

/**
 * Get a specific chat by ID
 */
export const getChatById = (chatId) => {
  const chats = getChatHistory();
  return chats.find(c => c.id === chatId);
};

export { MAX_DAILY_MESSAGES };
