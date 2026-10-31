import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import CandidateInfo from './pages/CandidateInfo';
import InterviewSession from './pages/InterviewSession';
import Report from './pages/Report';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/candidate-info" element={<CandidateInfo />} />
            <Route path="/setup" element={<Navigate to="/candidate-info" replace />} />
            <Route path="/interview" element={<InterviewSession />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
