import { supabase, CashCollectionEntry, Party, Withdrawal } from './supabaseClient'
import * as XLSX from 'xlsx-js-style'

type CellStyle = NonNullable<XLSX.CellObject['s']>
const BORDER: CellStyle['border'] = {
  top: { style: 'thin', color: { rgb: 'B0B0B0' } },
  bottom: { style: 'thin', color: { rgb: 'B0B0B0' } },
  left: { style: 'thin', color: { rgb: 'B0B0B0' } },
  right: { style: 'thin', color: { rgb: 'B0B0B0' } },
}

function setCellStyle(ws: XLSX.WorkSheet, ref: string, style: CellStyle) {
  if (!ws[ref]) return
  ws[ref].s = style
}

const STYLES = {
  bankName: {
    font: { bold: true, sz: 18, color: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  } as CellStyle,
  branch: {
    font: { bold: true, sz: 12, color: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  } as CellStyle,
  scheme: {
    font: { bold: true, sz: 12, color: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  } as CellStyle,
  monthYear: {
    font: { bold: true, sz: 12, color: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  } as CellStyle,
  subheader: {
    font: { bold: true, sz: 12, color: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  } as CellStyle,
  colHeader: {
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'D9E1F2' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  } as CellStyle,
  accountNo: {
    alignment: { horizontal: 'center' },
    border: BORDER,
  } as CellStyle,
  name: {
    alignment: { horizontal: 'left' },
    border: BORDER,
  } as CellStyle,
  nameCell: {
    font: { sz: 10 },
    fill: { fgColor: { rgb: 'EAF1FB' } },
    alignment: { horizontal: 'left' },
    border: BORDER,
  } as CellStyle,
  cellBase: {
    font: { sz: 10 },
    border: BORDER,
  } as CellStyle,
  amount: {
    alignment: { horizontal: 'right' },
    numFmt: '#,##0.00',
    border: BORDER,
  } as CellStyle,
  amountGreen: {
    alignment: { horizontal: 'right' },
    numFmt: '#,##0.00',
    border: BORDER,
    fill: { fgColor: { rgb: 'E2EFDA' } },
  } as CellStyle,
  dayCell: {
    font: { sz: 10 },
    fill: { fgColor: { rgb: 'E2EFDA' } },
    numFmt: '#,##0.00',
    alignment: { horizontal: 'right' },
    border: BORDER,
  } as CellStyle,
  total: {
    font: { bold: true, sz: 10 },
    alignment: { horizontal: 'right' },
    numFmt: '#,##0.00',
    border: BORDER,
    fill: { fgColor: { rgb: 'FFF2CC' } },
  } as CellStyle,
  totalCell: {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: 'FFF2CC' } },
    numFmt: '#,##0.00',
    alignment: { horizontal: 'right' },
    border: BORDER,
  } as CellStyle,
  totalLabel: {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: 'FFF2CC' } },
    alignment: { horizontal: 'left' },
    border: BORDER,
  } as CellStyle,
  rowEven: {
    fill: { fgColor: { rgb: 'F8F9FA' } },
  } as CellStyle,
}

/**
 * Pad a 3-digit account number with "50" prefix.
 * Example: "004" -> "50004", "8" -> "50008"
 */
export function toPartyCode(accountNo: string | number): number {
  const padded = String(accountNo).padStart(3, '0')
  return Number(`50${padded}`)
}

/**
 * Generate a serial number with "50" prefix.
 * Example: 1 -> "50001", 100 -> "50100"
 */
export function toSerialNo(index: number): string {
  return `50${String(index).padStart(3, '0')}`
}

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]

function formatMonthYear(date: string): string {
  const d = new Date(date)
  return `${MONTH_NAMES[d.getUTCMonth()]}${d.getUTCFullYear()}`
}

function dayOfMonth(date: string): number {
  return new Date(date).getUTCDate()
}

/**
 * Build a Daily Savings Scheme (DSS) ledger worksheet for a date range.
 * Format matches the cooperative bank file:
 *  Row 1: PROGRESSIVE MERC. CO-OP BANK,
 *  Row 2: KALUPUR
 *  Row 3: DAILY SAVINGS SCHEME
 *  Row 4: JUNE'2026
 *  Row 5: Headers (ACCOUNT NO. | NAME | OP.BALANCE | day1..dayN | TOTAL)
 *  Rows 6+: One row per party with their daily collections and running total
 */
