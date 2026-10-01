import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Calendar, Clock, MapPin, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export default function BookingForm() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    startTime: '',
    description: '',
    location: user?.address || '',
    urgent: false
  });

  useEffect(() => {
    const fetchWorker = async () => {
      setLoading(true);
      setError(null);
      try {
        const workerData = await api.get(`/workers/${workerId}`);
        setWorker(workerData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (workerId) {
      fetchWorker();
    }
  }, [workerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.startTime) {
      setError('Please select both start date and time');
      return;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const estimatedHours = 2;
    const amount = (worker?.hourlyRate || 30) * estimatedHours;

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/bookings', {
        workerId: worker._id,
        startTime: startDateTime.toISOString(),
        urgent: formData.urgent,
        amount,
        description: formData.description,
        location: formData.location
      });

      navigate('/user/history');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading worker details...</div>
        </div>
      </Layout>
    );
  }

  if (error && !worker) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 mx-4">
          Error: {error}
        </div>
      </Layout>
    );
  }

  if (!worker) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Worker not found</p>
        </div>
      </Layout>
    );
  }

  const estimatedCost = (worker.hourlyRate || 30) * 2;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Book Service with {worker.name}</h1>
            <p className="text-blue-100 mt-2">{worker.profession}</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-sm text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl overflow-hidden">
                  {worker.avatar ? (
                    <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
                  ) : (
                    worker.name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{worker.name}</h3>
                  <p className="text-sm text-gray-600">{worker.profession} • {worker.experience || 'Experienced'}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="text-gray-700 font-medium">
                      <DollarSign className="w-4 h-4 inline" />
                      ${worker.hourlyRate || 30}/hr
                    </span>
                    {worker.rating > 0 && (
                      <span className="text-amber-600 font-semibold">⭐ {worker.rating} ({worker.totalJobs} jobs)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Service Location Address
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter complete service location address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service / Job Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the work required in detail..."
                  required
                ></textarea>
              </div>

              <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg border">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={formData.urgent}
                  onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="urgent" className="flex items-center text-gray-700 cursor-pointer">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="font-medium">Mark as Priority / Urgent Request</span>
                </label>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                  Booking Summary
                </h3>
                <div className="flex justify-between text-gray-700 py-1">
                  <span>Hourly Rate:</span>
                  <span className="font-semibold">${worker.hourlyRate || 30}/hr</span>
                </div>
                <div className="flex justify-between text-gray-700 py-1 border-t mt-2 pt-2">
                  <span>Estimated Total (2 hrs base):</span>
                  <span className="font-bold text-xl text-blue-700">${estimatedCost}</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/user/search')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Confirming Booking...' : 'Confirm Booking Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
