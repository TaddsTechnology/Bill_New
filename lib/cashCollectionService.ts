import { supabase, CashCollectionEntry, Party } from './supabaseClient'

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
 * Export entries to Excel format - For Self (Personal Use)
 */
export async function exportForSelf(entries: CashCollectionEntry[], parties: Party[]) {
  // Create a mapping of account numbers to party names
  const partyMap = new Map<string, string>()
  parties.forEach(party => {
    partyMap.set(party.account_no, party.name)
  })
  
  // Prepare data for export with serial numbers
  const exportData = entries.map((entry, index) => ({
    'Sr. No': index + 1,
    'Date': entry.date,
    'Party Name': partyMap.get(entry.account_no) || 'Unknown',
    'Account No': entry.account_no,
    'Amount (Rs.)': entry.amount.toFixed(2),
    'Collector': entry.collector
  }))
  
  return exportData
}

/**
 * Export entries to Excel format - For Bank (Professional Format)
 */
export async function exportForBank(entries: CashCollectionEntry[], parties: Party[]) {
  // Create a mapping of account numbers to party names
  const partyMap = new Map<string, string>()
  parties.forEach(party => {
    partyMap.set(party.account_no, party.name)
  })
  
  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // Calculate running balance
  let runningBalance = 0
  const exportData = sortedEntries.map(entry => {
    runningBalance += entry.amount
    const partyName = partyMap.get(entry.account_no) || 'Unknown'
    // Shorten party name for bank format
    const shortName = partyName.split(' ').slice(0, 2).join(' ')
    
    return {
      'Transaction Date': entry.date,
      'Account Number': entry.account_no,
      'Particulars': `Cash Collection - ${shortName}`,
      'Credit (Rs.)': entry.amount.toFixed(2),
      'Balance (Rs.)': runningBalance.toFixed(2)
    }
  })
  
  return exportData
}

/**
 * Export entries to Excel format (Legacy - for backward compatibility)
 */
export async function exportEntriesToExcel(entries: CashCollectionEntry[], parties: Party[]) {
  return exportForSelf(entries, parties)
}
