import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { Search, MapPin, Briefcase, Star, DollarSign } from 'lucide-react';

export default function SearchWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfession, selectedLocation]);

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/workers';
      const params = new URLSearchParams();
      if (selectedProfession) params.append('profession', selectedProfession);
      if (selectedLocation) params.append('location', selectedLocation);
      if (searchQuery) params.append('search', searchQuery);

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const data = await api.get(endpoint);
      setWorkers(data);
    } catch (err) {
      setError(err.message);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWorkers();
  };

  const professions = ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'Cleaner', 'Mechanic'];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Find Skilled & Verified Workers</h1>
          <p className="text-gray-600 mt-2">Search top rated local service professionals</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSearchSubmit} className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search worker or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={selectedProfession}
                onChange={(e) => setSelectedProfession(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">All Professions</option>
                {professions.map((prof) => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by location..."
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white font-semibold rounded-lg py-2.5 px-6 hover:bg-blue-700 transition shadow"
            >
              Search Workers
            </button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="text-gray-500 font-medium">Searching verified workers...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            {error}
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
            No verified workers match your search criteria.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workers.map((worker) => (
              <div
                key={worker._id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden border flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0">
                      {worker.avatar ? (
                        <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
                      ) : (
                        worker.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{worker.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{worker.profession}</p>
                      <div className="flex items-center space-x-1 mt-1 text-sm text-amber-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold text-gray-700">
                          {worker.rating > 0 ? worker.rating : 'New'}
                        </span>
                        {worker.totalJobs > 0 && (
                          <span className="text-gray-400 text-xs">({worker.totalJobs} jobs)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {worker.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{worker.location}</span>
                      </div>
                    )}
                    <div className="flex items-center font-semibold text-gray-800">
                      <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                      <span>${worker.hourlyRate || 30} / hr</span>
                    </div>
                  </div>

                  {worker.skills && worker.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {worker.skills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => navigate(`/user/book/${worker._id}`)}
                    className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition shadow"
                  >
                    Book Service Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
