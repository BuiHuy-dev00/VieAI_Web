import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { createError } from '../middleware/error-handler';

function assertGeminiConfigured(): void {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key && process.env.NODE_ENV === 'production') {
    throw createError('GEMINI_API_KEY is not configured', 503);
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim() || '');

// Chat model for conversations
const chatModel: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash'
});

// Image generation model (Gemini 2.0 with Imagen)
const imageModel: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp'
});

// Intent classifier model (fast, cheap)
const classifierModel: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash'
});

// Store active chat sessions
const chatSessions = new Map<string, ChatSession>();

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface StreamChunk {
  text: string;
  done: boolean;
  image?: GeneratedImage;
}

export interface GeneratedImage {
  data: string;  // base64 encoded
  mimeType: string;
}

export interface ChatResponse {
  text: string;
  image?: GeneratedImage;
}

export interface IntentClassification {
  shouldGenerateImage: boolean;
  imagePrompt: string;
}

const INTENT_CLASSIFIER_PROMPT = `You are an intent classifier for a chatbot that can generate images.
Analyze the user's message and determine if they want an image to be generated.

Return ONLY valid JSON (no markdown, no code blocks):
{"shouldGenerateImage": boolean, "imagePrompt": "extracted prompt or empty string"}

Examples of image requests:
- "Draw me a cat" → {"shouldGenerateImage": true, "imagePrompt": "a cat"}
- "Can you show me what a dragon looks like?" → {"shouldGenerateImage": true, "imagePrompt": "a dragon"}
- "I need a logo for my coffee shop" → {"shouldGenerateImage": true, "imagePrompt": "logo for a coffee shop"}
- "Visualize world peace" → {"shouldGenerateImage": true, "imagePrompt": "world peace concept visualization"}
- "Create an image of sunset over mountains" → {"shouldGenerateImage": true, "imagePrompt": "sunset over mountains"}
- "tạo hình con mèo" → {"shouldGenerateImage": true, "imagePrompt": "a cat"}
- "vẽ cho tôi một bức tranh phong cảnh" → {"shouldGenerateImage": true, "imagePrompt": "landscape painting"}

Examples of NON-image requests:
- "What is the capital of France?" → {"shouldGenerateImage": false, "imagePrompt": ""}
- "Help me write code" → {"shouldGenerateImage": false, "imagePrompt": ""}
- "Tell me about cats" → {"shouldGenerateImage": false, "imagePrompt": ""}
- "How do I make coffee?" → {"shouldGenerateImage": false, "imagePrompt": ""}

User message: `;

/**
 * Use Gemini to classify if user wants image generation
 */
async function classifyIntent(message: string): Promise<IntentClassification> {
  assertGeminiConfigured();
  try {
    const result = await classifierModel.generateContent(INTENT_CLASSIFIER_PROMPT + message);
    const text = result.response.text().trim();

    // Clean potential markdown code blocks
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

    const parsed = JSON.parse(cleanJson);
    return {
      shouldGenerateImage: Boolean(parsed.shouldGenerateImage),
      imagePrompt: String(parsed.imagePrompt || message)
    };
  } catch (error) {
    console.error('Intent classification failed:', error);
    // Fallback: don't generate image if classification fails
    return { shouldGenerateImage: false, imagePrompt: '' };
  }
}

/**
 * Start or get existing chat session
 */
export function getOrCreateChat(sessionId: string, history: ChatMessage[] = []): ChatSession {
  if (!chatSessions.has(sessionId)) {
    const chat = chatModel.startChat({ history });
    chatSessions.set(sessionId, chat);
  }
  return chatSessions.get(sessionId)!;
}

/**
 * Generate image using Gemini 2.0
 */
export async function generateImage(prompt: string): Promise<GeneratedImage | null> {
  assertGeminiConfigured();
  try {
    const result = await imageModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Generate an image: ${prompt}` }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'] as any
      }
    } as any);

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if ((part as any).inlineData) {
        return {
          data: (part as any).inlineData.data,
          mimeType: (part as any).inlineData.mimeType || 'image/png'
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
}

/**
 * Send message with AI-powered image detection
 */
export async function sendMessageWithImage(
  sessionId: string,
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const chat = getOrCreateChat(sessionId, history);

  // Use Gemini to classify intent
  const intent = await classifyIntent(message);

  if (intent.shouldGenerateImage) {
    const image = await generateImage(intent.imagePrompt);

    // Get text response
    const textResult = await chat.sendMessage(
      image
        ? `User asked: "${message}". I generated an image of "${intent.imagePrompt}". Briefly describe what was created in a friendly way.`
        : `User asked: "${message}" but image generation failed. Explain that the image couldn't be generated and describe what it would look like.`
    );

    return {
      text: textResult.response.text(),
      image: image || undefined
    };
  }

  // Regular text chat
  const result = await chat.sendMessage(message);
  return { text: result.response.text() };
}

/**
 * Send message and get streaming response with AI-powered image detection
 */
export async function* sendMessageStream(
  sessionId: string,
  message: string,
  history: ChatMessage[] = []
): AsyncGenerator<StreamChunk> {
  const chat = getOrCreateChat(sessionId, history);

  // Use Gemini to classify intent
  const intent = await classifyIntent(message);

  if (intent.shouldGenerateImage) {
    // Generate image first
    const image = await generateImage(intent.imagePrompt);

    // Send image chunk if generated
    if (image) {
      yield { text: '', done: false, image };
    }

    // Stream text description
    const textPrompt = image
      ? `User asked: "${message}". I generated an image of "${intent.imagePrompt}". Briefly describe what was created in a friendly way.`
      : `User asked: "${message}" but image generation failed. Explain that you couldn't generate the image and describe what it would look like.`;

    const result = await chat.sendMessageStream(textPrompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      yield { text, done: false };
    }
    yield { text: '', done: true };
    return;
  }

  // Regular streaming
  const result = await chat.sendMessageStream(message);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    yield { text, done: false };
  }
  yield { text: '', done: true };
}

/**
 * Send message and get full response (non-streaming)
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  history: ChatMessage[] = []
): Promise<string> {
  const response = await sendMessageWithImage(sessionId, message, history);
  return response.text;
}

/**
 * Clear chat session from memory
 */
export function clearChatSession(sessionId: string): void {
  chatSessions.delete(sessionId);
}
