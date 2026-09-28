/**
 * aiService.js
 * ------------
 * AI-powered question paper extraction using Google Gemini API.
 *
 * The Gemini client is intentionally initialized LAZILY (inside the function)
 * so that dotenv has always loaded process.env before the SDK runs.
 * Initializing at module-top-level causes the SDK to receive undefined for
 * GEMINI_API_KEY and fall back to Google Cloud ADC, producing the
 * "Could not load the default credentials" error.
 */

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `
You are an expert OCR and document-analysis system specialised in academic examination papers.

You will be given an image or PDF page of a question paper (possibly scanned or photographed).
Your task is to extract every piece of content from the question paper and return it as a
single valid JSON array of "section" objects.

━━━ EXTRACTION RULES ━━━

MUST DO:
• Extract EVERY question — do not skip any, even partially visible ones.
• Preserve question numbering exactly as printed (e.g. "1", "2(a)", "Q3.", "3.1").
• Preserve section titles exactly (e.g. "PART A", "Section B", "UNIT – III").
• Preserve marks for every question and for every section exactly as printed.
• Preserve subquestions (e.g. a, b, c) as separate question objects with questionNumber "1a", "1b" etc.
• Preserve MCQ options — include every option with its label (A, B, C, D) and text.
• Preserve all instructions — both paper-level (e.g. "Answer all questions") and section-level.
• Preserve all headings, table contents, and diagrams descriptions (describe diagrams as "[Diagram: ...]").
• Preserve mathematical expressions accurately using plain text or LaTeX-like notation.
• Preserve fill-in-the-blank underscores (e.g. "The capital of France is ______").

MUST NOT DO:
• Do NOT answer any question.
• Do NOT summarise the paper.
• Do NOT invent, add, or alter any question.
• Do NOT skip questions because they seem repetitive or difficult to read.
• Do NOT merge separate questions into one.
• Do NOT change the meaning or wording of any question.

━━━ OUTPUT FORMAT ━━━

Return ONLY a valid JSON array — nothing else.
Do NOT wrap the output in markdown code fences (no \`\`\`json).
The array must begin with [ and end with ].

Each element of the array is a "section" object:

{
  "title":       (string)  Section title, e.g. "SECTION A" or "Part I"
  "instructions":(string)  Section-level instructions, or "" if none
  "defaultMarks":(number)  Marks per question in this section (use 0 if not specified)
  "questions":   (array)   Array of question objects (see below)
}

Each question object:

{
  "questionNumber": (string)  Exact question number as printed, e.g. "1", "2(a)", "Q3"
  "questionText":   (string)  Full text of the question
  "marks":          (number)  Marks for this question (use defaultMarks if not individually stated)
  "type":           (string)  One of: "short_answer" | "long_answer" | "descriptive" | "essay" |
                               "mcq" | "true_false" | "fill_in_blank" | "numerical" | "other"
  "options":        (array)   For MCQ/true-false only — array of { "label": "A", "text": "..." }
                               Empty array [] for all other types.
  "instructions":   (string)  Question-specific instructions, or "" if none
}

━━━ FALLBACK ━━━

If there are no clear sections, place all questions inside a single section titled "Section A".

━━━ EXAMPLE OUTPUT ━━━

[
  {
    "title": "SECTION A",
    "instructions": "Answer all questions. Each question carries 2 marks.",
    "defaultMarks": 2,
    "questions": [
      {
        "questionNumber": "1",
        "questionText": "Define Artificial Intelligence.",
        "marks": 2,
        "type": "short_answer",
        "options": [],
        "instructions": ""
      },
      {
        "questionNumber": "2",
        "questionText": "Which of the following is NOT a programming language?",
        "marks": 1,
        "type": "mcq",
        "options": [
          { "label": "A", "text": "Python" },
          { "label": "B", "text": "Java" },
          { "label": "C", "text": "HTML" },
          { "label": "D", "text": "C++" }
        ],
        "instructions": ""
      }
    ]
  },
  {
    "title": "SECTION B",
    "instructions": "Answer any two questions.",
    "defaultMarks": 10,
    "questions": [
      {
        "questionNumber": "3",
        "questionText": "Explain supervised and unsupervised learning with suitable examples.",
        "marks": 10,
        "type": "descriptive",
        "options": [],
        "instructions": ""
      }
    ]
  }
]
`;

// ─────────────────────────────────────────────────────────────────────────────
// Supported MIME types for Gemini multimodal input
// ─────────────────────────────────────────────────────────────────────────────
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// ─────────────────────────────────────────────────────────────────────────────
// extractQuestionPaper
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Extracts structured questions from a given file (PDF or Image) using Gemini.
 *
 * @param {string} filePath  - Absolute local path to the uploaded file.
 * @param {string} mimeType  - MIME type of the file (e.g. 'application/pdf').
 * @returns {Promise<Array>} - Extracted sections array conforming to QuestionPaper schema.
 * @throws {Error}           - Throws a clean, non-credential-leaking error on failure.
 */
