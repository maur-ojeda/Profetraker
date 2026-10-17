import OpenAI from 'openai'

export const nvidia = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY!,
})

export const NVIDIA_MODEL = 'meta/muse-glimmer-30b'
