import { supabase, CashCollectionEntry, Party, Withdrawal } from './supabaseClient'

/**
 * Get all cash collection entries
 */
export async function getAllEntries() {
  const { data, error } = await supabase
    .from('cash_collections')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching entries:', error)
    return []
  }
  
  return data || []
}

/**
 * Get entries with optional filters
 */
export async function getFilteredEntries(date?: string | null, accountNo?: string | null) {
  let query = supabase
    .from('cash_collections')
    .select('*')
    .order('date', { ascending: false })
  
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
    .order('date', { ascending: false })
  
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
    .order('date', { ascending: false })

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
    .order('date', { ascending: false })

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

/**
 * Export entries to Excel format - For Self (Personal Use)
 * Format: Sr. No (50-prefixed) | Date | Party Name | Account No (50-prefixed) | Type | Amount | Collector
 */
export async function exportForSelf(entries: CashCollectionEntry[], parties: Party[], withdrawals?: Withdrawal[]) {
  const partyMap = new Map<string, string>()
  parties.forEach(party => {
    partyMap.set(party.account_no, party.name)
  })

  const exportData: Record<string, string>[] = []

  // Collections section
  entries.forEach((entry, index) => {
    exportData.push({
      'Sr. No': toSerialNo(index + 1),
      'Date': entry.date,
      'Party Name': partyMap.get(entry.account_no) || 'Unknown',
      'Account No': String(toPartyCode(entry.account_no)),
      'Type': 'Collection',
      'Amount (Rs.)': entry.amount.toFixed(2),
      'Collector': entry.collector
    })
  })

  // Withdrawals section
  if (withdrawals && withdrawals.length > 0) {
    const totalCollection = entries.reduce((sum, e) => sum + e.amount, 0)
    const totalWithdrawal = withdrawals.reduce((sum, w) => sum + w.amount, 0)

    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': '--- WITHDRAWALS ---', 'Type': '', 'Amount (Rs.)': '', 'Collector': '' })

    withdrawals.forEach((w, index) => {
      exportData.push({
        'Sr. No': toSerialNo(index + 1),
        'Date': w.date,
        'Party Name': partyMap.get(w.account_no) || 'Unknown',
        'Account No': String(toPartyCode(w.account_no)),
        'Type': 'Payment',
        'Amount (Rs.)': `(${w.amount.toFixed(2)})`,
        'Collector': ''
      })
    })

    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': '', 'Type': '', 'Amount (Rs.)': '', 'Collector': '' })
    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': 'NET TOTAL', 'Type': 'TOTAL COLLECTION', 'Amount (Rs.)': totalCollection.toFixed(2), 'Collector': '' })
    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': 'NET TOTAL', 'Type': 'TOTAL WITHDRAWALS', 'Amount (Rs.)': `(${totalWithdrawal.toFixed(2)})`, 'Collector': '' })
    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': 'NET TOTAL', 'Type': 'NET CASH IN HAND', 'Amount (Rs.)': (totalCollection - totalWithdrawal).toFixed(2), 'Collector': '' })
  } else {
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0)
    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': '', 'Type': '', 'Amount (Rs.)': '', 'Collector': '' })
    exportData.push({ 'Sr. No': '', 'Date': '', 'Party Name': '', 'Account No': 'GRAND TOTAL', 'Type': '', 'Amount (Rs.)': total.toFixed(2), 'Collector': '' })
  }

  return exportData
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

  return sortedEntries.map((entry, index) => ({
    'SRNO_NUMBER': index + 1,
    'ACTYP': 'SD',
    'AGENTCODE': 5,
    'PARTYCODE': toPartyCode(entry.account_no),
    'AMOUNT': Number(entry.amount.toFixed(2)),
    'TRTP': '',
    'CHEQUENO': '',
    'STATUS': '',
  }))
}

/**
 * Export entries to Excel format (Legacy - for backward compatibility)
 */
export async function exportEntriesToExcel(entries: CashCollectionEntry[], parties: Party[], withdrawals?: Withdrawal[]) {
  return exportForSelf(entries, parties, withdrawals)
}