const extractQuestionPaper = async (filePath, mimeType) => {
  // ── 1. Validate API key (lazy — checked at call time, after dotenv runs) ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.error('[AI Service] GEMINI_API_KEY is missing or is still the placeholder value.');
    throw new Error(
      'AI extraction is not configured. Please set GEMINI_API_KEY in the server .env file.'
    );
  }

  // ── 2. Validate MIME type ─────────────────────────────────────────────────
  const normalizedMime = mimeType?.toLowerCase() || '';
  if (!SUPPORTED_MIME_TYPES.has(normalizedMime)) {
    throw new Error(
      `Unsupported file type "${mimeType}". Supported types: PDF, JPG, JPEG, PNG, WEBP.`
    );
  }

  // ── 3. Read file ──────────────────────────────────────────────────────────
  if (!fs.existsSync(filePath)) {
    throw new Error('Uploaded file not found on server. Please re-upload the file.');
  }
  const fileBytes = fs.readFileSync(filePath);
  const base64Data = fileBytes.toString('base64');

  // ── 4. Initialize Gemini client (lazy — only NOW, after key is confirmed) ─
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  // ── 5. Call Gemini API (with automatic retry on 503/temporary demand spikes) ─
  let rawText;
  const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    const currentModel = modelsToTry[attempt % modelsToTry.length];
    try {
      console.log(`[AI Service] Step 4a: Initiating Gemini API request (attempt ${attempt + 1}) with model "${currentModel}" (mimeType: ${normalizedMime})`);
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [
          {
            role: 'user',
            parts: [
              { text: EXTRACTION_PROMPT },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: normalizedMime,
                },
              },
            ],
          },
        ],
      });
      rawText = response.text;
      console.log(`[AI Service] Step 5a: Gemini response received successfully (response length: ${rawText ? rawText.length : 0} characters)`);
      break;
    } catch (apiError) {
      lastError = apiError;
      const errMsg = apiError.message || '';
      console.warn(`[AI Service] Attempt ${attempt + 1} with ${currentModel} failed: ${errMsg.slice(0, 150)}`);
      if (attempt < 2 && (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('rate'))) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  if (!rawText && lastError) {
    // ── Detailed backend logging (never sent to frontend) ──────────────
    const errMsg = lastError.message || '';
    const errStatus = lastError.status || lastError.statusCode || 'unknown';
    console.error('[AI Service] Gemini API call failed:');
    console.error('  Status:', errStatus);
    console.error('  Message:', errMsg.substring(0, 500));
    console.error('  MIME type:', normalizedMime);
    console.error('  File size:', base64Data.length, 'bytes (base64)');

    // ── Categorize the error for a helpful frontend message ────────────
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
      throw new Error(
        'The Gemini API key is invalid. Please check that you have pasted a valid API key in server/.env. ' +
        'You can get one at https://aistudio.google.com/app/apikey'
      );
    }
    if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('Forbidden')) {
      throw new Error('The Gemini API key does not have permission to use this model. Please check your Google AI Studio account.');
    }
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('rate')) {
      throw new Error('Gemini API quota exceeded or rate limited. Please wait a moment and try again.');
    }
    if (errMsg.includes('NOT_FOUND') || errMsg.includes('not found')) {
      throw new Error('The Gemini model is not available. Please check the model name in the server configuration.');
    }

    throw new Error('AI service call failed. Please try again later.');
  }

  // ── 6. Strip markdown fences if model still wraps output ─────────────────
  rawText = (rawText || '').trim();
  if (rawText.startsWith('```json')) {
    rawText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  // ── 7. Parse JSON ─────────────────────────────────────────────────────────
  let sectionsData;
  try {
    sectionsData = JSON.parse(rawText);
  } catch (parseError) {
    console.error('[AI Service] Failed to parse Gemini JSON response:', rawText?.slice(0, 500));
    throw new Error(
      'AI returned an unreadable response. Please retry. If the problem persists, the question paper format may not be supported.'
    );
  }

  if (!Array.isArray(sectionsData) || sectionsData.length === 0) {
    throw new Error(
      'No content could be extracted from the question paper. Please check that the file is clear and readable.'
    );
  }

  return sectionsData;
};

const classifyVoiceCommand = async (speechText) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const prompt = `You are an intent classifier for an accessible examination system used by visually impaired students.

Your only task is to classify the student's spoken instruction.

Return exactly one of the following intents:

START
STOP
RESUME
REPEAT
NEXT_QUESTION
PREVIOUS_QUESTION
READ_ANSWER
UNKNOWN

Do not answer the student.
Do not explain the command.
Do not generate examination answers.
Do not provide academic assistance.
Do not change examination content.
Do not create new intents.

Interpret natural language instructions based only on the student's intended navigation or voice-control action.

Examples:
"Can you take me to the next one?" -> NEXT_QUESTION
"Please move forward." -> NEXT_QUESTION
"I want to hear the question after this." -> NEXT_QUESTION
"Take me back." -> PREVIOUS_QUESTION
"Go to the question before this." -> PREVIOUS_QUESTION
"Please read that again." -> REPEAT
"Could you say the question once more?" -> REPEAT
"Wait for a moment." -> STOP
"Please stop reading." -> STOP
"Carry on." -> RESUME
"Continue from where you stopped." -> RESUME
"Begin reading." -> START
"Can you read what I answered?" -> READ_ANSWER
"I want to hear my response." -> READ_ANSWER
"Tell me what I said." -> READ_ANSWER
"Repeat my answer." -> READ_ANSWER
"Read my answer back to me." -> READ_ANSWER

If the instruction does not clearly match one of the allowed intents, return UNKNOWN.

Return ONLY a valid JSON object matching this schema:
{
  "intent": "INTENT_NAME"
}

Student instruction:
"${speechText}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    
    let rawText = response.text || '';
    rawText = rawText.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(rawText);
    const validIntents = ['START', 'STOP', 'RESUME', 'REPEAT', 'NEXT_QUESTION', 'PREVIOUS_QUESTION', 'READ_ANSWER', 'UNKNOWN'];
    
    if (parsed.intent && validIntents.includes(parsed.intent)) {
      return parsed.intent;
    }
    return 'UNKNOWN';
  } catch (error) {
    console.error('[AI Service] classifyVoiceCommand failed:', error.message);
    return 'UNKNOWN';
  }
};

module.exports = {
  extractQuestionPaper,
  classifyVoiceCommand
};
