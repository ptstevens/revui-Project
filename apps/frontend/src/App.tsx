import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OnboardingPage from './pages/OnboardingPage';
import { RecordingPage } from './pages/RecordingPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/recording/:sessionId" element={<RecordingPage />} />
        <Route path="/" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}

export default App;
