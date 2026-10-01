import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { UserCheck, Check, X, Briefcase, MapPin, DollarSign, FileText } from 'lucide-react';

export default function VerifyWorkers() {
  const [workers, setWorkers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/admin/workers');
      setWorkers(data);
    } catch (err) {
      setError(err.message);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (workerId) => {
    try {
      await api.post(`/admin/approve-worker/${workerId}`);
      loadWorkers();
    } catch (err) {
      alert(`Error approving worker: ${err.message}`);
    }
  };

  const handleReject = async (workerId) => {
    if (!window.confirm('Are you sure you want to reject this worker verification request?')) return;

    try {
      await api.post(`/admin/reject-worker/${workerId}`);
      loadWorkers();
    } catch (err) {
      alert(`Error rejecting worker: ${err.message}`);
    }
  };

  const filteredWorkers =
    filter === 'all'
      ? workers
      : filter === 'verified'
      ? workers.filter(w => w.verified)
      : workers.filter(w => !w.verified);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Verify Worker Accounts</h1>
          <p className="text-gray-600 mt-2">Review document uploads and approve worker profile applications</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending Verification ({workers.filter(w => !w.verified).length})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'verified'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Verified Workers ({workers.filter(w => w.verified).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Workers ({workers.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="text-gray-500">Loading worker accounts...</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredWorkers.length === 0 ? (
              <div className="col-span-2 bg-white rounded-xl shadow-lg p-12 text-center">
                <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No worker records found</p>
              </div>
            ) : (
              filteredWorkers.map((worker) => (
                <div key={worker._id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition border flex flex-col justify-between">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                          {worker.avatar ? (
                            <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
                          ) : (
                            worker.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{worker.name}</h3>
                          <p className="text-xs text-gray-500">{worker.email}</p>
                          <p className="text-xs text-gray-500">{worker.phone || 'No phone provided'}</p>
                        </div>
                      </div>
                      {worker.verified ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                          <Check className="w-4 h-4" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                          Pending Approval
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                      {worker.profession && (
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="font-medium">Profession:</span> <span className="ml-1">{worker.profession}</span>
                        </div>
                      )}
                      {worker.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="font-medium">Location:</span> <span className="ml-1">{worker.location}</span>
                        </div>
                      )}
                      {worker.hourlyRate && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">Hourly Rate:</span> <span className="ml-1">${worker.hourlyRate}/hr</span>
                        </div>
                      )}
                    </div>

                    {worker.documents && worker.documents.length > 0 && (
                      <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-xs font-bold text-blue-800 mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-1" /> Submitted Documents ({worker.documents.length})
                        </p>
                        <div className="space-y-1">
                          {worker.documents.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.path}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline block truncate"
                            >
                              📄 {doc.name || `Document ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!worker.verified && (
                    <div className="p-6 pt-0 flex space-x-3">
                      <button
                        onClick={() => handleVerify(worker._id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition shadow"
                      >
                        <Check className="w-5 h-5" />
                        <span>Approve Worker</span>
                      </button>
                      <button
                        onClick={() => handleReject(worker._id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition shadow"
                      >
                        <X className="w-5 h-5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
