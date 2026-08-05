import express from 'express';
import path from 'path';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of GoogleGenAI client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint: Generate Full Dialogue
app.post('/api/generate-conversation', async (req, res) => {
  try {
    const {
      language = 'om',
      mode = 'casual',
      difficulty = 'intermediate',
      tone = 'friendly',
      length = 'medium',
      topic = 'Ethiopian Coffee Ceremony (Buna)',
      customPrompt = '',
    } = req.body;

    const ai = getGeminiClient();

    let targetTurnCount = 8;
    if (length === 'short') targetTurnCount = 5;
    if (length === 'long') targetTurnCount = 14;

    const languageDescription =
      language === 'om'
        ? 'Afaan Oromoo (Oromo) as the main spoken language'
        : language === 'am'
        ? 'Amharic (አማርኛ) as the main spoken language'
        : language === 'en'
        ? 'English language'
        : 'Natural Ethiopian Code-Switching (mixing Afaan Oromoo, Amharic, and English naturally in daily conversation as spoken in Finfinne/Addis Ababa)';

    const prompt = `
Generate a realistic, highly authentic 2-person conversation in ${languageDescription}.

Parameters:
- Category/Mode: ${mode}
- Topic: ${topic} ${customPrompt ? `(Additional Context: ${customPrompt})` : ''}
- Difficulty Level: ${difficulty} (beginner: simple sentence structure and basic everyday words; intermediate: natural conversation with common expressions; advanced: rich idioms, proverbs, complex grammar, native flair)
- Tone: ${tone}
- Conversation Length: Approximately ${targetTurnCount} total dialogue turns (alternating back and forth between Person 1 and Person 2).

IMPORTANT LINGUISTIC INSTRUCTIONS:
1. The dialogue must feel 100% human, natural, culturally grounded, and rich with authentic expressions, local greetings (e.g., "Akkam", "Nagayaa", "እግዚአብሔር ይመስገን", "እንዴት ነህ"), and proper grammar in Afaan Oromoo, Amharic, or English as requested.
2. Provide exact line-by-line transliteration (phonetic reading guide in Latin alphabet) for all lines, especially for Amharic Fidel script and Afaan Oromoo Qubee pronunciation accents.
3. Provide complete line-by-line translations in all three languages: English (translation_en), Afaan Oromoo (translation_om), and Amharic (translation_am).
4. For each dialogue turn, extract 1-3 key vocabulary words/idioms into the vocabulary array with exact pronunciation, part of speech, and translations in all 3 languages.
5. Include cultural context notes and grammar notes where appropriate.
6. Return 2 distinct speakers with unique names (e.g., Chala & Hawi for Oromo, Abebe & Lemlem for Amharic, or modern names), roles, gender, and avatar colors.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert Ethiopian linguist and master story creator fluent in Afaan Oromoo, Amharic (አማርኛ), and English. You generate natural, engaging, context-aware, and culturally accurate dialogues between two speakers. Always follow the JSON schema strictly.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Catchy title for the conversation' },
            topic: { type: Type.STRING, description: 'Topic summary' },
            culturalOverview: { type: Type.STRING, description: 'Cultural context or etiquette explanation' },
            learningSummary: { type: Type.STRING, description: 'Summary of key vocabulary and grammar takeaways' },
            speakers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  gender: { type: Type.STRING, description: 'male or female' },
                  avatarColor: { type: Type.STRING, description: 'hex color or tailwind color name like #3b82f6 or #ec4899' },
                  voiceName: { type: Type.STRING, description: 'Puck, Kore, Fenrir, Zephyr, or Charon' },
                },
                required: ['id', 'name', 'role', 'gender', 'avatarColor', 'voiceName'],
              },
            },
            turns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speakerId: { type: Type.STRING },
                  speakerName: { type: Type.STRING },
                  text: { type: Type.STRING, description: 'Original spoken text in the selected language' },
                  transliteration: { type: Type.STRING, description: 'Phonetic reading guide in Latin script' },
                  translation_en: { type: Type.STRING, description: 'English translation' },
                  translation_om: { type: Type.STRING, description: 'Afaan Oromoo translation' },
                  translation_am: { type: Type.STRING, description: 'Amharic translation' },
                  grammarNote: { type: Type.STRING, description: 'Optional explanation of grammar or sentence structure' },
                  culturalNote: { type: Type.STRING, description: 'Optional cultural idiom or etiquette insight' },
                  vocabulary: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING },
                        pronunciation: { type: Type.STRING },
                        translation_en: { type: Type.STRING },
                        translation_om: { type: Type.STRING },
                        translation_am: { type: Type.STRING },
                        partOfSpeech: { type: Type.STRING },
                        usageNote: { type: Type.STRING },
                      },
                      required: ['word', 'pronunciation', 'translation_en', 'translation_om', 'translation_am', 'partOfSpeech'],
                    },
                  },
                },
                required: [
                  'id',
                  'speakerId',
                  'speakerName',
                  'text',
                  'transliteration',
                  'translation_en',
                  'translation_om',
                  'translation_am',
                  'vocabulary',
                ],
              },
            },
          },
          required: ['title', 'topic', 'culturalOverview', 'learningSummary', 'speakers', 'turns'],
        },
      },
    });

    const resultText = response.text || '{}';
    const conversationData = JSON.parse(resultText);

    res.json({
      success: true,
      data: {
        id: `conv_${Date.now()}`,
        mode,
        language,
        difficulty,
        tone,
        createdAt: new Date().toISOString(),
        ...conversationData,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/generate-conversation:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate conversation dialogue.',
    });
  }
});

// Endpoint: Continue Conversation / User Intervention
app.post('/api/continue-conversation', async (req, res) => {
  try {
    const { conversation, userTurnText, userSpeakerId } = req.body;
    const ai = getGeminiClient();

    const previousTurnsSummary = conversation.turns
      .map((t: any) => `${t.speakerName}: "${t.text}" (${t.translation_en})`)
      .join('\n');

    const prompt = `
Given this existing conversation titled "${conversation.title}" in topic "${conversation.topic}":
${previousTurnsSummary}

${userTurnText ? `User added a turn: "${userTurnText}" as ${userSpeakerId === conversation.speakers[0].id ? conversation.speakers[0].name : conversation.speakers[1].name}.` : 'Generate the next 2 dialogue turns to naturally continue the conversation.'}

Generate 2 new turns for the conversation in ${conversation.language} language. Maintain character personality, tone, and cultural context. Return strict JSON array of 2 turns following the same turn schema:
{
  "turns": [
    {
      "id": "turn_new_1",
      "speakerId": "${conversation.speakers[0].id}",
      "speakerName": "${conversation.speakers[0].name}",
      "text": "...",
      "transliteration": "...",
      "translation_en": "...",
      "translation_om": "...",
      "translation_am": "...",
      "grammarNote": "...",
      "culturalNote": "...",
      "vocabulary": [
        {
          "word": "...",
          "pronunciation": "...",
          "translation_en": "...",
          "translation_om": "...",
          "translation_am": "...",
          "partOfSpeech": "...",
          "usageNote": "..."
        }
      ]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            turns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speakerId: { type: Type.STRING },
                  speakerName: { type: Type.STRING },
                  text: { type: Type.STRING },
                  transliteration: { type: Type.STRING },
                  translation_en: { type: Type.STRING },
                  translation_om: { type: Type.STRING },
                  translation_am: { type: Type.STRING },
                  grammarNote: { type: Type.STRING },
                  culturalNote: { type: Type.STRING },
                  vocabulary: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING },
                        pronunciation: { type: Type.STRING },
                        translation_en: { type: Type.STRING },
                        translation_om: { type: Type.STRING },
                        translation_am: { type: Type.STRING },
                        partOfSpeech: { type: Type.STRING },
                        usageNote: { type: Type.STRING },
                      },
                      required: ['word', 'pronunciation', 'translation_en', 'translation_om', 'translation_am', 'partOfSpeech'],
                    },
                  },
                },
                required: ['id', 'speakerId', 'speakerName', 'text', 'transliteration', 'translation_en', 'translation_om', 'translation_am', 'vocabulary'],
              },
            },
          },
          required: ['turns'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"turns":[]}');
    res.json({ success: true, turns: parsed.turns });
  } catch (err: any) {
    console.error('Error in /api/continue-conversation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Explain Phrase / Word Deep Dive
app.post('/api/explain-phrase', async (req, res) => {
  try {
    const { phrase, language = 'om', contextText = '' } = req.body;
    const ai = getGeminiClient();

    const prompt = `
Analyze and explain the following word or phrase from ${language} in detail:
Phrase: "${phrase}"
Context: "${contextText}"

Provide:
1. Exact meaning and translations in Afaan Oromoo, Amharic, and English.
2. Phonetic pronunciation breakdown.
3. Etymology, root words, or grammatical markers (e.g., verb tenses, gender suffix, plural form).
4. Cultural background or social etiquette surrounding its usage (slang vs polite vs proverb).
5. 2 example sentences showing how to use it in natural conversation.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phrase: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            meaning_en: { type: Type.STRING },
            meaning_om: { type: Type.STRING },
            meaning_am: { type: Type.STRING },
            grammarAnalysis: { type: Type.STRING },
            culturalInsight: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sentence: { type: Type.STRING },
                  translation: { type: Type.STRING },
                },
                required: ['sentence', 'translation'],
              },
            },
          },
          required: ['phrase', 'pronunciation', 'meaning_en', 'meaning_om', 'meaning_am', 'grammarAnalysis', 'culturalInsight', 'examples'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, explanation: parsed });
  } catch (err: any) {
    console.error('Error in /api/explain-phrase:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Generate Comprehension Quiz
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { conversation } = req.body;
    const ai = getGeminiClient();

    const dialogueText = conversation.turns
      .map((t: any) => `${t.speakerName}: ${t.text} (${t.translation_en})`)
      .join('\n');

    const prompt = `
Create a 3-question multiple choice quiz testing comprehension, vocabulary, and cultural context based on this dialogue:
Title: ${conversation.title}
${dialogueText}

Make the quiz educational and fun for language learners. Each question must have 4 options and a clear explanation.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    res.json({ success: true, questions: parsed.questions });
  } catch (err: any) {
    console.error('Error in /api/generate-quiz:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Text to Speech (TTS) using Gemini gemini-3.1-flash-tts-preview
app.post('/api/tts', async (req, res) => {
  try {
    const { text, speakerName = 'Speaker', voiceName = 'Kore' } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Say clearly in a natural voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ success: true, audioBase64: base64Audio, mimeType: 'audio/mp3' });
    } else {
      res.status(404).json({ success: false, error: 'No audio returned from TTS engine.' });
    }
  } catch (err: any) {
    console.error('Error in /api/tts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
