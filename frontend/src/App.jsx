import { Link, Route, Routes } from 'react-router-dom'
import CreatePoll from './pages/CreatePoll.jsx'
import Vote from './pages/Vote.jsx'
import Results from './pages/Results.jsx'

function NavBar() {
  return (
    <nav className="navbar">
      <Link to="/" className="brand"> Poll & Survey Builder</Link>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<CreatePoll />} />
          <Route path="/poll/:code" element={<Vote />} />
          <Route path="/poll/:code/results" element={<Results />} />
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
