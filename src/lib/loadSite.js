import { C, WORK, SERVICES, PRICES, REVIEWS, STATS, STEPS, INSTAGRAM } from '../data'
import { SITE } from '../config'
import { getSupabaseClient, PORTFOLIO_BUCKET, PORTFOLIO_TABLE } from './supabase'

const COLORS = [C.saf, C.mag, C.blue, C.green, C.maroon, '#0891b2']

// Replace a placeholder list in place (components import the array itself), only when the admin has entered some.
const fill = (target, rows) => rows?.length && target.splice(0, target.length, ...rows)

// Overwrites the placeholder content in data.js / config.js with the Django admin's content.
// If the backend is down or empty the site keeps rendering the placeholders.
export async function loadSite() {
  let d
  try {
    const r = await fetch('/api/site/', { signal: AbortSignal.timeout(3000) })
    if (r.ok) d = await r.json()
    else console.error(`Site content request failed (${r.status}).`)
  } catch (error) {
    console.error('Site content request failed:', error)
  }

  if (d) {
    if (d.settings) Object.entries(d.settings).forEach(([k, v]) => { if (v) SITE[k] = v })
    fill(WORK, d.posters.map((p) => ({ t: p.title, cat: p.category, tag: p.tag, img: p.image, r: `${p.width}/${p.height}` })))
    fill(SERVICES, d.services.map((s) => ({ id: s.demo || s.id, c: s.color, title: s.title, en: s.en, items: s.items })))
    fill(PRICES, d.prices.map((p) => ({ v: p.item, p: p.price })))
    fill(REVIEWS, d.reviews.map((r, i) => ({ n: r.name, c: COLORS[i % COLORS.length], w: r.when, t: r.text })))
    fill(STEPS, d.steps.map((s) => ({ b: s.title, p: s.text })))
    fill(INSTAGRAM, d.instagram.map((x) => ({ t: x.caption, img: x.image, link: x.link })))
    fill(STATS, d.stats.map((s) => ({ b: s.value, em: s.suffix, s: s.label })))
  }

  try {
    const supabase = getSupabaseClient()
    if (!supabase) return

    const { data, error } = await supabase
      .from(PORTFOLIO_TABLE)
      .select('id, title, description, image_path, category, display_order')
      .eq('is_visible', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!data.length) return

    const projects = data.map((image) => ({
      id: image.id,
      t: image.title,
      description: image.description || '',
      cat: image.category || 'Other',
      tag: '',
      img: supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(image.image_path).data.publicUrl,
      r: '3/4',
    }))
    WORK.splice(0, WORK.length, ...projects)
  } catch (error) {
    console.error('Portfolio images could not be loaded from Supabase:', error)
  }
}
