import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getResults, closePoll, connectToPollHub, isCreator } from '../api.js'

const BAR_COLORS = ['#d98c2b', '#3c6e58', '#6366f1', '#ec4899', '#06b6d4', '#ef4444']

export default function Results() {
  const { code } = useParams()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const connectionRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      try {
        const res = await getResults(code)
        if (!cancelled) {
          setResults(res.data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.status === 404 ? 'Poll not found.' : 'Could not load results.')
          setLoading(false)
        }
      }
    }

    loadInitial()

    // Live updates via SignalR — server pushes "resultsUpdated" on every
    // vote or close, matching the GET /results response shape exactly.
    connectionRef.current = connectToPollHub(code, (data) => {
      if (!cancelled) setResults(data)
    })

    return () => {
      cancelled = true
      const conn = connectionRef.current
      if (conn) {
        conn.invoke('LeavePollGroup', code).finally(() => conn.stop())
      }
    }
  }, [code])

  async function handleClose() {
    if (!window.confirm('Close this poll? No further votes will be accepted.')) return
    try {
      await closePoll(code)
    } catch (err) {
      window.alert(err.response?.status === 403
        ? "You're not the creator of this poll, so you can't close it."
        : 'Could not close the poll.')
    }
  }

  if (loading) return <div className="card"><p className="muted">Loading results…</p></div>
  if (error) return <div className="card"><div className="alert error">{error}</div></div>

  const { question, status, totalVotes, options } = results

  return (
    <div className="card">
      <h2>{question}</h2>
      {status === 'closed' && <div className="alert">This poll is closed. Final results below.</div>}

      <div className="bar-chart">
        {options.map((opt) => {
          const pct = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0
          return (
            <div className="bar-row" key={opt.optionIndex}>
              <div className="bar-label">
                <span>{opt.text}</span>
                <span className="muted">{opt.voteCount} vote{opt.voteCount === 1 ? '' : 's'}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${pct}%`, background: BAR_COLORS[opt.optionIndex % BAR_COLORS.length] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="muted">Total votes: {totalVotes}</p>

      <div className="form-actions">
        {status === 'open' && isCreator(code) && (
          <button className="btn btn-ghost" onClick={handleClose}>Close poll</button>
        )}
        <Link to={`/poll/${code}`} className="btn btn-small">Back to voting page</Link>
      </div>
    </div>
  )
}
