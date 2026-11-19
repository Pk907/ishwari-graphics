import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getSupabaseClient, PORTFOLIO_BUCKET, PORTFOLIO_TABLE, SUPABASE_ANON_KEY, SUPABASE_URL,
} from '../lib/supabase.js'

const CATEGORIES = ['Banners', 'Wedding', 'Social', 'Logos', 'Political', 'Calligraphy', 'Printing', 'Other']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EMPTY_FORM = { title: '', description: '', category: CATEGORIES[0], display_order: '0', is_visible: true }

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Choose a JPEG, PNG, WebP or GIF image.'
  if (file.size > MAX_FILE_SIZE) return 'Images must be 10 MB or smaller.'
  return ''
}

function safeFilename(filename) {
  return filename.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image'
}

function uploadWithProgress(file, path, accessToken, upsert, onProgress) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(PORTFOLIO_BUCKET)}/${encodedPath}`

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    request.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    request.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    request.setRequestHeader('Content-Type', file.type)
    request.setRequestHeader('cache-control', '3600')
    request.setRequestHeader('x-upsert', String(upsert))
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new Error('Network error while uploading the image.'))
    request.onabort = () => reject(new Error('Image upload was cancelled.'))
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100)
        resolve()
        return
      }

      let response = null
      try {
        response = JSON.parse(request.responseText)
      } catch {
        // Keep the HTTP status as a useful fallback if the response isn't JSON.
      }

      const storageError = new Error(
        response?.message
        || (typeof response?.error === 'string' ? response.error : '')
        || (request.status === 413
          ? 'The image is too large for this Storage bucket.'
          : request.status === 400
            ? 'Supabase rejected the upload. Check the bucket, file type, file size, and object path.'
            : request.status === 401 || request.status === 403
              ? 'Supabase denied the upload. Check the signed-in user and Storage permissions.'
              : request.status === 404
                ? 'The Storage bucket or upload endpoint could not be found.'
                : `Supabase Storage upload failed with HTTP ${request.status}.`),
      )
      storageError.name = response?.name || 'StorageUploadError'
      storageError.statusCode = response?.statusCode || request.status
      storageError.error = response?.error || response?.code || ''

      console.error('Supabase Storage upload failed:', {
        message: storageError.message,
        statusCode: storageError.statusCode,
        name: storageError.name,
        error: storageError.error,
        httpStatus: request.status,
        response,
        responseText: request.responseText,
      })
      reject(storageError)
    }
    request.send(file)
  })
}

export default function PortfolioImages({ ask }) {
  const clientState = useMemo(() => {
    try {
      return { client: getSupabaseClient(), error: '' }
    } catch (error) {
      return { client: null, error: error.message }
    }
  }, [])
  const supabase = clientState.client
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [permission, setPermission] = useState('checking')
  const [authError, setAuthError] = useState('')
  const [images, setImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [imagesError, setImagesError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const currentImage = images.find((image) => image.id === editingId)

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      setPermission('signed-out')
      return undefined
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(`Could not restore your Supabase session: ${error.message}`)
      setSession(data.session)
      setAuthLoading(false)
    }).catch((error) => {
      if (!active) return
      setAuthError(`Could not restore your Supabase session: ${error.message}`)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase || !session) {
      setPermission('signed-out')
      return undefined
    }

    let active = true
    setPermission('checking')
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!active) return
      if (error) {
        setPermission('error')
        setAuthError(`Could not verify admin access: ${error.message}`)
      } else if (data === true) {
        setPermission('allowed')
        setAuthError('')
      } else {
        setPermission('denied')
        setAuthError('This Supabase account is not listed as an admin.')
      }
    }).catch((error) => {
      if (!active) return
      setPermission('error')
      setAuthError(`Could not verify admin access: ${error.message}`)
    })

    return () => { active = false }
  }, [session, supabase])

  const loadImages = useCallback(async () => {
    if (!supabase) return
    setLoadingImages(true)
    setImagesError('')

    try {
      const { data, error } = await supabase
        .from(PORTFOLIO_TABLE)
        .select('id, title, description, image_path, category, display_order, is_visible, created_at')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error

      setImages((data || []).map((image) => ({
        ...image,
        url: supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(image.image_path).data.publicUrl,
      })))
    } catch (error) {
      setImagesError(`Could not load portfolio images: ${error.message}`)
    } finally {
      setLoadingImages(false)
    }
  }, [supabase])

  useEffect(() => {
    if (permission === 'allowed') loadImages()
  }, [loadImages, permission])

  async function signIn(event) {
    event.preventDefault()
    setAuthError('')
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setPassword('')
    } catch (error) {
      setAuthError(`Sign-in failed: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setAuthError('')
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(`Sign-out failed: ${error.message}`)
    else {
      setSession(null)
      setImages([])
      setPermission('signed-out')
    }
  }

  function startEdit(image) {
    setEditingId(image.id)
    setForm({
      title: image.title,
      description: image.description || '',
      category: image.category || 'Other',
      display_order: String(image.display_order),
      is_visible: image.is_visible,
    })
    setFile(null)
    setActionError('')
    setNotice('')
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFile(null)
    setProgress(null)
  }

  async function saveImage(event) {
    event.preventDefault()
    setActionError('')
    setNotice('')

    const title = form.title.trim()
    const order = Number(form.display_order)
    if (!title) return setActionError('Enter an image title.')
    if (!Number.isInteger(order) || order < 0) return setActionError('Display order must be a non-negative whole number.')
    if (!editingId && !file) return setActionError('Choose an image to upload.')
    if (file) {
      const validationError = validateFile(file)
      if (validationError) return setActionError(validationError)
    }

    setBusy(true)
    setProgress(file ? 0 : null)
    let uploadedPath = ''
    let imageReplaced = false
    try {
      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!activeSession) throw new Error('Your session expired. Sign in again.')

      let imagePath = currentImage?.image_path
      if (file) {
        imagePath = editingId
          ? currentImage.image_path
          : `${crypto.randomUUID()}/${safeFilename(file.name)}`
        await uploadWithProgress(file, imagePath, activeSession.access_token, Boolean(editingId), setProgress)
        uploadedPath = editingId ? '' : imagePath
        imageReplaced = Boolean(editingId)
      }

      const record = {
        title,
        description: form.description.trim() || null,
        image_path: imagePath,
        category: form.category,
        display_order: order,
        is_visible: form.is_visible,
      }

      if (editingId) {
        const { data, error } = await supabase
          .from(PORTFOLIO_TABLE)
          .update(record)
          .eq('id', editingId)
          .select('id')
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('No portfolio record was updated. Check admin table policies and try again.')
      } else {
        const { error } = await supabase.from(PORTFOLIO_TABLE).insert(record)
        if (error) {
          console.error('Supabase portfolio_images INSERT failed:', {
            message: error.message,
            statusCode: error.statusCode,
            name: error.name,
            error: error.error,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          const { error: cleanupError } = await supabase.storage.from(PORTFOLIO_BUCKET).remove([uploadedPath])
          const cleanupMessage = cleanupError ? ` Storage cleanup also failed: ${cleanupError.message}` : ''
          const databaseDetails = [
            error.message,
            error.code && `Code: ${error.code}`,
            error.details && `Details: ${error.details}`,
            error.hint && `Hint: ${error.hint}`,
          ].filter(Boolean).join(' ')
          throw new Error(`The image uploaded, but its database record could not be saved: ${databaseDetails}.${cleanupMessage}`)
        }
      }

      resetForm()
      setNotice(editingId ? 'Portfolio image updated.' : 'Portfolio image uploaded.')
      await loadImages()
    } catch (error) {
      const partialUpdate = imageReplaced ? ' The image file was replaced, but its metadata may not have been saved.' : ''
      setActionError(`${error.message}${partialUpdate}`)
    } finally {
      setBusy(false)
    }
  }

  async function deleteImage(image) {
    setActionError('')
    setNotice('')
    setBusyId(image.id)
    try {
      const { error: storageError } = await supabase.storage.from(PORTFOLIO_BUCKET).remove([image.image_path])
      if (storageError) throw storageError

      const { data, error } = await supabase
        .from(PORTFOLIO_TABLE)
        .delete()
        .eq('id', image.id)
        .select('id')
        .maybeSingle()
      if (error) throw new Error(`The image file was deleted, but its database record could not be deleted: ${error.message}`)
      if (!data) throw new Error('The image file was deleted, but no database record was removed. Check admin table policies.')

      setImages((existing) => existing.filter((item) => item.id !== image.id))
      setNotice('Portfolio image deleted.')
    } catch (error) {
      setActionError(error.message)
      await loadImages()
    } finally {
      setBusyId(null)
    }
  }

  if (clientState.error) {
    return <><header className="mg-head"><h1>Portfolio images</h1></header><p className="mg-err" role="alert">{clientState.error}</p></>
  }
  if (!supabase) {
    return (
      <>
        <header className="mg-head"><h1>Portfolio images</h1></header>
        <p className="mg-hint">Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the project’s local <code>.env.local</code>, then restart Vite.</p>
      </>
    )
  }
  if (authLoading || permission === 'checking') {
    return <><header className="mg-head"><h1>Portfolio images</h1></header><p role="status">Checking Supabase admin access…</p></>
  }
  if (permission === 'signed-out' || permission === 'denied' || permission === 'error') {
    return (
      <>
        <header className="mg-head"><h1>Portfolio images</h1></header>
        {authError && <p className="mg-err" role="alert">{authError}</p>}
        {permission === 'signed-out' && (
          <form className="mg-portfolio-form" onSubmit={signIn}>
            <label className="mg-field">Supabase admin email
              <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="mg-field">Password
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <div className="mg-actions full"><button className="mg-btn main" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
          </form>
        )}
        {session && <div className="mg-actions left"><button className="mg-btn" onClick={signOut}>Sign out</button></div>}
      </>
    )
  }

  return (
    <>
      <header className="mg-head">
        <h1>Portfolio images</h1>
        <div className="mg-actions">
          <span className="mg-portfolio-meta">{session.user.email}</span>
          <button className="mg-btn" onClick={signOut} disabled={busy}>Sign out</button>
        </div>
      </header>
      <p className="mg-hint">Uploads go to the existing <code>{PORTFOLIO_BUCKET}</code> bucket. Only visible images appear on the public portfolio.</p>

      <form className="mg-portfolio-form" onSubmit={saveImage}>
        <label className="mg-field">Title
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        </label>
        <label className="mg-field">Category
          <input list="portfolio-categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <datalist id="portfolio-categories">
            {CATEGORIES.map((category) => <option key={category} value={category} />)}
          </datalist>
        </label>
        <label className="mg-field full">Description
          <textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="mg-field">Display order
          <input type="number" min="0" step="1" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} required />
        </label>
        <label className="mg-field">Image file {editingId ? '(optional; replaces image)' : ''}
          <input type="file" accept={ACCEPTED_TYPES.join(',')} onChange={(event) => {
            const selected = event.target.files?.[0] || null
            setFile(selected)
            setActionError(selected ? validateFile(selected) : '')
          }} />
          <span className="sub">JPEG, PNG, WebP or GIF · up to 10 MB</span>
        </label>
        <label className="mg-field full">
          <span><input type="checkbox" checked={form.is_visible} onChange={(event) => setForm({ ...form, is_visible: event.target.checked })} /> Show on public website</span>
        </label>
        {(previewUrl || (!file && currentImage)) && (
          <div className="full"><img className="mg-portfolio-preview" src={previewUrl || currentImage.url} alt="Selected portfolio preview" /></div>
        )}
        {progress !== null && <div className="full" role="status">Upload progress: {progress}%<progress className="mg-progress" max="100" value={progress} /></div>}
        {actionError && <p className="mg-err full" role="alert">{actionError}</p>}
        {notice && <p className="mg-hint full" role="status">{notice}</p>}
        <div className="mg-actions left full">
          <button className="mg-btn main" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Upload image'}</button>
          {editingId && <button className="mg-btn" type="button" disabled={busy} onClick={resetForm}>Cancel edit</button>}
        </div>
      </form>

      <header className="mg-head">
        <h2>Existing images</h2>
        <button className="mg-btn" onClick={loadImages} disabled={loadingImages}>{loadingImages ? 'Loading…' : 'Refresh'}</button>
      </header>
      {imagesError && <p className="mg-err" role="alert">{imagesError}</p>}
      {loadingImages && !images.length && <p role="status">Loading portfolio images…</p>}
      {!loadingImages && !images.length && !imagesError && <p className="mg-empty">No portfolio images yet. Upload one above to get started.</p>}
      <div className="mg-portfolio-grid">
        {images.map((image) => (
          <article className="mg-portfolio-card" key={image.id}>
            <a href={image.url} target="_blank" rel="noreferrer" aria-label={`Preview ${image.title} in a new tab`}>
              <img src={image.url} alt={image.title} loading="lazy" />
            </a>
            <div className="mg-portfolio-card-body">
              <h3>{image.title}</h3>
              {image.description && <p>{image.description}</p>}
              <div className="mg-portfolio-meta"><span>{image.category || 'Other'}</span><span>Order {image.display_order}</span></div>
              <div className="mg-portfolio-meta"><span>{image.is_visible ? 'Visible' : 'Hidden'}</span></div>
              <div className="mg-portfolio-actions">
                <button className="mg-btn" onClick={() => startEdit(image)}>Edit</button>
                <button className="mg-btn danger" disabled={busyId === image.id} onClick={() => ask({
                  title: 'Delete portfolio image?',
                  text: `"${image.title}" will be removed from storage and the portfolio.`,
                  ok: 'Delete',
                  danger: true,
                  run: () => deleteImage(image),
                })}>{busyId === image.id ? 'Deleting…' : 'Delete'}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
