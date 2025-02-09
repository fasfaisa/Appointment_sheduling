// AppointmentList.js
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/appointments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleCancel = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error canceling appointment:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6">My Appointments</h2>
      <div className="grid gap-4">
        {appointments.map(appointment => (
          <div key={appointment.id} className="p-4 border rounded shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">
                  {format(new Date(appointment.date), 'MMMM d, yyyy')}
                </p>                                                      
                <p className="text-gray-600">{appointment.time}</p>
                {appointment.notes && (
                  <p className="text-gray-500 mt-2">{appointment.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleCancel(appointment.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
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
  const navigate = useNavigate();

  // Check if the user is authenticated (token exists)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('You are not authorized to access this page.');
      navigate('/login'); // Redirect to login if no token is found
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
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setErrorMessage('An error occurred while fetching appointments.');
    }
  };

  // Handle search and filtering
  useEffect(() => {
    let filtered = appointments;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((appointment) => appointment.status === statusFilter);
    }

    // Filter by search term (user name or email)
    if (searchTerm) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  }, [searchTerm, statusFilter, appointments]);

  // Handle appointment status update
  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/appointments/${appointmentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        fetchAppointments(); // Refresh the list
      } else if (response.status === 401) {
        // Unauthorized (invalid or expired token)
        setErrorMessage('Your session has expired. Please log in again.');
        localStorage.removeItem('token'); // Clear the invalid token
        navigate('/login');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setErrorMessage('An error occurred while updating the appointment status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-2 bg-red-100 text-red-600 border border-red-200 rounded">
          {errorMessage}
        </div>
      )}

      {/* Search and Filter Options */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by user name or email..."
          className="w-full p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="p-2 border rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Appointments Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm font-semibold text-gray-700">
                Date
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm font-semibold text-gray-700">
                Time
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm font-semibold text-gray-700">
                User
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm font-semibold text-gray-700">
                Notes
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b border-gray-200">
                  {format(new Date(appointment.date), 'MMMM d, yyyy')}
                </td>
                <td className="px-6 py-4 border-b border-gray-200">{appointment.time}</td>
                <td className="px-6 py-4 border-b border-gray-200">
                  {appointment.userName} ({appointment.userEmail})
                </td>
                <td className="px-6 py-4 border-b border-gray-200">{appointment.notes}</td>
                <td className="px-6 py-4 border-b border-gray-200">
                  <span
                    className={`px-2 py-1 text-sm rounded-full ${
                      appointment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : appointment.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {appointment.status}
                  </span>
                </td>
                <td className="px-6 py-4 border-b border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { AppointmentList, AdminPanel };