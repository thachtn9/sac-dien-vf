import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { PillarDetail } from './pages/PillarDetail'
import { ScanUsage } from './pages/ScanUsage'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanUsage />} />
          <Route path="/history" element={<History />} />
          <Route path="/pillar/:id" element={<PillarDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
