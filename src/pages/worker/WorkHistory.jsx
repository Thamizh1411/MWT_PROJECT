import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { Calendar, CheckCircle, MapPin, PlayCircle } from 'lucide-react';

export default function WorkHistory() {
  const [bookings, setBookings] = useState([]);
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
      const filtered = data.filter(b => ['accepted', 'completed', 'rated'].includes(b.status));
      setBookings(filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
    } catch (err) {
      setError(err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWork = async (bookingId) => {
    setSubmitting(true);
    try {
      await api.put(`/bookings/${bookingId}/complete`);
      loadBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeJobs = bookings.filter(b => b.status === 'accepted');
  const completedJobs = bookings.filter(b => ['completed', 'rated'].includes(b.status));

  return (
    <Layout>
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading work history...</div>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 mx-4">
          Error: {error}
        </div>
      )}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Work History</h1>
            <div className="text-sm text-gray-500">
              {activeJobs.length} active | {completedJobs.length} completed
            </div>
          </div>

          {activeJobs.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Active Jobs</h2>
              <div className="space-y-4">
                {activeJobs.map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition overflow-hidden border-l-4 border-blue-500"
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-800">
                              {booking.description}
                            </h3>
                            {booking.urgent && (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                                URGENT
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Started: {new Date(booking.startTime).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Location: {booking.location}</span>
                            </div>
                            {booking.arrivalMessage && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                <p className="text-sm text-blue-800">
                                  Your Arrival Note: {booking.arrivalMessage}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Service Fee</p>
                            <p className="text-2xl font-bold text-gray-800">${booking.amount}</p>
                          </div>
                          <button
                            onClick={() => handleCompleteWork(booking._id)}
                            disabled={submitting}
                            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>{submitting ? 'Completing...' : 'Mark Job Completed'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Completed Jobs</h2>
            {completedJobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No completed jobs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedJobs.map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {booking.description}
                          </h3>

                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <PlayCircle className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Started: {new Date(booking.startTime).toLocaleString()}</span>
                            </div>
                            {booking.endTime && (
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                <span>Completed: {new Date(booking.endTime).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Location: {booking.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-2">
                          <p className="text-xs text-gray-500">Earned</p>
                          <p className="text-3xl font-bold text-green-600">${booking.amount}</p>
                          {booking.rating && (
                            <div className="text-sm font-semibold text-amber-600">
                              ⭐ Customer Rating: {booking.rating}/5
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
