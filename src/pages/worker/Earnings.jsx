import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { DollarSign, TrendingUp, Calendar, Briefcase } from 'lucide-react';

export default function Earnings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/bookings');
      const completed = data.filter(b => ['completed', 'rated'].includes(b.status));
      setBookings(completed.sort((a, b) => new Date(b.endTime || b.updatedAt) - new Date(a.endTime || a.updatedAt)));
    } catch (err) {
      setError(err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const thisMonth = bookings.filter(b => {
      const date = new Date(b.endTime || b.updatedAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const monthlyEarnings = thisMonth.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalHours = bookings.reduce((sum, b) => {
      if (!b.endTime || !b.startTime) return sum + 2;
      const hours = Math.max(1, Math.ceil((new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60 * 60)));
      return sum + hours;
    }, 0);
    const avgPerJob = bookings.length > 0 ? (total / bookings.length).toFixed(2) : 0;

    return {
      total,
      monthly: monthlyEarnings,
      totalJobs: bookings.length,
      totalHours,
      avgPerJob
    };
  };

  const stats = calculateStats();

  return (
    <Layout>
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading earnings report...</div>
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
            <h1 className="text-3xl font-bold text-gray-800">Earnings & Performance Report</h1>
            <p className="text-gray-600 mt-2">Track your completed jobs income and service statistics</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <DollarSign className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold">${stats.total}</p>
              <p className="text-green-100 mt-1">Total Earnings</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <TrendingUp className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold">${stats.monthly}</p>
              <p className="text-blue-100 mt-1">This Month</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <Briefcase className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold">{stats.totalJobs}</p>
              <p className="text-purple-100 mt-1">Completed Jobs</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <Calendar className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold">{stats.totalHours}h</p>
              <p className="text-orange-100 mt-1">Total Work Hours</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Key Metrics</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Hourly Rate</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">${user?.hourlyRate || 30}/hr</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Average Income / Job</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">${stats.avgPerJob}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">⭐ {user?.rating || 'New'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Recent Completed Services</h2>
            </div>

            <div className="divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No completed jobs yet</p>
                </div>
              ) : (
                bookings.slice(0, 10).map((booking) => (
                  <div key={booking._id} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{booking.description}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Completed: {new Date(booking.endTime || booking.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">${booking.amount}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
