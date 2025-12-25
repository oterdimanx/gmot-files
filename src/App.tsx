import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SignInForm } from './components/auth/SignInForm'
import { SignUpForm } from './components/auth/SignUpForm'


function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/signin" element={<SignInForm />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route
            path="/"
            element={
                <Index />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
