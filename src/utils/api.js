import { GoogleGenerativeAI } from "@google/generative-ai";

// --- GEMINI MANAGER START ---
/**
 * @fileoverview Manages Gemini API interactions with robust fallback mechanisms.
 * Handles key rotation, error recovery, and system alerts.
 */
export class GeminiManager {
  /**
   * @param {string[]} apiKeys - Array of Gemini API keys (Primary, Secondary, Tertiary, etc.)
   * @param {string} modelName - The model version to use (default: gemini-1.5-flash)
   * @param {Object} config - Optional generation config (temperature, tokens, etc.)
   */
  constructor(apiKeys, modelName = "gemini-1.5-flash", config = {}) {
    if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
      throw new Error("GeminiManager: At least one API key is required.");
    }

    this.apiKeys = apiKeys;
    this.modelName = modelName;
    this.config = config;

    // Track the current active key index. 
    // We persist this index so we don't keep retrying dead keys (like quota exceeded) 
    // on subsequent messages within the same session.
    this.currentKeyIndex = 0;
  }

  /**
   * Sends a prompt to Gemini and returns the text response.
   * Automatically rotates keys on failure.
   * 
   * @param {string} prompt - The user's chat message.
   * @param {Object} options - Extra options for chat history, system prompts, etc.
   * @returns {Promise<string>} - The AI response or the busy message.
   */
  async generateResponse(prompt, { history = [], systemInstruction = null, modelName = null, signal = null, temperature = null } = {}) {
    let attempts = 0;
    const totalKeys = this.apiKeys.length;

    // Loop through keys until we find one that works or exhaust all options
    while (attempts < totalKeys) {
      const currentKey = this.apiKeys[this.currentKeyIndex];

      try {
        // Initialize the API with the current key
        const genAI = new GoogleGenerativeAI(currentKey);

        // Use provided modelName or fallback to instance default
        const model = genAI.getGenerativeModel({
          model: modelName || this.modelName,
          systemInstruction: systemInstruction,
          ...this.config
        });

        let text;

        // Handle Chat (Multi-turn) vs GenerateContent (Single-turn)
        if (history && history.length > 0) {
          const chat = model.startChat({
            history: history,
            generationConfig: {
              ...this.config,
              temperature: temperature ?? this.config.temperature
            }
          });

          const result = await chat.sendMessage(prompt);

          // Manual Abort Check (Gemini SDK doesn't fully support signal in sendMessage yet)
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

          const response = await result.response;
          text = response.text();
        } else {
          const result = await model.generateContent(prompt);
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          const response = await result.response;
          text = response.text();
        }

        // If successful, return the text immediately
        return text;

      } catch (error) {
        // Do not rotate keys if the user cancelled the request
        if (error.name === 'AbortError' || signal?.aborted) {
          throw error;
        }

        console.warn(
          `[GeminiManager] Key ending in ...${currentKey.slice(-4)} failed.`,
          `Reason: ${error.message || "Unknown error"}`
        );

        // Rotate to the next key for the immediate retry
        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
        attempts++;
      }
    }

    // If the loop finishes, it means all keys failed
    this._handleTotalFailure();

    // Return the exact fallback message required for the UI
    return "Server is busy, please talk to owner of RYUNEX";
  }

  /**
   * Handles the critical scenario where all API keys have failed.
   * Triggers console alerts and browser notifications.
   * @private
   */
  _handleTotalFailure() {
    const msg = "CRITICAL ALERT: All Gemini API keys are exhausted or failing.";

    // 1. Console Alert (Reliable for devs)
    console.error(msg);

    // 2. Browser Notification (High visibility for you as the owner)
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("RYUNEX AI System Alert", {
          body: "All API keys are down. Immediate rotation required.",
          icon: "/favicon.ico" // Optional: assumes you have a favicon
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("RYUNEX AI System Alert", {
              body: "All API keys are down. Immediate rotation required."
            });
          }
        });
      }
    }

    // 3. Dispatch Custom Event (Optional: If you want to show a specific UI modal)
    window.dispatchEvent(new CustomEvent("ryunex-api-failure", {
      detail: { timestamp: new Date() }
    }));
  }
}
// --- GEMINI MANAGER END ---

// Initialize Gemini Manager with multiple keys
const API_KEYS = [
  "AIzaSyDyiQaMqPWlNz2WGUix2ZsbMOtGTVABJoQ",
  "AIzaSyChtdCXmscrZ8_8MrjnUeSKPEKJ610jgQM",
  "AIzaSyDO-ySFiyCRsRLNUNrWefhDDDd5Ryxvu1k",
  "AIzaSyApS-pnGh0iVtTWoJv7-rzcxzB41YwKe8U",
  "AIzaSyCH0qlUFhIcRo0iF51PAeBIsvmTVGC5edk"
].filter(key => key && !key.startsWith("YOUR_"));

if (API_KEYS.length === 0) {
  console.error("No API keys configured. Please add your Gemini API keys to the API_KEYS array in api.js");
}

// Initialize the manager with the default model
const geminiManager = new GeminiManager(API_KEYS, 'gemini-2.5-flash');

const MODELS = {
  DEFAULT: 'gemini-2.5-flash',
  CODER: 'gemini-2.5-flash'
};

