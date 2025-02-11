import React, { useState, useEffect } from 'react';
import { format,parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/appointments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setStatus({ type: 'error', message: 'Failed to load appointments' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowConfirmDialog(true);
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${selectedAppointment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Appointment cancelled successfully' });
        fetchAppointments();
      } else {
        setStatus({ type: 'error', message: 'Failed to cancel appointment' });
      }
    } catch (error) {
      console.error('Error canceling appointment:', error);
      setStatus({ type: 'error', message: 'Error canceling appointment' });
    } finally {
      setShowConfirmDialog(false);
      setSelectedAppointment(null);
      
      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          My Appointments
        </h2>

        {status.message && (
          <div 
            className={`mb-6 p-4 rounded-lg text-center ${
              status.type === 'error' 
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}
          >
            {status.message}
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">No appointments scheduled</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {appointments.map(appointment => (
              <div 
                key={appointment.id} 
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-xl font-semibold text-gray-800">
                      {format(new Date(appointment.date), 'MMMM d, yyyy')}
                    </p>
                    <p className="text-lg text-gray-600">
                      Time: {appointment.time}
                    </p>
                    {appointment.notes && (
                      <p className="text-gray-500 mt-2 italic">
                        Notes: {appointment.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancelClick(appointment)}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Cancel Appointment
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your appointment on{' '}
                <span className="font-semibold">
                  {format(new Date(selectedAppointment.date), 'MMMM d, yyyy')} at {selectedAppointment.time}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [dailyStats, setDailyStats] = useState([]);
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('You are not authorized to access this page.');
      navigate('/login');
    } else {
      fetchAppointments();
    }
  }, [navigate]);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.status === 403) {
        setErrorMessage('You do not have admin privileges to access this page.');
        navigate('/dashboard');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data);
      setFilteredAppointments(data);
      
      // Process data for the graph
      const appointmentsByDate = data.reduce((acc, appointment) => {
        const date = format(parseISO(appointment.date), 'MMM d');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const statsData = Object.entries(appointmentsByDate).map(([date, count]) => ({
        date,
        appointments: count
      }));

      // Sort by date
      statsData.sort((a, b) => parseISO(a.date) - parseISO(b.date));
      setDailyStats(statsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setErrorMessage('An error occurred while fetching appointments.');
    }
  };

  useEffect(() => {
    const filtered = appointments.filter((appointment) =>
      appointment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAppointments(filtered);
  }, [searchTerm, appointments]);

  if (errorMessage) {
    return <div className="text-red-600 p-4">{errorMessage}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

      {/* Appointments Graph */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Daily Appointments Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="appointments" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by user name..."
        className="w-full p-2 border rounded mb-6"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left font-semibold">Date</th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left font-semibold">Time</th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left font-semibold">User</th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left font-semibold">Contact</th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b">
                  {format(parseISO(appointment.date), 'MMMM d, yyyy')}
                </td>
                <td className="px-6 py-4 border-b">{appointment.time}</td>
                <td className="px-6 py-4 border-b">{appointment.user_name}</td>
                <td className="px-6 py-4 border-b">{appointment.contact}</td>
                <td className="px-6 py-4 border-b">{appointment.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { AppointmentList, AdminPanel };