function buildDssWorksheet(
  entries: CashCollectionEntry[],
  parties: Party[],
  fromDate: string,
  toDate: string
) {

  // All days in the date range (including days with no data)
  const dayList: string[] = []
  const start = new Date(fromDate + 'T00:00:00Z')
  const end = new Date(toDate + 'T00:00:00Z')
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    dayList.push(`${y}-${m}-${day}`)
  }
  const dayNumbers = dayList.map(dayOfMonth)

  // Build party -> day -> amount map
  const partyAmountMap = new Map<string, Map<number, number>>()
  entries.forEach(e => {
    if (e.date < fromDate || e.date > toDate) return
    const day = dayOfMonth(e.date)
    if (!partyAmountMap.has(e.account_no)) partyAmountMap.set(e.account_no, new Map())
    const m = partyAmountMap.get(e.account_no)!
    m.set(day, (m.get(day) || 0) + e.amount)
  })

  // Compute opening balance per party:
  // OP.BALANCE = sum of all collections for that party before fromDate
  const opBalanceMap = new Map<string, number>()
  entries.forEach(e => {
    if (e.date >= fromDate) return
    opBalanceMap.set(e.account_no, (opBalanceMap.get(e.account_no) || 0) + e.amount)
  })

  // Filter parties that have at least one collection in range or have an opening balance
  const relevantParties = parties
    .filter(p => partyAmountMap.has(p.account_no) || opBalanceMap.has(p.account_no))
    .sort((a, b) => a.account_no.localeCompare(b.account_no))

  // Build the AOA data
  const aoa: (string | number)[][] = []

  // Row 1: bank name (col B)
  aoa.push(['', 'PROGRESSIVE MERC. CO-OP BANK, '])
  // Row 2: branch (col A)
  aoa.push(['KALUPUR', ''])
  // Row 3: scheme (col B)
  aoa.push(['', 'DAILY SAVINGS SCHEME'])
  // Row 4: month/year (col B) - format " JUNE'2026     "
  const monthYear = ` ${formatMonthYear(fromDate)}     `
  aoa.push(['', monthYear])
  // Row 5: column headers
  const headerRow: (string | number)[] = ['ACCOUNT NO.', 'NAME', 'OP.BALANCE', ...dayNumbers, 'TOTAL']
  aoa.push(headerRow)

  // Data rows
  relevantParties.forEach(party => {
    const opBal = opBalanceMap.get(party.account_no) || 0
    const dayMap = partyAmountMap.get(party.account_no) || new Map<number, number>()
    const dayValues = dayNumbers.map(d => dayMap.get(d) || 0)
    const monthTotal = dayValues.reduce((s, v) => s + v, 0)
    const closingBal = opBal + monthTotal
    const accountNo5 = String(toPartyCode(party.account_no))
    aoa.push([accountNo5, party.name, opBal, ...dayValues, closingBal])
  })

  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Set column widths
  const colWidths: { wch: number }[] = [
    { wch: 12 },  // ACCOUNT NO.
    { wch: 35 },  // NAME
    { wch: 12 },  // OP.BALANCE
    ...dayNumbers.map(() => ({ wch: 8 })),  // day columns
    { wch: 14 },  // TOTAL
  ]
  ws['!cols'] = colWidths

  // Row heights
  ws['!rows'] = [
    { hpt: 24 },  // bank name
    { hpt: 18 },  // branch
    { hpt: 18 },  // scheme
    { hpt: 18 },  // month/year
    { hpt: 22 },  // column headers
  ]

  // Apply styles
  // Row 1 (bank name) - col B
  setCellStyle(ws, 'B1', STYLES.bankName)
  // Row 2 (branch) - col A
  setCellStyle(ws, 'A2', STYLES.branch)
  // Row 3 (scheme) - col B
  setCellStyle(ws, 'B3', STYLES.scheme)
  // Row 4 (month/year) - col B
  setCellStyle(ws, 'B4', STYLES.monthYear)

  // Row 5 (column headers) - all columns
  for (let c = 0; c < headerRow.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 4, c })
    setCellStyle(ws, ref, STYLES.colHeader)
  }

  // Data rows (starting at row 6, index 5)
  relevantParties.forEach((party, idx) => {
    const rowIdx = 5 + idx  // 0-based row index
    const isEven = idx % 2 === 1

    // ACCOUNT NO. (col 0)
    let ref = XLSX.utils.encode_cell({ r: rowIdx, c: 0 })
    setCellStyle(ws, ref, { ...STYLES.accountNo, ...(isEven ? STYLES.rowEven : {}) })

    // NAME (col 1)
    ref = XLSX.utils.encode_cell({ r: rowIdx, c: 1 })
    setCellStyle(ws, ref, { ...STYLES.name, ...(isEven ? STYLES.rowEven : {}) })

    // OP.BALANCE (col 2)
    ref = XLSX.utils.encode_cell({ r: rowIdx, c: 2 })
    setCellStyle(ws, ref, { ...STYLES.amount, ...(isEven ? STYLES.rowEven : {}) })

    // Day columns
    dayNumbers.forEach((d, i) => {
      ref = XLSX.utils.encode_cell({ r: rowIdx, c: 3 + i })
      const val = aoa[rowIdx][3 + i] as number
      const baseStyle = val > 0 ? STYLES.amountGreen : STYLES.amount
      setCellStyle(ws, ref, { ...baseStyle, ...(isEven && val === 0 ? STYLES.rowEven : {}) })
    })

    // TOTAL (last column)
    ref = XLSX.utils.encode_cell({ r: rowIdx, c: 3 + dayNumbers.length })
    setCellStyle(ws, ref, STYLES.total)
  })

  return ws
}

