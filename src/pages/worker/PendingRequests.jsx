import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { AlertCircle, Check, X, Calendar, MapPin, Clock } from 'lucide-react';

export default function PendingRequests() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [arrivalMessage, setArrivalMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/bookings');
      const pendingBookings = data.filter(b => b.status === 'pending');
      setBookings(pendingBookings);
    } catch (err) {
      setError(err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId) => {
    if (!arrivalMessage.trim()) {
      alert('Please provide an arrival time message for the customer');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/bookings/${bookingId}/accept`, { arrivalMessage });
      setSelectedBooking(null);
      setArrivalMessage('');
      loadBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (bookingId) => {
    if (!window.confirm('Are you sure you want to decline this booking request?')) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/bookings/${bookingId}/reject`);
      loadBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading pending booking requests...</div>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 mx-4">
          Error: {error}
        </div>
      )}
      {!loading && !error && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pending Job Requests</h1>
            <p className="text-gray-600 mt-2">Review and accept or decline incoming customer requests</p>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No pending requests</p>
              <p className="text-gray-400 text-sm mt-2">
                New customer booking requests will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition overflow-hidden border"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{booking.description}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Customer: <span className="font-semibold text-gray-800">{booking.userId?.name || 'Customer'}</span>
                        </p>
                        {booking.urgent && (
                          <span className="inline-block mt-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                            PRIORITY URGENT REQUEST
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Service Fee</p>
                        <p className="text-2xl font-bold text-green-600">${booking.amount}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Scheduled Start Time</p>
                          <p className="text-gray-800 font-semibold text-sm">
                            {new Date(booking.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Location Address</p>
                          <p className="text-gray-800 font-semibold text-sm">{booking.location}</p>
                        </div>
                      </div>
                    </div>

                    {selectedBooking === booking._id ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Arrival Time & Note for Customer
                        </label>
                        <textarea
                          value={arrivalMessage}
                          onChange={(e) => setArrivalMessage(e.target.value)}
                          rows="2"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                          placeholder="e.g. I will arrive at your address around 10:00 AM sharp."
                        ></textarea>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleAccept(booking._id)}
                            disabled={submitting}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                          >
                            {submitting ? 'Accepting...' : 'Confirm Accept'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(null);
                              setArrivalMessage('');
                            }}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-3 mt-4">
                        <button
                          onClick={() => setSelectedBooking(booking._id)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition shadow"
                        >
                          <Check className="w-5 h-5" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          onClick={() => handleReject(booking._id)}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 shadow"
                        >
                          <X className="w-5 h-5" />
                          <span>{submitting ? 'Declining...' : 'Decline Request'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
