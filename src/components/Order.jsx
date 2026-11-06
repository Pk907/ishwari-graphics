import { useState } from 'react'
import { PRICES, STEPS } from '../data'
import { SITE, waLink } from '../config'
import { Magnetic, SecHead, Arrow } from './ui'

const EMPTY = { svc: PRICES[0].v, name: '', phone: '', qty: '', date: '', town: '', del: 'दुकानातून घेईन', details: '' }

function orderText(f) {
  return [
    `नवीन ऑर्डर: ${f.svc}`,
    f.qty && `आकार / संख्या: ${f.qty}`,
    f.date && `कधीपर्यंत: ${f.date}`,
    f.town && `गाव / शहर: ${f.town}`,
    `डिलिव्हरी: ${f.del}`,
    f.details && `तपशील: ${f.details}`,
    f.name && `नाव: ${f.name}`,
    f.phone && `फोन: ${f.phone}`,
  ].filter(Boolean).join('\n')
}

// Booking goes out as a prefilled WhatsApp message.
// shortcut: files can't ride along in a wa.me link, so customers send them in the chat; add an upload endpoint if the studio wants files on the site.
export default function Order() {
  const [f, setF] = useState(EMPTY)
  const [files, setFiles] = useState(0)
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value })
  const submit = (e) => { e.preventDefault(); window.open(waLink(orderText(f)), '_blank', 'noopener') }

  return (
    <section className="order" id="order">
      <SecHead title={['ऑर्डर', 'बुक करा']}>
        <p>सेवा निवडा, माहिती भरा आणि ऑर्डर थेट WhatsApp वर पाठवा. तुमच्या मंजुरीशिवाय प्रिंटिंग होत नाही.</p>
      </SecHead>
      <div className="steps">
        {STEPS.map((s, i) => <div className="step" key={s.b}><i>0{i + 1}</i><b>{s.b}</b><p>{s.p}</p></div>)}
      </div>
      <div className="book">
        <div className="picks" role="radiogroup" aria-label="सेवा निवडा">
          {PRICES.map((p) => (
            <label className="pick" key={p.v}>
              <input type="radio" name="svc" value={p.v} checked={f.svc === p.v} onChange={set} />
              <span className="pk"><b>{p.v}</b><small>{p.p}</small></span>
            </label>
          ))}
          <p>{SITE.priceNote}</p>
        </div>
        <form className="form" onSubmit={submit}>
          <div className="row">
            <label>नाव<input name="name" value={f.name} onChange={set} required autoComplete="name" /></label>
            <label>फोन<input name="phone" value={f.phone} onChange={set} type="tel" required pattern="[0-9+ ]{10,14}" autoComplete="tel" /></label>
          </div>
          <div className="row">
            <label>आकार / संख्या<input name="qty" value={f.qty} onChange={set} placeholder="उदा. 10×3 फूट, 500 कार्ड" /></label>
            <label>कधीपर्यंत हवे<input name="date" value={f.date} onChange={set} type="date" /></label>
          </div>
          <div className="row">
            <label>गाव / शहर<input name="town" value={f.town} onChange={set} autoComplete="address-level2" /></label>
            <label>डिलिव्हरी
              <select name="del" value={f.del} onChange={set}><option>दुकानातून घेईन</option><option>घरपोच हवे</option></select>
            </label>
          </div>
          <label>तपशील<textarea name="details" value={f.details} onChange={set} rows={2} placeholder="नाव, मजकूर, रंग, इतर सूचना" /></label>
          <label className="drop">डिझाइन / फोटो फाइल्स जोडा<br />
            <small>{files ? `${files} फाइल निवडल्या. ऑर्डर पाठवल्यावर त्या WhatsApp chat मध्ये पाठवा.` : 'ऑर्डर पाठवल्यावर या फाइल्स WhatsApp chat मध्ये पाठवा'}</small>
            <input type="file" multiple onChange={(e) => setFiles(e.target.files.length)} />
          </label>
          <div className="summary" aria-live="polite">{orderText(f)}</div>
          <Magnetic as="button" className="btn btn-main" type="submit" style={{ justifySelf: 'start' }}>WhatsApp वर ऑर्डर पाठवा <Arrow /></Magnetic>
        </form>
      </div>
    </section>
  )
}
