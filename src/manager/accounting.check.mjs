// Run: node src/manager/accounting.check.mjs
import assert from 'node:assert/strict'
import { seed } from './data.js'
import { figures, orderTotal, summary, sum } from './accounting.js'

const s = seed()
const fig = [...figures(s).values()]
const all = summary(s, {})
const custPaid = sum(s.transactions.filter((t) => t.type === 'customer_payment'), (t) => t.amount)
assert.equal(all.collections, custPaid)                            // collections counted once
assert.equal(sum(fig, (f) => f.paid), custPaid)                    // ...and fully attributed to orders
assert.equal(all.margin, all.revenue - all.printing)               // margin excludes other expenses
assert.equal(all.outstanding, sum(fig, (f) => f.total) - custPaid) // advances reduce outstanding (no overpaid orders in seed)
assert.ok(fig.every((f) => f.balance >= 0 && f.vendorDue >= 0))
assert.equal(orderTotal({ design: 100, print: 50, discount: 30 }), 120)   // discount comes off the total
console.log('accounting ok')
