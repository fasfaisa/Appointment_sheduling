import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LoginForm, SignupForm } from './components/Auth';
import { Calendar, BookingForm } from './components/Appointment';
import { AppointmentList, AdminPanel } from './components/AppointmentManagement';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

// Layout wrapper for protected routes
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  if (!token || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const Navbar = () => {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true'; // Check is_admin field
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('is_admin'); // Remove is_admin on logout
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-blue-600 p-4 relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-white font-bold text-xl">Appointment System</div>
        
        <button 
          className="lg:hidden text-white focus:outline-none"
          onClick={toggleMenu}
        >
          <Menu size={24} />
        </button>

        <div className="hidden lg:flex space-x-4">
          {token ? (
            <>
              <Link to="/dashboard" className="text-white hover:text-blue-200">Dashboard</Link>
              <Link to="/appointments" className="text-white hover:text-blue-200">My Appointments</Link>
              {isAdmin && ( // Only show Admin Panel link if user is admin
                <Link to="/admin" className="text-white hover:text-blue-200">Admin Panel</Link>
              )}
              <button onClick={handleLogout} className="text-white hover:text-blue-200">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white hover:text-blue-200">Login</Link>
              <Link to="/signup" className="text-white hover:text-blue-200">Sign Up</Link>
            </>
          )}
        </div>
      </div>

      <div className={`lg:hidden absolute top-full left-0 right-0 bg-blue-600 ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="flex flex-col items-center py-4 space-y-4">
          {token ? (
            <>
              <Link to="/dashboard" className="text-white hover:text-blue-200" onClick={toggleMenu}>Dashboard</Link>
              <Link to="/appointments" className="text-white hover:text-blue-200" onClick={toggleMenu}>My Appointments</Link>
              {isAdmin && ( // Only show Admin Panel link if user is admin
                <Link to="/admin" className="text-white hover:text-blue-200" onClick={toggleMenu}>Admin Panel</Link>
              )}
              <button onClick={() => { handleLogout(); toggleMenu(); }} className="text-white hover:text-blue-200">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white hover:text-blue-200" onClick={toggleMenu}>Login</Link>
              <Link to="/signup" className="text-white hover:text-blue-200" onClick={toggleMenu}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
// Dashboard
const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle date selection
 
  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    await fetchAvailableSlots(date);
  };

  const fetchAvailableSlots = async (date) => {
    try {
      const response = await fetch(`http://localhost:3000/api/slots?date=${format(date, 'yyyy-MM-dd')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAvailableSlots(data);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  return (
    <div>
      <Calendar onDateSelect={handleDateSelect} />
      {selectedDate && (
        <BookingForm
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          onBookingComplete={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};
 

const App = () => {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/appointmentbooking" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><AppointmentList /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route 
            path="/" 
            element={
              localStorage.getItem('token') 
                ? <Navigate to="/dashboard" replace /> 
                : <Navigate to="/login" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};
  

export default App;