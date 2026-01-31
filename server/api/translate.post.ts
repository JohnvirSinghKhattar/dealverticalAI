import { defineEventHandler, readBody, createError } from 'h3'

interface TranslateRequest {
  text: string
  targetLanguage: 'en' | 'de'
}

interface TranslateResponse {
  translatedText: string
}

export default defineEventHandler(async (event): Promise<TranslateResponse> => {
  const config = useRuntimeConfig()
  const openaiApiKey = config.openaiApiKey

  if (!openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key not configured',
    })
  }

  const body = await readBody<TranslateRequest>(event)

  if (!body?.text) {
    throw createError({
      statusCode: 400,
      message: 'Missing text to translate',
    })
  }

  if (!body.targetLanguage || !['en', 'de'].includes(body.targetLanguage)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid target language. Must be "en" or "de"',
    })
  }

  const targetLangName = body.targetLanguage === 'en' ? 'English' : 'German'
  const sourceLangName = body.targetLanguage === 'en' ? 'German' : 'English'

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in real estate and financial documents. Translate the following JSON content from ${sourceLangName} to ${targetLangName}. 
            
IMPORTANT RULES:
1. Preserve all JSON structure exactly - only translate string values
2. Keep all keys in their original form (do not translate keys)
3. Keep numbers, dates, and technical terms accurate
4. Maintain professional real estate terminology
5. Return ONLY the translated JSON, no explanations or markdown`,
          },
          {
            role: 'user',
            content: body.text,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TRANSLATE] OpenAI API error:', response.status, errorText)
      throw createError({
        statusCode: 502,
        message: 'Translation service error',
      })
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }

    const translatedText = data.choices?.[0]?.message?.content?.trim()

    if (!translatedText) {
      throw createError({
        statusCode: 502,
        message: 'No translation received from service',
      })
    }

    return { translatedText }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    console.error('[TRANSLATE] Error:', error)
    throw createError({
      statusCode: 500,
      message: 'Translation failed',
    })
  }
})
