import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPoll, votePoll } from '../api.js'

export default function Vote() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [poll, setPoll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [voteError, setVoteError] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await getPoll(code)
        setPoll(res.data)
      } catch (err) {
        setLoadError(err.response?.status === 404 ? 'Poll not found.' : 'Could not load poll.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [code])

  async function handleVote(e) {
    e.preventDefault()
    setVoteError('')

    if (selectedOption === null) {
      setVoteError('Please select an option.')
      return
    }

    setSubmitting(true)
    try {
      await votePoll(code, selectedOption)
      navigate(`/poll/${code}/results`)
    } catch (err) {
      const status = err.response?.status
      if (status === 404) setVoteError('Poll not found.')
      else if (status === 409) {
        // Backend distinguishes "already voted" vs "closed" only by message text;
        // re-fetch the poll to show the right state instead of guessing.
        try {
          const res = await getPoll(code)
          setPoll(res.data)
          setVoteError(res.data.status === 'closed'
            ? 'This poll is closed — no new votes accepted.'
            : "You've already voted on this poll.")
        } catch {
          setVoteError('This vote could not be submitted (poll closed or already voted).')
        }
      } else {
        setVoteError('Something went wrong submitting your vote. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="card"><p className="muted">Loading poll…</p></div>
  if (loadError) return <div className="card"><div className="alert error">{loadError}</div></div>

  if (poll.status === 'closed') {
    return (
      <div className="card">
        <h2>{poll.question}</h2>
        <p className="muted">This poll is no longer accepting votes.</p>
        <Link to={`/poll/${code}/results`} className="btn btn-primary">View results</Link>
      </div>
    )
  }

  if (poll.hasVoted) {
    return (
      <div className="card">
        <h2>{poll.question}</h2>
        <p className="muted">You've already voted on this poll.</p>
        <Link to={`/poll/${code}/results`} className="btn btn-primary">View live results</Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{poll.question}</h2>
      {voteError && <div className="alert error">{voteError}</div>}

      <form onSubmit={handleVote}>
        <div className="option-list">
          {poll.options.map((opt) => (
            <label
              key={opt.optionIndex}
              className={`option-choice ${selectedOption === opt.optionIndex ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="option"
                checked={selectedOption === opt.optionIndex}
                onChange={() => setSelectedOption(opt.optionIndex)}
              />
              {opt.text}
            </label>
          ))}
        </div>

        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit vote'}
        </button>
      </form>
    </div>
  )
}