// Mode-specific system prompts
const SYSTEM_PROMPTS = {
  Solance: `
You are RYUNEX AI operating in SOLANCE MODE.

IDENTITY:
You are a calm, emotionally intelligent, and grounding AI companion.
You act like a peaceful guide who helps the user slow down and think clearly.

ROLE & PURPOSE:
Your role is to provide mental clarity, emotional balance, and calm support.
You help users during stress, confusion, overthinking, or emotional overload.

HOW YOU THINK:
- Slow and thoughtful
- Emotion-aware
- Prioritize mental peace over productivity

HOW YOU SPEAK:
- Default language is Hinglish
- Soft, gentle, and reassuring tone
- No rush, no pressure
- Avoid harsh or commanding language

ANSWER STYLE:
- Short, calming sentences
- Gentle guidance
- Encourage breathing, reflection, and clarity
- Ask reflective questions when appropriate

BEHAVIOR RULES:
- Do NOT overwhelm the user
- Do NOT give aggressive advice
- Focus on grounding and reassurance

EMOTIONAL GUIDELINES:
- Validate feelings
- Promote calmness and balance
- Help the user regain control gently

DEFAULT LANGUAGE:
Hinglish
`,

  Chill: `
You are RYUNEX AI operating in CHILL MODE.

IDENTITY:
You are a relaxed, friendly, and approachable digital companion.
You are not a teacher or strict mentor — you are a chill friend.

ROLE & PURPOSE:
Your role is to provide light conversation, casual help, and relaxed interaction.
You help the user unwind and think freely.

HOW YOU THINK:
- Keep things simple
- Avoid over-analysis
- Focus on comfort and ease

HOW YOU SPEAK:
- Default language is Hinglish
- Casual tone
- Friendly, warm, and slightly playful

ANSWER STYLE:
- Short and clear responses
- Friendly suggestions
- Light humor when appropriate
- Avoid technical overload

BEHAVIOR RULES:
- Do NOT lecture
- Do NOT act overly serious
- Keep the vibe relaxed

EMOTIONAL GUIDELINES:
- Make the user feel comfortable
- Reduce stress
- Be a safe, friendly presence

DEFAULT LANGUAGE:
Hinglish
`,

  Student: `
You are RYUNEX AI operating in STUDENT MODE.

IDENTITY:
You are a calm, intelligent, and supportive AI mentor designed for students.
You act like a friendly teacher + elder brother combined.

ROLE & PURPOSE:
Your main role is to help students understand concepts clearly, not just give answers.
You focus on fundamentals, clarity, and confidence building.

HOW YOU THINK:
- Break complex topics into simple steps
- Assume weak fundamentals
- Prefer clarity over speed

HOW YOU SPEAK:
- Default language is Hinglish
- Simple vocabulary
- Friendly, motivating, and patient tone

ANSWER STYLE:
- Step-by-step explanations
- Real-life analogies
- Gentle follow-up questions
- Highlight key points clearly

BEHAVIOR RULES:
- Do NOT rush answers
- Do NOT assume advanced knowledge
- Focus on WHY, WHAT, and HOW

EMOTIONAL GUIDELINES:
- Be supportive and positive
- Reduce fear around exams or learning
- Act as a safe learning companion

DEFAULT LANGUAGE:
Hinglish
`,

  Coder: `
You are RYUNEX AI operating in CODER MODE.

IDENTITY:
You are a skilled software developer and logical problem-solver.
You act like a senior developer guiding a junior.

ROLE & PURPOSE:
Your role is to help users think like developers, not just copy code.
You focus on logic, structure, debugging, and best practices.

HOW YOU THINK:
- Logical and structured
- System-level thinking
- Clean and understandable solutions

HOW YOU SPEAK:
- Default language is Hinglish
- Slightly technical but beginner-friendly
- Confident and practical tone

ANSWER STYLE:
- Explain logic before code
- Use comments and explanations
- Highlight common mistakes
- Guide debugging step-by-step

BEHAVIOR RULES:
- Do NOT overcomplicate
- Do NOT give unexplained code
- Focus on fundamentals

EMOTIONAL GUIDELINES:
- Be motivating, not intimidating
- Make coding feel achievable
- Act like a mentor

DEFAULT LANGUAGE:
Hinglish
`
};


/**
 * Get system prompt for a given mode
 */
export const getSystemPrompt = (mode) => {
  return SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.Student;
};

/**
 * Call Google Gemini API
 * @param {string} message - User message
 * @param {string} mode - Current mode (Solance, Chill, Student, Coder)
 * @param {Array} conversationHistory - Previous messages for context
 * @param {AbortSignal} [signal] - Signal to cancel the request
 * @returns {Promise<{success: boolean, text: string, modelUsed?: string}>}
 */
export const callGeminiAPI = async (message, mode, conversationHistory = [], signal) => {
  const systemPrompt = getSystemPrompt(mode);

  // Select model based on mode
  // Use Flash for speed/general, Pro for coding/reasoning
  let modelName = MODELS.DEFAULT;
  if (mode === 'Coder') {
    modelName = MODELS.CODER;
  }

  try {
    // Convert conversation history to Gemini format
    // Gemini uses 'user' and 'model' roles
    const history = conversationHistory.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text || msg.content }]
    }));

    // Use the GeminiManager to generate response with fallback logic
    const text = await geminiManager.generateResponse(message, {
      history: history,
      systemInstruction: systemPrompt,
      modelName: modelName,
      signal: signal,
      temperature: mode === 'Chill' ? 0.8 : 0.7
    });

    // Check for the specific fallback message
    if (text === "Server is busy, please talk to owner of RYUNEX") {
      return { success: false, text: text };
    }

    return {
      success: true,
      text: text,
      modelUsed: modelName
    };

  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) {
      console.log("Request cancelled");
      return { success: false, text: "Request cancelled", isCancelled: true };
    }
    console.error("Gemini API Error:", error);

    // Fallback error message
    let errorMessage = "An error occurred with Gemini API.";
    if (error.message?.includes('429')) {
      errorMessage = "I'm receiving too many requests right now. Please try again in a moment.";
    }

    return {
      success: false,
      text: errorMessage
    };
  }
};
