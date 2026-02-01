<script setup lang="ts">
interface AnalysisData {
  id: number
  address: string | null
  fileName: string
  status: string
  createdAt: string | null
  resultJson?: string | null
  neighborhoodJson?: string | null
  amenitiesJson?: string | null
  progress?: number
  currentStep?: string
  manusTaskUrl?: string
}

interface Amenity {
  type: string
  name: string
  lat: number
  lon: number
  distance: number
  category: string
}

interface AmenitiesData {
  schools: Amenity[]
  groceryStores: Amenity[]
  doctors: Amenity[]
  pharmacies: Amenity[]
  publicTransport: Amenity[]
  restaurants: Amenity[]
  parks: Amenity[]
  banks: Amenity[]
  fetchedAt: string
}

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: analysis, error, refresh } = await useFetch<AnalysisData>(() => `/api/analyses/${id.value}`, {
  default: () => null,
})

interface StructuredResult {
  property?: {
    address?: string
    type?: string
    size_sqm?: number
    rooms?: number
    year_built?: number
    energy_rating?: string
  }
  financials?: {
    purchase_price?: number
    price_per_sqm?: number
    additional_costs_percent?: number
    total_investment?: number
    monthly_rent?: number
    annual_rent?: number
    gross_yield_percent?: number
    net_yield_percent?: number
    monthly_costs?: number
  }
  pros?: string[]
  cons?: string[]
  risks?: Array<{ category?: string; description?: string }>
  summary?: string
  recommendation?: 'kaufen' | 'nicht_kaufen' | 'pruefen'
  raw?: unknown
}

interface NewsItem {
  title: string
  url: string
  publishedAt?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

interface NeighborhoodData {
  address?: string
  news?: NewsItem[]
}

const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)

// Language toggle state
const currentLanguage = ref<'de' | 'en'>('de')
const translatedResult = ref<StructuredResult | null>(null)
const translatedNeighborhood = ref<NeighborhoodData | null>(null)
const isTranslating = ref(false)
const translationError = ref('')

async function translateToEnglish() {
  if (isTranslating.value || !result.value) return
  
  // If already translated, just switch
  if (translatedResult.value) {
    currentLanguage.value = 'en'
    return
  }
  
  isTranslating.value = true
  translationError.value = ''
  
  try {
    // Translate main result
    const resultResponse = await $fetch<{ translatedText: string }>('/api/translate', {
      method: 'POST',
      body: {
        text: JSON.stringify(result.value),
        targetLanguage: 'en',
      },
    })
    
    try {
      translatedResult.value = JSON.parse(resultResponse.translatedText)
    } catch {
      // If parsing fails, try to extract JSON from response
      const jsonMatch = resultResponse.translatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        translatedResult.value = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid translation response')
      }
    }
    
    // Translate neighborhood data if exists
    if (neighborhood.value?.news?.length) {
      const neighborhoodResponse = await $fetch<{ translatedText: string }>('/api/translate', {
        method: 'POST',
        body: {
          text: JSON.stringify(neighborhood.value),
          targetLanguage: 'en',
        },
      })
      
      try {
        translatedNeighborhood.value = JSON.parse(neighborhoodResponse.translatedText)
      } catch {
        const jsonMatch = neighborhoodResponse.translatedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          translatedNeighborhood.value = JSON.parse(jsonMatch[0])
        }
      }
    }
    
    currentLanguage.value = 'en'
  } catch (err) {
    console.error('Translation failed:', err)
    translationError.value = 'Translation failed. Please try again.'
  } finally {
    isTranslating.value = false
  }
}

function switchToGerman() {
  currentLanguage.value = 'de'
}

// Display result based on current language
const displayResult = computed(() => {
  return currentLanguage.value === 'en' && translatedResult.value 
    ? translatedResult.value 
    : result.value
})

const displayNeighborhood = computed(() => {
  return currentLanguage.value === 'en' && translatedNeighborhood.value 
    ? translatedNeighborhood.value 
    : neighborhood.value
})

async function pollForCompletion() {
  try {
    const pollResult = await $fetch<{ 
      status: string
      progress?: number
      currentStep?: string
      manusTaskUrl?: string
      resultJson?: unknown
      neighborhoodJson?: unknown
    }>(`/api/analyses/${id.value}/poll`)
    
    // Update the analysis data with poll results
    if (analysis.value) {
      analysis.value.status = pollResult.status
      analysis.value.progress = pollResult.progress
      analysis.value.currentStep = pollResult.currentStep
      analysis.value.manusTaskUrl = pollResult.manusTaskUrl
      
      if (pollResult.status === 'completed') {
        // Refresh to get full data when completed
        await refresh()
        if (pollInterval.value) {
          clearInterval(pollInterval.value)
          pollInterval.value = null
        }
      }
    }
  } catch (err) {
    console.error('Poll failed:', err)
  }
}

