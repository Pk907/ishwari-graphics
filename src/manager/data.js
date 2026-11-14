// Realistic mock data. Rows are plain objects shaped like future DB tables (customers, vendors, orders, transactions).
// Customer payments and vendor payments only ever live in `transactions`; order totals are derived from them (see accounting.js).
export const STATUSES = ['Pending', 'Designing', 'Sent for Printing', 'Completed', 'Delivered']
export const METHODS = ['Cash', 'UPI', 'Bank Transfer']
export const CATEGORIES = ['Rent', 'Electricity', 'Salary', 'Transport', 'Ink & Supplies', 'Marketing', 'Other']

const iso = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString('en-CA') }
export const today = () => iso(0)

const CUSTOMERS = [
  ['Rahul Patil', '9822011101', 'Shivaji Chowk, Pune'], ['Sunita Jadhav', '9890122202', 'Kothrud, Pune'],
  ['Shree Sai Traders', '9923033303', 'Market Yard, Pune'], ['Amit Deshmukh', '9422144404', 'Wakad, Pimpri'],
  ['Priya Weddings', '9767255505', 'Baner, Pune'], ['Nagesh Kulkarni', '9158366606', 'Sadashiv Peth, Pune'],
]
const VENDORS = [
  ['Sharp Digital Press', '9850011122', 'Budhwar Peth, Pune'], ['Rainbow Flex Printers', '9370022233', 'Bhosari MIDC'],
  ['Royal Offset', '9604033344', 'Hadapsar, Pune'],
]
// customer, description, design, print (billed), status, vendor, vendor cost, daysAgo, advance, [[amt, daysAgo]] more payments, [[amt, daysAgo]] vendor payments
const ORDERS = [
  [0, 'Shop flex banner 10x3 ft', 800, 3200, 'Delivered', 1, 2400, 140, 1500, [[2500, 130]], [[2400, 135]]],
  [2, 'Visiting cards 1000 pcs', 500, 1500, 'Delivered', 0, 1000, 125, 1000, [[1000, 118]], [[1000, 120]]],
  [4, 'Wedding invitation cards 300 pcs', 3000, 9000, 'Delivered', 2, 6500, 100, 5000, [[7000, 90]], [[3000, 95], [3500, 88]]],
  [1, 'Logo design + stationery', 4000, 1500, 'Delivered', 0, 900, 85, 2000, [[3500, 70]], [[900, 80]]],
  [3, 'Political rally flex 6 pcs', 1500, 14000, 'Delivered', 1, 10500, 70, 8000, [[7500, 60]], [[10500, 62]]],
  [2, 'Brochure A4 tri-fold 500 pcs', 2500, 6500, 'Delivered', 2, 4800, 55, 4000, [[5000, 40]], [[4800, 48]]],
  [5, 'Calligraphy name boards x3', 1800, 2700, 'Completed', 0, 1800, 30, 2000, [], [[1000, 25]]],
  [4, 'Engagement invitation 150 pcs', 2000, 4500, 'Sent for Printing', 2, 3200, 18, 3000, [], [[1500, 10]]],
  [0, 'Hoarding 20x10 ft + install', 1500, 18500, 'Sent for Printing', 1, 14000, 12, 10000, [], []],
  [3, 'Instagram ad creatives (month)', 6000, 0, 'Designing', null, 0, 8, 3000, [], []],
  [1, 'Menu card A4 laminated 50 pcs', 700, 2300, 'Designing', 0, 1700, 4, 1000, [], []],
  [5, 'Shop inauguration pamphlets 2000', 1200, 3800, 'Pending', null, 0, 1, 0, [], []],
]
const EXPENSES = [
  ['Rent', 8000, 'Shop rent', 3], ['Electricity', 1450, 'MSEB bill', 20], ['Transport', 600, 'Delivery to client', 15],
  ['Ink & Supplies', 2200, 'Plotter ink', 45], ['Rent', 8000, 'Shop rent', 33], ['Electricity', 1320, 'MSEB bill', 50],
  ['Marketing', 1500, 'Instagram boost', 65], ['Rent', 8000, 'Shop rent', 63], ['Salary', 6000, 'Helper salary', 36], ['Salary', 6000, 'Helper salary', 6],
  ['Rent', 8000, 'Shop rent', 93], ['Other', 900, 'Tea & misc', 75], ['Rent', 8000, 'Shop rent', 123],
]

export function seed() {
  const customers = CUSTOMERS.map(([name, phone, address], i) => ({ id: `C-${String(i + 1).padStart(2, '0')}`, name, phone, address }))
  const vendors = VENDORS.map(([name, phone, address], i) => ({ id: `V-${String(i + 1).padStart(2, '0')}`, name, phone, address }))
  const transactions = []
  const tx = (t) => transactions.push({ id: '', method: METHODS[transactions.length % 3], ...t })
  const orders = ORDERS.map(([c, desc, design, print, status, v, cost, ago, adv, more, vpaid], i) => {
    const o = { id: `ORD-${1001 + i}`, customerId: customers[c].id, desc, design, print, status, vendorId: v == null ? '' : vendors[v].id, cost, date: iso(ago) }
    if (adv) tx({ type: 'customer_payment', date: o.date, amount: adv, orderId: o.id, note: 'Advance' })
    more.forEach(([amount, a]) => tx({ type: 'customer_payment', date: iso(a), amount, orderId: o.id, note: 'Payment' }))
    vpaid.forEach(([amount, a]) => tx({ type: 'vendor_payment', date: iso(a), amount, orderId: o.id, vendorId: o.vendorId, note: 'Printing' }))
    return o
  })
  EXPENSES.forEach(([category, amount, note, a]) => tx({ type: 'expense', date: iso(a), amount, category, note }))
  transactions.forEach((t, i) => { t.id = `T-${String(i + 1).padStart(4, '0')}` })
  return { customers, vendors, orders, transactions }
}
