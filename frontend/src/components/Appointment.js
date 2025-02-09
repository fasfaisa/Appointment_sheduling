import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isAfter, startOfDay } from 'date-fns';

const Calendar = ({ onBookingComplete }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  const fetchAvailableDates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3000/api/available-dates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const parsedSlots = data.map(slot => ({
        date: parseISO(slot.date),
        time: slot.time,
        id: slot.id
      }));
      
      setAvailableDates(parsedSlots);
    } catch (error) {
      setError('Failed to load available dates');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  };

  // Modified to allow future dates
  const isDateAvailable = (date) => {
    const today = startOfDay(new Date());
    return isAfter(startOfDay(date), today) || isSameDay(date, today);
  };

  const getAvailableTimesForDate = (date) => {
    return availableDates.filter(slot => isSameDay(slot.date, date));
  };

  const handleDateClick = (date) => {
    if (isDateAvailable(date)) {
      setSelectedDate(date);
      setSelectedTimeSlot(null);
      setShowBookingForm(false);
    }
  };

  const handleTimeSelect = (e) => {
    const slotId = e.target.value;
    
    if (slotId) {
      const slot = availableDates.find(slot => slot.id.toString() === slotId.toString());
      if (slot) {
        setSelectedTimeSlot(slot);
        setShowBookingForm(true);
      }
    } else {
      setSelectedTimeSlot(null);
      setShowBookingForm(false);
    }
  };

  const handleBookingComplete = () => {
    setShowBookingForm(false);
    setSelectedTimeSlot(null);
    fetchAvailableDates();
    if (onBookingComplete) onBookingComplete();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-xl font-bold mb-4 text-center">
          {format(selectedDate, 'MMMM yyyy')}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-medium text-gray-600 p-2">
              {day}
            </div>
          ))}
          
          {getDaysInMonth().map((date) => {
            const isAvailable = isDateAvailable(date);
            const isSelected = isSameDay(date, selectedDate);
            const isPastDate = !isAvailable;
            
            return (
              <button
                key={date.toString()}
                onClick={() => handleDateClick(date)}
                disabled={isPastDate}
                className={`
                  h-12 p-2 relative rounded-lg transition-colors
                  ${isPastDate ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-50 cursor-pointer'}
                  ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                  border border-gray-200
                `}
              >
                <span>{format(date, 'd')}</span>
                {getAvailableTimesForDate(date).length > 0 && (
                  <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <span className="block h-1 w-1 rounded-full bg-green-500"/>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isDateAvailable(selectedDate) && (
          <div className="mt-6 space-y-4">
            <div className="text-center font-medium">
              Available times for {format(selectedDate, 'MMMM d, yyyy')}:
            </div>
            <select
              value={selectedTimeSlot?.id || ''}
              onChange={handleTimeSelect}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a time</option>
              {getAvailableTimesForDate(selectedDate).map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.time}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showBookingForm && selectedTimeSlot && (
        <BookingForm
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  );
};
const BookingForm = ({ selectedDate, selectedTimeSlot, onBookingComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    notes: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          date: format(selectedDate, 'yyyy-MM-dd'),
          timeSlot: selectedTimeSlot.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Appointment booked successfully!' });
        setTimeout(onBookingComplete, 2000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Booking failed' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'An error occurred' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xl font-bold mb-6">
          Book Appointment
          <div className="text-sm font-normal text-gray-600">
            {format(selectedDate, 'MMMM d, yyyy')} at {selectedTimeSlot.time}
          </div>
        </div>

        {status.message && (
          <div className={`p-3 rounded-lg ${
            status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            {status.message}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded-md"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Contact Number</label>
          <input
            type="tel"
            className="w-full p-2 border rounded-md"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Notes (Optional)</label>
          <textarea
            className="w-full p-2 border rounded-md"
            rows="3"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Confirm Booking
        </button>
      </form>
    </div>
  );
};

export { Calendar, BookingForm };