onMounted(() => {
  if (analysis.value?.status === 'processing') {
    // Poll immediately on mount
    pollForCompletion()
    // Then poll every 5 seconds
    pollInterval.value = setInterval(pollForCompletion, 5000)
  }
})
onUnmounted(() => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
})

const result = computed<StructuredResult | null>(() => {
  const a = analysis.value
  if (!a?.resultJson) return null
  try {
    return typeof a.resultJson === 'string' ? JSON.parse(a.resultJson) : a.resultJson
  } catch {
    return null
  }
})

// Check if result has structured data
const hasStructuredData = computed(() => {
  return result.value && (result.value.property || result.value.financials || result.value.pros || result.value.cons)
})

// Format currency
function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '–'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

// Format percentage
function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '–'
  return `${value.toFixed(2)}%`
}

// Format number with decimals
function formatNumber(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null) return '–'
  return value.toFixed(decimals)
}

// Key Financial KPIs for Institutional Investors
const rentMultiplier = computed(() => {
  const f = displayResult.value?.financials
  if (!f?.purchase_price || !f?.annual_rent || f.annual_rent === 0) return null
  return f.purchase_price / f.annual_rent
})

const cashOnCashReturn = computed(() => {
  const f = displayResult.value?.financials
  if (!f?.annual_rent || !f?.total_investment || f.total_investment === 0) return null
  const annualCashFlow = f.annual_rent - (f.monthly_costs ? f.monthly_costs * 12 : 0)
  return (annualCashFlow / f.total_investment) * 100
})

const capRate = computed(() => {
  const f = displayResult.value?.financials
  if (!f?.annual_rent || !f?.purchase_price || f.purchase_price === 0) return null
  const noi = f.annual_rent - (f.monthly_costs ? f.monthly_costs * 12 : 0)
  return (noi / f.purchase_price) * 100
})

const rentToInvestmentRatio = computed(() => {
  const f = displayResult.value?.financials
  if (!f?.annual_rent || !f?.total_investment || f.total_investment === 0) return null
  return (f.annual_rent / f.total_investment) * 100
})

