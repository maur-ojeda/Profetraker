import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY!
export const gemini = new GoogleGenerativeAI(apiKey)

export const geminiModel = gemini.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 1024,
  },
})
