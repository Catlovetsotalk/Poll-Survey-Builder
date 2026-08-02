import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPoll, markAsCreator } from '../api.js'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 6
const EMPTY_OPTIONS = ['', '']

export default function CreatePoll() {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState(null)

  function updateOption(index, value) {
    setOptions(options.map((opt, i) => (i === index ? value : opt)))
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) setOptions([...options, ''])
  }

  function removeOption(index) {
    if (options.length > MIN_OPTIONS) setOptions(options.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!question.trim()) return setError('Please enter a question.')
    const filledOptions = options.map((o) => o.trim()).filter(Boolean)
    if (filledOptions.length < MIN_OPTIONS) {
      return setError(`Please provide at least ${MIN_OPTIONS} options.`)
    }

    setLoading(true)
    try {
      const res = await createPoll(
        question.trim(),
        filledOptions,
        expiresAt ? new Date(expiresAt).toISOString() : null
      )
      const code = res.data.code
      markAsCreator(code)
      setCreatedCode(code)
    } catch (err) {
      setError(err.response?.data?.message || `Request failed (${err.response?.status || '?'})`)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setCreatedCode(null)
    setQuestion('')
    setOptions(EMPTY_OPTIONS)
    setExpiresAt('')
  }

  if (createdCode) {
    const voteUrl = `${window.location.origin}/poll/${createdCode}`
    return (
      <div className="card">
        <h2>Poll created 🎉</h2>
        <p className="muted">Share this link with respondents:</p>
        <div className="link-box">{voteUrl}</div>
        <div className="form-actions">
          <Link to={`/poll/${createdCode}`} className="btn btn-ghost">Open voting page</Link>
          <Link to={`/poll/${createdCode}/results`} className="btn btn-primary">View live results</Link>
        </div>
        <p className="muted">
          <button type="button" className="btn btn-small" onClick={resetForm}>Create another poll</button>
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Create a poll</h2>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Question
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should we build next?"
            maxLength={200}
            required
          />
        </label>

        <div className="options-editor">
          <span className="muted">Options ({MIN_OPTIONS}–{MAX_OPTIONS})</span>
          {options.map((opt, i) => (
            <div key={i} className="option-row">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                maxLength={100}
              />
              {options.length > MIN_OPTIONS && (
                <button type="button" className="btn btn-small btn-danger" onClick={() => removeOption(i)}>✕</button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" className="btn btn-small" onClick={addOption}>+ Add option</button>
          )}
        </div>

        <label>Expiry (optional)
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>

        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  )
}