// Generate PDF report for download
async function downloadPDF() {
  const r = result.value
  const n = neighborhood.value
  const a = analysis.value
  
  if (!r && !a) return
  
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  
  // Create PDF with A4 format
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (2 * margin)
  let yPos = margin
  
  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Property Analysis Report', margin, yPos)
  yPos += 8
  
  // Subtitle with address
  if (r?.property?.address || a?.address) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60)
    const address = r?.property?.address || a?.address || ''
    const splitAddress = doc.splitTextToSize(address, contentWidth)
    doc.text(splitAddress, margin, yPos)
    yPos += splitAddress.length * 5 + 5
  }
  
  // Date
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, yPos)
  yPos += 12
  doc.setTextColor(0)
  
  // Separator line
  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10
  
  // Property Details
  if (r?.property && (r.property.type || r.property.size_sqm || r.property.rooms || r.property.year_built || r.property.energy_rating)) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Property Details', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    const propertyData: string[][] = []
    if (r.property.type) propertyData.push(['Type', r.property.type])
    if (r.property.size_sqm) propertyData.push(['Size', `${r.property.size_sqm} m²`])
    if (r.property.rooms) propertyData.push(['Rooms', String(r.property.rooms)])
    if (r.property.year_built) propertyData.push(['Year Built', String(r.property.year_built)])
    if (r.property.energy_rating) propertyData.push(['Energy Rating', r.property.energy_rating])
    
    if (propertyData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [],
        body: propertyData,
        theme: 'plain',
        styles: { 
          fontSize: 10, 
          cellPadding: 4,
          lineColor: [240, 240, 240],
          lineWidth: 0.1
        },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 50, textColor: [60, 60, 60] },
          1: { cellWidth: contentWidth - 50 }
        },
        margin: { left: margin, right: margin }
      })
      yPos = (doc as any).lastAutoTable.finalY + 12
    }
  }
  
  // Financial Overview
  if (r?.financials) {
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Financial Overview', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    const financialData: string[][] = []
    if (r.financials.purchase_price) financialData.push(['Purchase Price', formatCurrency(r.financials.purchase_price)])
    if (r.financials.price_per_sqm) financialData.push(['Price per m²', formatCurrency(r.financials.price_per_sqm)])
    if (r.financials.total_investment) financialData.push(['Total Investment', formatCurrency(r.financials.total_investment)])
    if (r.financials.monthly_rent) financialData.push(['Monthly Rent', formatCurrency(r.financials.monthly_rent)])
    if (r.financials.annual_rent) financialData.push(['Annual Rent', formatCurrency(r.financials.annual_rent)])
    if (r.financials.gross_yield_percent) financialData.push(['Gross Yield', formatPercent(r.financials.gross_yield_percent)])
    if (r.financials.net_yield_percent) financialData.push(['Net Yield', formatPercent(r.financials.net_yield_percent)])
    if (r.financials.monthly_costs) financialData.push(['Monthly Costs', formatCurrency(r.financials.monthly_costs)])
    
    if (financialData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: financialData,
        theme: 'striped',
        headStyles: { 
          fillColor: [34, 197, 94], 
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 4
        },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { halign: 'right', cellWidth: contentWidth - 70 }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: margin, right: margin }
      })
      yPos = (doc as any).lastAutoTable.finalY + 12
    }
  }
  
  // Key Investment Metrics
  const hasKPIs = rentMultiplier.value || cashOnCashReturn.value || capRate.value || rentToInvestmentRatio.value
  if (hasKPIs) {
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Key Investment Metrics', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    const kpiData: string[][] = []
    if (rentMultiplier.value) kpiData.push(['Rent Multiplier', `${formatNumber(rentMultiplier.value, 1)}x`, 'Years to recover investment'])
    if (cashOnCashReturn.value) kpiData.push(['Cash-on-Cash Return', formatPercent(cashOnCashReturn.value), 'Annual cash flow / Investment'])
    if (capRate.value) kpiData.push(['Cap Rate', formatPercent(capRate.value), 'Net operating income / Price'])
    if (rentToInvestmentRatio.value) kpiData.push(['Rent-to-Investment', formatPercent(rentToInvestmentRatio.value), 'Annual rent / Total investment'])
    
    if (kpiData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value', 'Description']],
        body: kpiData,
        theme: 'striped',
        headStyles: { 
          fillColor: [139, 92, 246], 
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9.5,
          cellPadding: 4
        },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
          2: { cellWidth: contentWidth - 80, fontSize: 8, textColor: [100, 100, 100] }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: margin, right: margin }
      })
      yPos = (doc as any).lastAutoTable.finalY + 12
    }
  }
  
  // Pros
  if (r?.pros?.length) {
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 197, 94)
    doc.text('Pros', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: r.pros.map((p, i) => [`${i + 1}. ${p}`]),
      theme: 'plain',
      styles: { 
        fontSize: 10, 
        cellPadding: 3,
        textColor: [40, 40, 40]
      },
      margin: { left: margin + 5, right: margin }
    })
    yPos = (doc as any).lastAutoTable.finalY + 12
  }
  
  // Cons
  if (r?.cons?.length) {
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(239, 68, 68)
    doc.text('Cons', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: r.cons.map((c, i) => [`${i + 1}. ${c}`]),
      theme: 'plain',
      styles: { 
        fontSize: 10, 
        cellPadding: 3,
        textColor: [40, 40, 40]
      },
      margin: { left: margin + 5, right: margin }
    })
    yPos = (doc as any).lastAutoTable.finalY + 12
  }
  
  // Risks
  if (r?.risks?.length) {
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Risk Assessment', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    const riskData = r.risks.map(risk => [
      risk.category || 'Risk',
      risk.description || ''
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Description']],
      body: riskData,
      theme: 'striped',
      headStyles: { 
        fillColor: [251, 191, 36], 
        textColor: 0,
        fontSize: 11,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 9.5, 
        cellPadding: 4,
        lineColor: [240, 240, 240],
        lineWidth: 0.1
      },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 45 }, 
        1: { cellWidth: contentWidth - 45 }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: margin, right: margin }
    })
    yPos = (doc as any).lastAutoTable.finalY + 12
  }
  
  // Summary
  if (r?.summary) {
    if (yPos > pageHeight - 50) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Summary', margin, yPos)
    yPos += 8
    doc.setTextColor(0)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const splitSummary = doc.splitTextToSize(r.summary, contentWidth)
    doc.text(splitSummary, margin, yPos)
    yPos += splitSummary.length * 5 + 12
  }
  
  // Recommendation
  if (r?.recommendation) {
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = margin
    }
    
    const recText = r.recommendation === 'kaufen' ? 'BUY' : r.recommendation === 'nicht_kaufen' ? 'DO NOT BUY' : 'NEEDS REVIEW'
    const recColor = r.recommendation === 'kaufen' ? [34, 197, 94] : r.recommendation === 'nicht_kaufen' ? [239, 68, 68] : [251, 191, 36]
    
    // Recommendation box
    doc.setFillColor(recColor[0], recColor[1], recColor[2])
    doc.roundedRect(margin, yPos, contentWidth, 15, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`Recommendation: ${recText}`, margin + 5, yPos + 10)
    doc.setTextColor(0)
    yPos += 20
  }
  
  // Nearby Amenities
  if (amenities.value) {
    const am = amenities.value
    const hasAmenities = am.schools?.length || am.groceryStores?.length || am.doctors?.length || 
                        am.pharmacies?.length || am.publicTransport?.length || am.parks?.length ||
                        am.restaurants?.length || am.banks?.length
    
    if (hasAmenities) {
      doc.addPage()
      yPos = margin
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40)
      doc.text('Nearby Amenities', margin, yPos)
      yPos += 6
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text('Distances calculated from property location (2km radius)', margin, yPos)
      yPos += 10
      doc.setTextColor(0)
      
      // Quick Summary
      const summaryData: string[][] = []
      if (am.schools?.length) summaryData.push(['🏫 Nearest School', formatDistance(am.schools[0].distance)])
      if (am.groceryStores?.length) summaryData.push(['🛒 Nearest Grocery', formatDistance(am.groceryStores[0].distance)])
      if (am.doctors?.length) summaryData.push(['🏥 Nearest Doctor', formatDistance(am.doctors[0].distance)])
      if (am.pharmacies?.length) summaryData.push(['💊 Nearest Pharmacy', formatDistance(am.pharmacies[0].distance)])
      if (am.publicTransport?.length) summaryData.push(['🚌 Nearest Transit', formatDistance(am.publicTransport[0].distance)])
      if (am.parks?.length) summaryData.push(['🌳 Nearest Park', formatDistance(am.parks[0].distance)])
      
      if (summaryData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [],
          body: summaryData,
          theme: 'plain',
          styles: { 
            fontSize: 10, 
            cellPadding: 3,
            lineColor: [240, 240, 240],
            lineWidth: 0.1
          },
          columnStyles: { 
            0: { fontStyle: 'bold', cellWidth: 60, textColor: [40, 40, 40] },
            1: { cellWidth: contentWidth - 60, halign: 'right', fontStyle: 'bold', textColor: [20, 184, 166] }
          },
          margin: { left: margin, right: margin }
        })
        yPos = (doc as any).lastAutoTable.finalY + 10
      }
      
      // Detailed Lists
      const amenityCategories = [
        { data: am.schools, title: '🏫 Schools & Kindergartens', limit: 5 },
        { data: am.groceryStores, title: '🛒 Grocery Stores', limit: 5 },
        { data: am.doctors, title: '🏥 Doctors & Clinics', limit: 5 },
        { data: am.pharmacies, title: '💊 Pharmacies', limit: 5 },
        { data: am.publicTransport, title: '🚌 Public Transport', limit: 5 },
        { data: am.parks, title: '🌳 Parks & Playgrounds', limit: 5 },
        { data: am.restaurants, title: '🍽️ Restaurants & Cafés', limit: 5 },
        { data: am.banks, title: '🏦 Banks & ATMs', limit: 5 }
      ]
      
      for (const category of amenityCategories) {
        if (category.data?.length) {
          if (yPos > pageHeight - 50) {
            doc.addPage()
            yPos = margin
          }
          
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(40)
          doc.text(category.title, margin, yPos)
          yPos += 6
          doc.setTextColor(0)
          
          const amenityData = category.data.slice(0, category.limit).map(item => [
            item.name,
            formatDistance(item.distance)
          ])
          
          autoTable(doc, {
            startY: yPos,
            head: [],
            body: amenityData,
            theme: 'plain',
            styles: { 
              fontSize: 9, 
              cellPadding: 2.5,
              textColor: [60, 60, 60]
            },
            columnStyles: { 
              0: { cellWidth: contentWidth - 30 },
              1: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [20, 184, 166] }
            },
            margin: { left: margin + 3, right: margin }
          })
          yPos = (doc as any).lastAutoTable.finalY + 8
        }
      }
      
      // Data attribution
      doc.setFontSize(7)
      doc.setTextColor(150)
      const attribution = `Data from OpenStreetMap • Updated ${am.fetchedAt ? new Date(am.fetchedAt).toLocaleDateString('en-GB') : 'recently'}`
      doc.text(attribution, pageWidth - margin, yPos, { align: 'right' })
    }
  }
  
  // Neighborhood Intelligence
  if (n?.news?.length) {
    doc.addPage()
    yPos = margin
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Neighborhood Intelligence', margin, yPos)
    yPos += 6
    
    if (n.address) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(n.address, margin, yPos)
      yPos += 10
    } else {
      yPos += 8
    }
    doc.setTextColor(0)
    
    const newsData = n.news.map(item => {
      const sentiment = item.sentiment ? item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1) : ''
      const date = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
      return [
        item.title,
        sentiment,
        date
      ]
    })
    
    autoTable(doc, {
      startY: yPos,
      head: [['News Title', 'Sentiment', 'Date']],
      body: newsData,
      theme: 'striped',
      headStyles: { 
        fillColor: [147, 51, 234], 
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: [240, 240, 240],
        lineWidth: 0.1
      },
      columnStyles: { 
        0: { cellWidth: contentWidth - 50 },
        1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 25, halign: 'center', fontSize: 8, textColor: [100, 100, 100] }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: margin, right: margin },
      didParseCell: function(data) {
        if (data.column.index === 1 && data.cell.section === 'body') {
          const sentiment = data.cell.text[0]?.toLowerCase()
          if (sentiment === 'positive') {
            data.cell.styles.textColor = [34, 197, 94]
          } else if (sentiment === 'negative') {
            data.cell.styles.textColor = [239, 68, 68]
          } else if (sentiment === 'neutral') {
            data.cell.styles.textColor = [107, 114, 128]
          }
        }
      }
    })
  }
  
  // Save PDF
  doc.save(`property-analysis-${a?.id || 'report'}.pdf`)
}

