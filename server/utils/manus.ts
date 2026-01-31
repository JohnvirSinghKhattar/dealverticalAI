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
    body: fileBuffer,
  })
  if (!putRes.ok) {
    const err = await putRes.text()
    throw new Error(`Manus file upload (PUT) failed: ${putRes.status} ${err}`)
  }

  return fileRecord
}

const EXPOSE_PROMPT = `Analysiere dieses deutsche Immobilien-Exposé (PDF). Gib die Antwort strukturiert auf Deutsch.

1. **Finanzen**: Kaufpreis, geschätzte Nebenkosten, Mieteinnahmen falls angegeben, grobe Rendite wenn ableitbar, wichtige Kennzahlen.
2. **Pro & Contra**: Pro-Argumente und Contra-Argumente für den Kauf als Investment (max. je 5 Punkte).
3. **Risiken**: Wichtige Risiken (z.B. Sanierung, Mietrecht, Lage).
4. **Adresse**: Vollständige Adresse der Immobilie (Straße, PLZ, Ort) – falls im Dokument vorhanden.

Antworte klar und knapp.`

export async function createAnalysisTask(
  apiKey: string,
  fileId: string,
  projectId?: string
) {
  const body: Record<string, unknown> = {
    type: 'analysis',
    prompt: EXPOSE_PROMPT,
    attachments: [{ type: 'file', file_id: fileId }],
  }
  if (projectId) body.project_id = projectId

  const res = await fetch(`${MANUS_BASE}/tasks`, {
    method: 'POST',
    headers: {
      API_KEY: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Manus task create failed: ${res.status} ${err}`)
  }
  return (await res.json()) as { id: string; status: string; [key: string]: unknown }
}

export async function getTaskResult(apiKey: string, taskId: string) {
  const res = await fetch(`${MANUS_BASE}/tasks/${taskId}`, {
    headers: { API_KEY: apiKey },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Manus task get failed: ${res.status} ${err}`)
  }
  return (await res.json()) as {
    id: string
    status: string
    result?: { output?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}
