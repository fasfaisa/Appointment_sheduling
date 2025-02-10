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
    <nav className="bg-blue-900 p-4 relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-white font-bold text-xl">Appointment System</div>
        
        <button 
          className="lg:hidden text-white focus:outline-none"
          onClick={toggleMenu}
        >
          <Menu size={24} />
        </button>

        <div className="hidden lg:flex space-x-4">
        <Link to="/" className="text-white hover:text-blue-200">Home</Link>
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
const Home = () => {
  return (
    <div className="flex flex-col justify-center items-center text-white text-center overflow-hidden"
         style={{
           backgroundImage: "url('https://img.freepik.com/free-vector/appointment-booking-with-smartphone_23-2148563107.jpg?t=st=1739200769~exp=1739204369~hmac=251f568fc195703dd99258e3c66ff1e3d49ad8b0e31e1c96faffcff691931439&w=740')",
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundRepeat: 'no-repeat',
           width: '100%',  // Changed from 100vw
           height: '100vh',
           animation: "bgFade 10s infinite alternate"
         }}>
      <h1 className="text-5xl text-black font-bold mb-4">Welcome to Our Appointment Booking System</h1>
      <h2 className="text-2xl text-black mb-6">Book your appointments easily and conveniently.</h2>
      <Link to="/appointmentbooking" className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-800 transition">
        Book an Appointment
      </Link>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-blue-900 text-white text-center p-2 fixed bottom-0 w-full">
      &copy; {new Date().getFullYear()} All Rights Reserved.
    </footer>
  );
};

const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
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
        </main>
        <Footer />
      </div>
    </Router>
  );
};
  

export default App;