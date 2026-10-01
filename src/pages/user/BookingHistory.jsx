import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, MapPin } from 'lucide-react';

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingData, setRatingData] = useState({});

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/bookings');
      setBookings(data);
    } catch (err) {
      setError(err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRateWorker = async (bookingId) => {
    const { rating, feedback } = ratingData[bookingId] || {};
    if (!rating || rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5 stars');
      return;
    }

    try {
      await api.put(`/bookings/${bookingId}/rate`, {
        rating: parseInt(rating),
        feedback: feedback || ''
      });
      setRatingData(prev => ({ ...prev, [bookingId]: {} }));
      fetchBookings();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'rated':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'rated':
        return <CheckCircle className="w-5 h-5" />;
      case 'accepted':
        return <Clock className="w-5 h-5" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  return (
    <Layout>
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading booking history...</div>
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
            <h1 className="text-3xl font-bold text-gray-800">Booking History</h1>
            <p className="text-gray-600 mt-2">View all your past and active service bookings</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'accepted', 'completed', 'rated', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-4 py-2 rounded-lg font-semibold capitalize transition ${
                    filter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {st} ({st === 'all' ? bookings.length : bookings.filter(b => b.status === st).length})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No bookings found</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-800">
                            {booking.workerName || booking.workerId?.name}
                          </h3>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 font-medium">{booking.profession}</span>
                          {booking.urgent && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                              URGENT
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3">{booking.description}</p>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Date: {new Date(booking.startTime).toLocaleString()}</span>
                          </div>

                          {booking.location && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Address: {booking.location}</span>
                            </div>
                          )}

                          {booking.endTime && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Completed: {new Date(booking.endTime).toLocaleString()}</span>
                            </div>
                          )}

                          {booking.arrivalMessage && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                              <p className="text-sm text-blue-800">
                                <span className="font-semibold">Worker Message:</span> {booking.arrivalMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-3">
                        <span
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border font-semibold ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusIcon(booking.status)}
                          <span className="capitalize">{booking.status}</span>
                        </span>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Service Fee</p>
                          <p className="text-2xl font-bold text-gray-800">${booking.amount}</p>
                        </div>

                        {(booking.status === 'completed' || (booking.status === 'rated' && !booking.rating)) && (
                          <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-lg border w-full md:w-64">
                            <div className="text-xs font-bold text-gray-700">Rate & Review Worker</div>
                            <select
                              value={ratingData[booking._id]?.rating || ''}
                              onChange={(e) => setRatingData({
                                ...ratingData,
                                [booking._id]: { ...ratingData[booking._id], rating: e.target.value }
                              })}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                            >
                              <option value="">Select Rating</option>
                              <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                              <option value="4">⭐⭐⭐⭐ Very Good</option>
                              <option value="3">⭐⭐⭐ Good</option>
                              <option value="2">⭐⭐ Fair</option>
                              <option value="1">⭐ Poor</option>
                            </select>
                            <textarea
                              placeholder="Feedback / Review..."
                              value={ratingData[booking._id]?.feedback || ''}
                              onChange={(e) => setRatingData({
                                ...ratingData,
                                [booking._id]: { ...ratingData[booking._id], feedback: e.target.value }
                              })}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
                              rows="2"
                            />
                            <button
                              onClick={() => handleRateWorker(booking._id)}
                              className="w-full bg-green-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-green-700 text-xs transition"
                            >
                              Submit Review
                            </button>
                          </div>
                        )}

                        {booking.rating && (
                          <div className="mt-2 text-right text-xs bg-amber-50 p-2 rounded border border-amber-200">
                            <div className="font-bold text-amber-700">
                              Your Rating: {'⭐'.repeat(booking.rating)}
                            </div>
                            {booking.feedback && (
                              <div className="text-gray-600 italic mt-1">"{booking.feedback}"</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
