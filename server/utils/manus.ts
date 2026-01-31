const MANUS_BASE = 'https://api.manus.ai/v1'

export async function uploadFileToManus(
  apiKey: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'application/pdf'
) {
  // Step 1: Create file record and get presigned upload URL (Manus expects JSON, not multipart)
  const createRes = await fetch(`${MANUS_BASE}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      API_KEY: apiKey,
    },
    body: JSON.stringify({ filename: fileName }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Manus file create failed: ${createRes.status} ${err}`)
  }
  const fileRecord = (await createRes.json()) as {
    id: string
    upload_url: string
    [key: string]: unknown
  }

  // Step 2: PUT file content to the presigned S3 URL
  const putRes = await fetch(fileRecord.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: new Uint8Array(fileBuffer),
  })
  if (!putRes.ok) {
    const err = await putRes.text()
    throw new Error(`Manus file upload (PUT) failed: ${putRes.status} ${err}`)
  }

  return fileRecord
}

function buildExposePrompt(newsContext?: string): string {
  let prompt = `Analysiere dieses deutsche Immobilien-Exposé (PDF) und gib die Antwort als valides JSON zurück.`
  
  if (newsContext) {
    prompt += `\n\n**WICHTIGER KONTEXT ZUR LAGE:**\n${newsContext}\n\nBerücksichtige diese aktuellen Nachrichten und Entwicklungen in der Umgebung bei deiner Analyse, insbesondere bei der Bewertung von Pros, Cons, Risks und der finalen Empfehlung.`
  }
  
  prompt += `\n\nAntworte NUR mit einem JSON-Objekt in folgendem Format (keine Markdown-Formatierung, kein Text davor oder danach):

{
  "property": {
    "address": "Vollständige Adresse (Straße, PLZ, Ort)",
    "type": "Wohnung/Haus/Gewerbe/etc.",
    "size_sqm": 0,
    "rooms": 0,
    "year_built": 0,
    "energy_rating": "A/B/C/D/E/F/G oder kWh-Wert"
  },
  "financials": {
    "purchase_price": 0,
    "price_per_sqm": 0,
    "additional_costs_percent": 0,
    "total_investment": 0,
    "monthly_rent": 0,
    "annual_rent": 0,
    "gross_yield_percent": 0,
    "net_yield_percent": 0,
    "monthly_costs": 0
  },
  "pros": [
    "Pro-Argument 1",
    "Pro-Argument 2"
  ],
  "cons": [
    "Contra-Argument 1",
    "Contra-Argument 2"
  ],
  "risks": [
    {
      "category": "Sanierung/Mietrecht/Lage/Markt/etc.",
      "description": "Beschreibung des Risikos"
    }
  ],
  "summary": "Kurze Zusammenfassung und Fazit zur Immobilie als Investment (2-3 Sätze)",
  "recommendation": "kaufen/nicht_kaufen/pruefen"
}

Wichtig:
- Alle Zahlen ohne Währungssymbole oder Einheiten (nur Zahlen)
- Fehlende Werte als null setzen
- Maximal 5 Pros, 5 Cons, 5 Risks
- recommendation muss einer der drei Werte sein: "kaufen", "nicht_kaufen", "pruefen"`
  
  return prompt
}

export async function createAnalysisTask(
  apiKey: string,
  fileId: string,
  projectId?: string,
  newsContext?: string
) {
  const body: Record<string, unknown> = {
    type: 'analysis',
    prompt: buildExposePrompt(newsContext),
    attachments: [{ type: 'file', file_id: fileId }],
  }
  if (projectId) body.project_id = projectId

  console.log('[MANUS] Creating task with body:', JSON.stringify(body, null, 2))

  const res = await fetch(`${MANUS_BASE}/tasks`, {
    method: 'POST',
    headers: {
      API_KEY: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  
  console.log('[MANUS] Task creation response status:', res.status)
  
  if (!res.ok) {
    const err = await res.text()
    console.error('[MANUS] Task creation failed:', err)
    throw new Error(`Manus task create failed: ${res.status} ${err}`)
  }
  
  const result = await res.json()
  console.log('[MANUS] Task creation response:', JSON.stringify(result, null, 2))
  
  // Manus API returns task_id, not id - normalize it
  if (result.task_id && !result.id) {
    result.id = result.task_id
  }
  
  return result as { id: string; task_id?: string; status?: string; [key: string]: unknown }
}

export async function getTaskResult(apiKey: string, taskId: string) {
  const res = await fetch(`${MANUS_BASE}/tasks/${taskId}`, {
    headers: { API_KEY: apiKey },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Manus task get failed: ${res.status} ${err}`)
  }
  const result = await res.json()
  console.log('[MANUS] Task status:', result.status, '- Has output:', !!result.output)
  return result as {
    id: string
    status: string
    task_status?: string
    progress?: number
    current_step?: string
    output?: Array<{
      role: string
      content?: Array<{ type: string; text?: string; [key: string]: unknown }>
      [key: string]: unknown
    }>
    result?: { output?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}