const neighborhood = computed<NeighborhoodData | null>(() => {
  const a = analysis.value
  if (!a?.neighborhoodJson) return null
  try {
    return typeof a.neighborhoodJson === 'string' ? JSON.parse(a.neighborhoodJson) : a.neighborhoodJson
  } catch {
    return null
  }
})

const amenities = computed<AmenitiesData | null>(() => {
  const a = analysis.value
  if (!a?.amenitiesJson) return null
  try {
    return typeof a.amenitiesJson === 'string' ? JSON.parse(a.amenitiesJson) : a.amenitiesJson
  } catch {
    return null
  }
})

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

function getAmenityIcon(category: string): string {
  const icons: Record<string, string> = {
    school: '🏫',
    grocery: '🛒',
    doctor: '🏥',
    pharmacy: '💊',
    public_transport: '🚌',
    restaurant: '🍽️',
    park: '🌳',
    bank: '🏦',
  }
  return icons[category] || '📍'
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <NuxtLink to="/dashboard" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors mb-6">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to My Analyses
    </NuxtLink>

    <div v-if="error" class="mt-6 rounded-lg bg-red-50 border border-red-200 p-6">
      <div class="flex items-start gap-3">
        <svg class="h-6 w-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-base font-semibold text-red-800">Analysis Not Found</p>
          <p class="text-sm text-red-700 mt-1">The requested analysis could not be found. It may have been deleted or the link is incorrect.</p>
        </div>
      </div>
    </div>

    <template v-else-if="analysis">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-gray-900">
              {{ result?.property?.address || analysis.address || `Property Analysis #${analysis.id}` }}
            </h1>
            <div class="flex items-center gap-3 mt-3">
              <p class="text-sm text-gray-500">
                {{ analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date unavailable' }}
              </p>
              <span class="text-gray-300">•</span>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                :class="{
                  'bg-amber-100 text-amber-800': analysis.status === 'uploaded' || analysis.status === 'processing',
                  'bg-green-100 text-green-800': analysis.status === 'completed',
                  'bg-red-100 text-red-800': analysis.status === 'failed',
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="{
                    'bg-amber-600 animate-pulse': analysis.status === 'uploaded' || analysis.status === 'processing',
                    'bg-green-600': analysis.status === 'completed',
                    'bg-red-600': analysis.status === 'failed',
                  }"
                ></span>
                {{ analysis.status === 'uploaded' ? 'Uploaded' : analysis.status === 'processing' ? 'Processing' : analysis.status === 'completed' ? 'Completed' : 'Failed' }}
              </span>
            </div>
          </div>
          <!-- Action buttons -->
          <div v-if="analysis.status === 'completed' && result" class="flex items-center gap-3">
            <!-- Language toggle -->
            <div class="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                @click="switchToGerman"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  currentLanguage === 'de' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                DE
              </button>
              <button
                @click="translateToEnglish"
                :disabled="isTranslating"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
                  currentLanguage === 'en' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900',
                  isTranslating ? 'opacity-50 cursor-wait' : ''
                ]"
              >
                <svg v-if="isTranslating" class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                EN
              </button>
            </div>
            <!-- Download button -->
            <button
              @click="downloadPDF"
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div v-if="analysis.status === 'processing'" class="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <svg class="animate-spin h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-amber-900 mb-2">
            Analysis in Progress
          </h3>
          <p class="text-amber-800 mb-1">
            Our AI is analyzing your property exposé and gathering insights
          </p>
        </div>

        <!-- Progress bar -->
        <div v-if="analysis.progress !== undefined" class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-amber-900">Progress</span>
            <span class="text-sm font-semibold text-amber-900">{{ Math.round(analysis.progress * 100) }}%</span>
          </div>
          <div class="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
            <div 
              class="bg-amber-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              :style="{ width: `${analysis.progress * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Current step -->
        <div v-if="analysis.currentStep" class="mb-4 text-center">
          <p class="text-sm text-amber-800">
            <span class="font-medium">Current step:</span> {{ analysis.currentStep }}
          </p>
        </div>

        <!-- Auto-refresh notice -->
        <div class="text-center">
          <p class="text-sm text-amber-700">
            This page will refresh automatically every 4 seconds
          </p>
        </div>
      </div>

      <template v-else-if="analysis.status === 'completed'">
        <!-- Translation error message -->
        <div v-if="translationError" class="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-red-800">{{ translationError }}</p>
          </div>
        </div>

        <!-- Property Details Card -->
        <section v-if="displayResult?.property || hasStructuredData" class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900">Property Details</h2>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-if="displayResult?.property?.type" class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                <p class="text-sm font-semibold text-gray-900 mt-1">{{ displayResult.property.type }}</p>
              </div>
              <div v-if="displayResult?.property?.size_sqm" class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Size</p>
                <p class="text-sm font-semibold text-gray-900 mt-1">{{ displayResult.property.size_sqm }} m²</p>
              </div>
              <div v-if="displayResult?.property?.rooms" class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Rooms</p>
                <p class="text-sm font-semibold text-gray-900 mt-1">{{ displayResult.property.rooms }}</p>
              </div>
              <div v-if="displayResult?.property?.year_built" class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Year Built</p>
                <p class="text-sm font-semibold text-gray-900 mt-1">{{ displayResult.property.year_built }}</p>
              </div>
              <div v-if="displayResult?.property?.energy_rating" class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Energy Rating</p>
                <p class="text-sm font-semibold text-gray-900 mt-1">{{ displayResult.property.energy_rating }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Financial Overview Card -->
        <section v-if="displayResult?.financials" class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900">Financial Overview</h2>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div v-if="displayResult.financials.purchase_price" class="bg-green-50 rounded-lg p-4">
                <p class="text-xs text-green-700 uppercase tracking-wide">Purchase Price</p>
                <p class="text-lg font-bold text-green-900 mt-1">{{ formatCurrency(displayResult.financials.purchase_price) }}</p>
              </div>
              <div v-if="displayResult.financials.total_investment" class="bg-green-50 rounded-lg p-4">
                <p class="text-xs text-green-700 uppercase tracking-wide">Total Investment</p>
                <p class="text-lg font-bold text-green-900 mt-1">{{ formatCurrency(displayResult.financials.total_investment) }}</p>
              </div>
              <div v-if="displayResult.financials.price_per_sqm" class="bg-gray-50 rounded-lg p-4">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Price per m²</p>
                <p class="text-lg font-bold text-gray-900 mt-1">{{ formatCurrency(displayResult.financials.price_per_sqm) }}</p>
              </div>
              <div v-if="displayResult.financials.monthly_rent" class="bg-blue-50 rounded-lg p-4">
                <p class="text-xs text-blue-700 uppercase tracking-wide">Monthly Rent</p>
                <p class="text-lg font-bold text-blue-900 mt-1">{{ formatCurrency(displayResult.financials.monthly_rent) }}</p>
              </div>
              <div v-if="displayResult.financials.annual_rent" class="bg-blue-50 rounded-lg p-4">
                <p class="text-xs text-blue-700 uppercase tracking-wide">Annual Rent</p>
                <p class="text-lg font-bold text-blue-900 mt-1">{{ formatCurrency(displayResult.financials.annual_rent) }}</p>
              </div>
              <div v-if="displayResult.financials.monthly_costs" class="bg-gray-50 rounded-lg p-4">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Monthly Costs</p>
                <p class="text-lg font-bold text-gray-900 mt-1">{{ formatCurrency(displayResult.financials.monthly_costs) }}</p>
              </div>
              <div v-if="displayResult.financials.gross_yield_percent" class="bg-amber-50 rounded-lg p-4">
                <p class="text-xs text-amber-700 uppercase tracking-wide">Gross Yield</p>
                <p class="text-lg font-bold text-amber-900 mt-1">{{ formatPercent(displayResult.financials.gross_yield_percent) }}</p>
              </div>
              <div v-if="displayResult.financials.net_yield_percent" class="bg-amber-50 rounded-lg p-4">
                <p class="text-xs text-amber-700 uppercase tracking-wide">Net Yield</p>
                <p class="text-lg font-bold text-amber-900 mt-1">{{ formatPercent(displayResult.financials.net_yield_percent) }}</p>
              </div>
            </div>

            <!-- Key Investment KPIs -->
            <div v-if="rentMultiplier || cashOnCashReturn || capRate || rentToInvestmentRatio" class="mt-6 pt-6 border-t border-gray-200">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Key Investment Metrics</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-if="rentMultiplier" class="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <p class="text-xs text-purple-700 uppercase tracking-wide">Rent Multiplier</p>
                  <p class="text-lg font-bold text-purple-900 mt-1">{{ formatNumber(rentMultiplier, 1) }}x</p>
                  <p class="text-xs text-purple-600 mt-1">Years to recover investment</p>
                </div>
                <div v-if="cashOnCashReturn" class="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <p class="text-xs text-indigo-700 uppercase tracking-wide">Cash-on-Cash Return</p>
                  <p class="text-lg font-bold text-indigo-900 mt-1">{{ formatPercent(cashOnCashReturn) }}</p>
                  <p class="text-xs text-indigo-600 mt-1">Annual cash flow / Investment</p>
                </div>
                <div v-if="capRate" class="bg-teal-50 rounded-lg p-4 border border-teal-100">
                  <p class="text-xs text-teal-700 uppercase tracking-wide">Cap Rate</p>
                  <p class="text-lg font-bold text-teal-900 mt-1">{{ formatPercent(capRate) }}</p>
                  <p class="text-xs text-teal-600 mt-1">Net operating income / Price</p>
                </div>
                <div v-if="rentToInvestmentRatio" class="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
                  <p class="text-xs text-cyan-700 uppercase tracking-wide">Rent-to-Investment</p>
                  <p class="text-lg font-bold text-cyan-900 mt-1">{{ formatPercent(rentToInvestmentRatio) }}</p>
                  <p class="text-xs text-cyan-600 mt-1">Annual rent / Total investment</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Pros & Cons Card -->
        <section v-if="displayResult?.pros?.length || displayResult?.cons?.length" class="mb-6">
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Pros -->
            <div v-if="displayResult?.pros?.length" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 class="text-xl font-bold text-gray-900">Pros</h2>
              </div>
              <ul class="space-y-2">
                <li v-for="(pro, i) in displayResult.pros" :key="i" class="flex items-start gap-2">
                  <span class="text-green-500 mt-0.5">✓</span>
                  <span class="text-gray-700">{{ pro }}</span>
                </li>
              </ul>
            </div>
            <!-- Cons -->
            <div v-if="displayResult?.cons?.length" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 class="text-xl font-bold text-gray-900">Cons</h2>
              </div>
              <ul class="space-y-2">
                <li v-for="(con, i) in displayResult.cons" :key="i" class="flex items-start gap-2">
                  <span class="text-red-500 mt-0.5">✗</span>
                  <span class="text-gray-700">{{ con }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Risks Card -->
        <section v-if="displayResult?.risks?.length" class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900">Risk Assessment</h2>
            </div>
            <div class="space-y-3">
              <div v-for="(risk, i) in displayResult.risks" :key="i" class="bg-amber-50 rounded-lg p-4">
                <p class="text-sm font-semibold text-amber-900">{{ risk.category || 'Risk' }}</p>
                <p class="text-sm text-amber-800 mt-1">{{ risk.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Summary Card -->
        <section v-if="displayResult?.summary" class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900">Summary</h2>
            </div>
            <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">{{ displayResult.summary }}</p>
          </div>
        </section>

        <!-- Legacy format fallback (for old analyses) -->
        <section v-if="!hasStructuredData && displayResult" class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900">Analysis Results</h2>
            </div>
            <div class="whitespace-pre-wrap text-gray-700 leading-relaxed">{{ displayResult.summary || JSON.stringify(displayResult, null, 2) }}</div>
          </div>
        </section>

        <!-- Nearby Amenities Card -->
        <section v-if="amenities" class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Nearby Amenities</h2>
                <p class="text-sm text-gray-500">Distances calculated from property location (2km radius)</p>
              </div>
            </div>
            
            <!-- Quick Summary -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div v-if="amenities.schools?.length" class="bg-teal-50 rounded-lg p-3 text-center">
                <span class="text-2xl">🏫</span>
                <p class="text-xs text-teal-700 mt-1">Nearest School</p>
                <p class="text-sm font-bold text-teal-900">{{ formatDistance(amenities.schools[0].distance) }}</p>
              </div>
              <div v-if="amenities.groceryStores?.length" class="bg-teal-50 rounded-lg p-3 text-center">
                <span class="text-2xl">🛒</span>
                <p class="text-xs text-teal-700 mt-1">Nearest Grocery</p>
                <p class="text-sm font-bold text-teal-900">{{ formatDistance(amenities.groceryStores[0].distance) }}</p>
              </div>
              <div v-if="amenities.doctors?.length" class="bg-teal-50 rounded-lg p-3 text-center">
                <span class="text-2xl">🏥</span>
                <p class="text-xs text-teal-700 mt-1">Nearest Doctor</p>
                <p class="text-sm font-bold text-teal-900">{{ formatDistance(amenities.doctors[0].distance) }}</p>
              </div>
              <div v-if="amenities.pharmacies?.length" class="bg-teal-50 rounded-lg p-3 text-center">
                <span class="text-2xl">💊</span>
                <p class="text-xs text-teal-700 mt-1">Nearest Pharmacy</p>
                <p class="text-sm font-bold text-teal-900">{{ formatDistance(amenities.pharmacies[0].distance) }}</p>
              </div>
              <div v-if="amenities.publicTransport?.length" class="bg-teal-50 rounded-lg p-3 text-center">
                <span class="text-2xl">🚌</span>
                <p class="text-xs text-teal-700 mt-1">Nearest Transit</p>
                <p class="text-sm font-bold text-teal-900">{{ formatDistance(amenities.publicTransport[0].distance) }}</p>
              </div>
              <div v-if="amenities.parks?.length" class="bg-teal-50 rounded-lg p-3 text-center">
                <span class="text-2xl">🌳</span>
                <p class="text-xs text-teal-700 mt-1">Nearest Park</p>
                <p class="text-sm font-bold text-teal-900">{{ formatDistance(amenities.parks[0].distance) }}</p>
              </div>
            </div>

            <!-- Detailed Lists -->
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Schools -->
              <div v-if="amenities.schools?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🏫</span> Schools & Kindergartens
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.schools" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Grocery Stores -->
              <div v-if="amenities.groceryStores?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🛒</span> Grocery Stores
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.groceryStores" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Doctors -->
              <div v-if="amenities.doctors?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🏥</span> Doctors & Clinics
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.doctors" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Pharmacies -->
              <div v-if="amenities.pharmacies?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>💊</span> Pharmacies
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.pharmacies" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Public Transport -->
              <div v-if="amenities.publicTransport?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🚌</span> Public Transport
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.publicTransport.slice(0, 5)" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Parks -->
              <div v-if="amenities.parks?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🌳</span> Parks & Playgrounds
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.parks" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Restaurants -->
              <div v-if="amenities.restaurants?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🍽️</span> Restaurants & Cafés
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.restaurants.slice(0, 5)" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Banks -->
              <div v-if="amenities.banks?.length">
                <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🏦</span> Banks & ATMs
                </h3>
                <ul class="space-y-2">
                  <li v-for="(item, i) in amenities.banks" :key="i" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span class="text-gray-700 truncate mr-2">{{ item.name }}</span>
                    <span class="text-teal-600 font-medium whitespace-nowrap">{{ formatDistance(item.distance) }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <p class="text-xs text-gray-400 mt-4 text-right">
              Data from OpenStreetMap • Updated {{ amenities.fetchedAt ? new Date(amenities.fetchedAt).toLocaleDateString('en-GB') : 'recently' }}
            </p>
          </div>
        </section>

        <section v-if="displayNeighborhood?.news?.length">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  Neighborhood Intelligence
                </h2>
                <p v-if="displayNeighborhood.address" class="text-sm text-gray-500">
                  {{ displayNeighborhood.address }}
                </p>
              </div>
            </div>
            <div class="mt-4 space-y-3">
              <a
                v-for="(n, i) in displayNeighborhood.news"
                :key="i"
                :href="n.url"
                target="_blank"
                rel="noopener"
                class="block rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-blue-50 hover:border-blue-300 transition-all group"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {{ n.title }}
                    </h3>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date unavailable' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="n.sentiment"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                      :class="{
                        'bg-green-100 text-green-800': n.sentiment === 'positive',
                        'bg-red-100 text-red-800': n.sentiment === 'negative',
                        'bg-gray-100 text-gray-700': n.sentiment === 'neutral',
                      }"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :class="{
                          'bg-green-600': n.sentiment === 'positive',
                          'bg-red-600': n.sentiment === 'negative',
                          'bg-gray-600': n.sentiment === 'neutral',
                        }"
                      ></span>
                      {{ n.sentiment.charAt(0).toUpperCase() + n.sentiment.slice(1) }}
                    </span>
                    <svg class="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        <div v-if="!result && !neighborhood?.news?.length" class="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 mb-3">
            <svg class="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p class="text-gray-600 font-medium">No analysis data available</p>
          <p class="text-sm text-gray-500 mt-1">The analysis may still be processing or encountered an issue</p>
        </div>
      </template>

      <div v-else-if="analysis.status === 'failed'" class="rounded-xl border border-red-200 bg-red-50 p-8">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-red-900 mb-2">Analysis Failed</h3>
            <p class="text-red-800 mb-4">
              We encountered an issue while analyzing your property exposé. This could be due to file format issues, API limitations, or temporary service disruptions.
            </p>
            <NuxtLink
              to="/upload"
              class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again with Another File
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