/**
 * Export entries to Excel format - For Self (Personal Use)
 * Generates a DSS (Daily Savings Scheme) ledger with one sheet per month
 * that has collections in the date range.
 */
export async function exportForSelf(
  entries: CashCollectionEntry[],
  parties: Party[],
  _withdrawals?: Withdrawal[],
  options?: { fromDate?: string; toDate?: string }
) {

  // Determine date range
  const allDates = entries.map(e => e.date).filter(Boolean).sort()
  if (allDates.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['', 'No data to export']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Empty')
    return wb
  }
  const fromDate = options?.fromDate || allDates[0]
  const toDate = options?.toDate || allDates[allDates.length - 1]

  // Group entries by year-month for sheet splitting
  const monthBuckets = new Map<string, CashCollectionEntry[]>()
  entries.forEach(e => {
    if (e.date < fromDate || e.date > toDate) return
    const d = new Date(e.date)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!monthBuckets.has(key)) monthBuckets.set(key, [])
    monthBuckets.get(key)!.push(e)
  })

  const wb = XLSX.utils.book_new()

  if (monthBuckets.size === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['', 'No data in range']])
    XLSX.utils.book_append_sheet(wb, ws, 'Empty')
    return wb
  }

  // One sheet per month
  const sortedKeys = Array.from(monthBuckets.keys()).sort()
  sortedKeys.forEach((key) => {
    const monthEntries = monthBuckets.get(key)!
    const [year, month] = key.split('-').map(Number)
    const monthFirst = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDayNum = new Date(year, month, 0).getDate()
    const monthLast = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`
    const monthFrom = fromDate > monthFirst ? fromDate : monthFirst
    const monthTo = toDate < monthLast ? toDate : monthLast
    const sheetName = formatMonthYear(monthFrom)
    const ws = buildDssWorksheet(monthEntries, parties, monthFrom, monthTo)
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
  })

  return wb
}

/**
 * Export entries to Excel format - For Bank (Cooperative Bank File Format)
 * Columns: SRNO_NUMBER | ACTYP | AGENTCODE | PARTYCODE | AMOUNT | TRTP | CHEQUENO | STATUS
 * - ACTYP = "SD" (fixed)
 * - AGENTCODE = 5 (fixed)
 * - PARTYCODE = "50" + 3-digit account_no (e.g. "50004")
 * - TRTP, CHEQUENO, STATUS = blank
 */
export async function exportForBank(entries: CashCollectionEntry[]) {

  const sortedEntries = [...entries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const data = sortedEntries.map((entry, index) => [
    index + 1,
    'SD',
    5,
    toPartyCode(entry.account_no),
    Number(entry.amount.toFixed(2)),
    '',
    '',
    '',
  ])

  const ws = XLSX.utils.aoa_to_sheet([
    ['SRNO_NUMBER', 'ACTYP', 'AGENTCODE', 'PARTYCODE', 'AMOUNT', 'TRTP', 'CHEQUENO', 'STATUS'],
    ...data,
  ])

  // Style header row
  const headerStyle: CellStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER,
  }
  for (let c = 0; c < 8; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c })
    setCellStyle(ws, ref, headerStyle)
  }

  // Style data rows: alternating + amount column colored
  data.forEach((_, idx) => {
    const rowIdx = 1 + idx
    const isEven = idx % 2 === 1
    for (let c = 0; c < 8; c++) {
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c })
      const baseStyle: CellStyle = c === 4
        ? { alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: BORDER, fill: { fgColor: { rgb: 'E2EFDA' } } }
        : { alignment: { horizontal: 'center' }, border: BORDER }
      setCellStyle(ws, ref, { ...baseStyle, ...(isEven && c !== 4 ? STYLES.rowEven : {}) })
    }
  })

  ws['!cols'] = [
    { wch: 14 },  // SRNO_NUMBER
    { wch: 8 },   // ACTYP
    { wch: 12 },  // AGENTCODE
    { wch: 12 },  // PARTYCODE
    { wch: 12 },  // AMOUNT
    { wch: 8 },   // TRTP
    { wch: 12 },  // CHEQUENO
    { wch: 10 },  // STATUS
  ]

  return ws
}

/**
 * Build a single-party ledger worksheet for a month.
 * Columns: DATE | TYPE | AMOUNT | BALANCE
 * Collections (green), Withdrawals (red), running balance.
 */
function buildPartyWorksheet(
  party: Party,
  monthEntries: CashCollectionEntry[],
  monthWithdrawals: Withdrawal[],
  monthKey: string,
  openingBalance: number
): XLSX.WorkSheet {
  // Merge collections + withdrawals, sort by date
  type Row = { date: string; type: 'COLLECTION' | 'WITHDRAWAL'; amount: number; collector?: string }
  const rows: Row[] = []
  monthEntries.forEach(e => rows.push({ date: e.date, type: 'COLLECTION', amount: e.amount, collector: e.collector }))
  monthWithdrawals.forEach(w => rows.push({ date: w.date, type: 'WITHDRAWAL', amount: w.amount }))
  rows.sort((a, b) => a.date.localeCompare(b.date))

  const aoa: (string | number)[][] = []

  // Title rows
  aoa.push(['', 'PROGRESSIVE MERC. CO-OP BANK, '])
  aoa.push(['KALUPUR', ''])
  aoa.push(['', 'DAILY SAVINGS SCHEME'])
  const displayName = `${party.name} - ${toPartyCode(party.account_no)}`
  aoa.push(['', displayName])
  aoa.push(['', ` ${monthKey}     `])

  // Column headers
  aoa.push(['DATE', 'PARTICULARS', 'AMOUNT (Rs.)', 'BALANCE (Rs.)'])

  let balance = openingBalance
  if (openingBalance !== 0) {
    aoa.push(['', 'OPENING BALANCE', '', Number(openingBalance.toFixed(2))])
  }

  rows.forEach(r => {
    const sign = r.type === 'COLLECTION' ? r.amount : -r.amount
    balance += sign
    const displayAmount = r.type === 'WITHDRAWAL' ? -r.amount : r.amount
    const particulars = r.type === 'COLLECTION' ? 'BY CASH (COLLECTION)' : 'BY WITHDRAWAL'
    aoa.push([r.date, particulars, Number(displayAmount.toFixed(2)), Number(balance.toFixed(2))])
  })

  // Closing total
  const monthCollection = monthEntries.reduce((s, e) => s + e.amount, 0)
  const monthWithdrawal = monthWithdrawals.reduce((s, w) => s + w.amount, 0)
  const netForMonth = monthCollection - monthWithdrawal
  aoa.push(['', `MONTHLY NET (${monthCollection.toFixed(2)} - ${monthWithdrawal.toFixed(2)})`, Number(netForMonth.toFixed(2)), Number(balance.toFixed(2))])
  aoa.push(['', 'CLOSING BALANCE', '', Number(balance.toFixed(2))])

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Column widths
  ws['!cols'] = [
    { wch: 14 },  // DATE
    { wch: 30 },  // PARTICULARS
    { wch: 16 },  // AMOUNT
    { wch: 16 },  // BALANCE
  ]

  // Apply styles
  setCellStyle(ws, 'B1', STYLES.bankName)
  setCellStyle(ws, 'A2', STYLES.branch)
  setCellStyle(ws, 'B3', STYLES.scheme)
  setCellStyle(ws, 'B4', STYLES.monthYear)
  setCellStyle(ws, 'B5', STYLES.monthYear)

  // Header row
  for (let c = 0; c < 4; c++) {
    const ref = XLSX.utils.encode_cell({ r: 5, c })
    setCellStyle(ws, ref, STYLES.colHeader)
  }

  // Data rows
  const dataStartRow = openingBalance !== 0 ? 7 : 6
  const lastDataRow = aoa.length - 1
  for (let r = dataStartRow; r <= lastDataRow; r++) {
    const isEven = (r - dataStartRow) % 2 === 1
    const isClosing = r === lastDataRow || r === lastDataRow - 1
    for (let c = 0; c < 4; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      let style: CellStyle
      if (c === 0) {
        style = { ...STYLES.accountNo, ...(isEven ? STYLES.rowEven : {}) }
      } else if (c === 1) {
        style = { ...STYLES.name, ...(isEven ? STYLES.rowEven : {}) }
      } else {
        // AMOUNT or BALANCE column
        const amountVal = aoa[r][2] as number
        const isWithdrawal = typeof amountVal === 'number' && amountVal < 0
        if (isClosing) {
          style = STYLES.total
        } else if (c === 3) {
          // Balance always shown
          style = { ...STYLES.amount, ...(isEven ? STYLES.rowEven : {}) }
        } else {
          style = isWithdrawal
            ? { ...STYLES.amount, ...(isEven ? STYLES.rowEven : {}), font: { sz: 10, color: { rgb: 'C00000' }, bold: true } }
            : { ...STYLES.amount, ...(isEven ? STYLES.rowEven : {}) }
        }
      }
      setCellStyle(ws, ref, style)
    }
  }

  // Merge title cells
  ws['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },
  ]

  // Row heights
  ws['!rows'] = [
    { hpt: 24 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 22 },
  ]

  return ws
}



/**
 * Export a single party's transactions as a multi-sheet Excel workbook.
 * One sheet per month, covering collections and withdrawals.
 * Optionally filtered by date range.
 */
export async function exportForParty(
  party: Party,
  entries: CashCollectionEntry[],
  withdrawals: Withdrawal[],
  options?: { fromDate?: string; toDate?: string }
): Promise<XLSX.WorkBook> {
  const partyEntries = entries.filter(e => e.account_no === party.account_no)
  const partyWithdrawals = withdrawals.filter(w => w.account_no === party.account_no)

  // Group by month
  const monthBuckets = new Map<string, { entries: CashCollectionEntry[]; withdrawals: Withdrawal[]; fromDate: string; toDate: string }>()
  const ensureBucket = (date: string) => {
    const key = formatMonthYear(date)
    if (!monthBuckets.has(key)) {
      monthBuckets.set(key, { entries: [], withdrawals: [], fromDate: date, toDate: date })
    }
    return monthBuckets.get(key)!
  }
  partyEntries.forEach(e => {
    if (options?.fromDate && e.date < options.fromDate) return
    if (options?.toDate && e.date > options.toDate) return
    const b = ensureBucket(e.date)
    b.entries.push(e)
    if (e.date < b.fromDate) b.fromDate = e.date
    if (e.date > b.toDate) b.toDate = e.date
  })
  partyWithdrawals.forEach(w => {
    if (options?.fromDate && w.date < options.fromDate) return
    if (options?.toDate && w.date > options.toDate) return
    const b = ensureBucket(w.date)
    b.withdrawals.push(w)
    if (w.date < b.fromDate) b.fromDate = w.date
    if (w.date > b.toDate) b.toDate = w.date
  })

  const wb = XLSX.utils.book_new()
  const sortedKeys = Array.from(monthBuckets.keys()).sort()

  if (sortedKeys.length === 0) {
    // Empty workbook with one informational sheet
    const ws = XLSX.utils.aoa_to_sheet([
      ['', 'PROGRESSIVE MERC. CO-OP BANK, '],
      ['KALUPUR', ''],
      ['', 'DAILY SAVINGS SCHEME'],
      ['', `${party.name} - ${toPartyCode(party.account_no)}`],
      [''],
      ['No transactions found for the selected period.'],
    ])
    setCellStyle(ws, 'B1', STYLES.bankName)
    setCellStyle(ws, 'A2', STYLES.branch)
    setCellStyle(ws, 'B3', STYLES.scheme)
    setCellStyle(ws, 'B4', STYLES.monthYear)
    setCellStyle(ws, 'A6', { font: { italic: true, color: { rgb: '888888' } } } as CellStyle)
    XLSX.utils.book_append_sheet(wb, ws, 'No Data')
    return wb
  }

  sortedKeys.forEach(key => {
    const bucket = monthBuckets.get(key)!
    // Compute opening balance: net of all transactions before this month
    const opening = partyEntries
      .filter(e => e.date < bucket.fromDate)
      .reduce((s, e) => s + e.amount, 0) -
      partyWithdrawals
        .filter(w => w.date < bucket.fromDate)
        .reduce((s, w) => s + w.amount, 0)

    const ws = buildPartyWorksheet(party, bucket.entries, bucket.withdrawals, key, opening)
    // Sheet name: 31 chars max, no special chars
    const sheetName = key.replace(/[^A-Za-z0-9]/g, '').slice(0, 31) || 'Report'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  return wb
}

/**
 * Get entries with optional filters
 */
export async function getFilteredEntries(date?: string | null, accountNo?: string | null) {
  let query = supabase
    .from('cash_collections')
    .select('*')
    .order('date', { ascending: false }).order('id', { ascending: false })
  
  if (date) {
    query = query.eq('date', date)
  }
  
  if (accountNo) {
    query = query.eq('account_no', accountNo)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching filtered entries:', error)
    return []
  }
  
  return data || []
}

/**
 * Add a new cash collection entry
 */
export async function addEntry(entry: Omit<CashCollectionEntry, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('cash_collections')
    .insert([entry])
    .select()
  
  if (error) {
    console.error('Error adding entry:', error)
    return null
  }
  
  return data?.[0] || null
}

/**
 * Update an existing cash collection entry
 */
export async function updateEntry(id: number, updates: Partial<CashCollectionEntry>) {
  const { data, error } = await supabase
    .from('cash_collections')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating entry:', error)
    return null
  }
  
  return data?.[0] || null
}

/**
 * Delete a cash collection entry
 */
export async function deleteEntry(id: number) {
  const { error } = await supabase
    .from('cash_collections')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting entry:', error)
    return false
  }
  
  return true
}

/**
 * Get total collection for a specific date
 */
export async function getTotalCollectionForDate(date: string) {
  const { data, error } = await supabase
    .from('cash_collections')
    .select('amount')
    .eq('date', date)
  
  if (error) {
    console.error('Error fetching total for date:', error)
    return 0
  }
  
  return data.reduce((sum, entry) => sum + entry.amount, 0)
}

/**
 * Get all parties
 */
export async function getAllParties() {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching parties:', error)
    return []
  }
  
  return data || []
}

/**
 * Add a new party
 */
export async function addParty(party: Omit<Party, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('parties')
    .insert([party])
    .select()
  
  if (error) {
    console.error('Error adding party:', error)
    return null
  }
  
  return data?.[0] || null
}

/**
 * Update a party
 */
export async function updateParty(id: number, updates: Partial<Party>) {
  const { data, error } = await supabase
    .from('parties')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating party:', error)
    return null
  }
  
  return data?.[0] || null
}

/**
 * Delete a party
 */
export async function deleteParty(id: number) {
  const { error } = await supabase
    .from('parties')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting party:', error)
    return false
  }
  
  return true
}

/**
 * Get party by account number
 */
export async function getPartyByAccountNo(accountNo: string) {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('account_no', accountNo)
    .single()
  
  if (error) {
    console.error('Error fetching party:', error)
    return null
  }
  
  return data
}

/**
 * Get today's collections for a specific party
 */
export async function getTodaysCollectionsForParty(accountNo: string) {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('cash_collections')
    .select('amount')
    .eq('account_no', accountNo)
    .eq('date', today)
  
  if (error) {
    console.error('Error fetching today\'s collections for party:', error)
    return 0
  }
  
  return data.reduce((sum, entry) => sum + entry.amount, 0)
}

/**
 * Get all collections for a specific party
 */
export async function getAllCollectionsForParty(accountNo: string) {
  const { data, error } = await supabase
    .from('cash_collections')
    .select('*')
    .eq('account_no', accountNo)
    .order('date', { ascending: false }).order('id', { ascending: false })
  
  if (error) {
    console.error('Error fetching collections for party:', error)
    return []
  }
  
  return data || []
}

/**
 * Get all withdrawals
 */
export async function getAllWithdrawals() {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .order('date', { ascending: false }).order('id', { ascending: false })

  if (error) {
    console.error('Error fetching withdrawals:', error)
    return []
  }

  return data || []
}

/**
 * Add a new withdrawal
 */
export async function addWithdrawal(withdrawal: Omit<Withdrawal, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('withdrawals')
    .insert([withdrawal])
    .select()

  if (error) {
    console.error('Error adding withdrawal:', error)
    return null
  }

  return data?.[0] || null
}

/**
 * Update an existing withdrawal
 */
export async function updateWithdrawal(id: number, updates: Partial<Withdrawal>) {
  const { data, error } = await supabase
    .from('withdrawals')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating withdrawal:', error)
    return null
  }

  return data?.[0] || null
}

/**
 * Delete a withdrawal
 */
export async function deleteWithdrawal(id: number) {
  const { error } = await supabase
    .from('withdrawals')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting withdrawal:', error)
    return false
  }

  return true
}

/**
 * Get filtered withdrawals
 */
export async function getFilteredWithdrawals(date?: string | null, category?: string | null) {
  let query = supabase
    .from('withdrawals')
    .select('*')
    .order('date', { ascending: false }).order('id', { ascending: false })

  if (date) {
    query = query.eq('date', date)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching filtered withdrawals:', error)
    return []
  }

  return data || []
}

/**
 * Get total withdrawals for a specific date
 */
export async function getTotalWithdrawalsForDate(date: string) {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('date', date)

  if (error) {
    console.error('Error fetching total withdrawals for date:', error)
    return 0
  }

  return data.reduce((sum, entry) => sum + entry.amount, 0)
}

/**
 * Export entries to Excel format (Legacy - for backward compatibility)
 */
export async function exportEntriesToExcel(entries: CashCollectionEntry[], parties: Party[], withdrawals?: Withdrawal[]) {
  return exportForSelf(entries, parties, withdrawals)
}

/**
 * Fetch per-party collection totals from the server.
 * Returns a map of account_no → total amount.
 */
export async function getPartyCollectionTotals(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('cash_collections')
    .select('account_no, amount')
  const map: Record<string, number> = {}
  ;(data || []).forEach(e => {
    map[e.account_no] = (map[e.account_no] || 0) + e.amount
  })
  return map
}

/**
 * Fetch per-party withdrawal totals from the server.
 * Returns a map of account_no → total amount.
 */
export async function getPartyWithdrawalTotals(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('withdrawals')
    .select('account_no, amount')
  const map: Record<string, number> = {}
  ;(data || []).forEach(e => {
    map[e.account_no] = (map[e.account_no] || 0) + e.amount
  })
  return map
}

/**
 * Delete all collections and withdrawals for a given year.
 * Returns { collectionsDeleted, withdrawalsDeleted }.
 */
export async function deleteYearEntries(year: string): Promise<{ collectionsDeleted: number; withdrawalsDeleted: number }> {
  const { count: collCount, error: collErr } = await supabase
    .from('cash_collections')
    .delete()
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)

  if (collErr) throw collErr

  const { count: wdCount, error: wdErr } = await supabase
    .from('withdrawals')
    .delete()
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)

  if (wdErr) throw wdErr

  return {
    collectionsDeleted: collCount ?? 0,
    withdrawalsDeleted: wdCount ?? 0,
  }
}

/**
 * Helper to write a workbook to a file in the browser
 */
export function writeWorkbookToFile(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}

