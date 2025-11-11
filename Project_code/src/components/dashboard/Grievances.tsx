import { useState, useEffect } from 'react';
import { MessageSquare, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Grievance } from '../../lib/supabase';

export default function Grievances() {
  const { profile } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    description: '',
    country: profile?.current_country || '',
    state: profile?.current_state || ''
  });

  useEffect(() => {
    fetchGrievances();
  }, [profile]);

  const fetchGrievances = async () => {
    const { data, error } = await supabase
      .from('grievances')
      .select('*')
      .eq('profile_id', profile?.id || '')
      .order('created_at', { ascending: false });

    if (!error && data) setGrievances(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('grievances')
      .insert({
        profile_id: profile?.id,
        ...formData
      });

    if (!error) {
      setFormData({
        subject: '',
        category: 'general',
        description: '',
        country: profile?.current_country || '',
        state: profile?.current_state || ''
      });
      setShowForm(false);
      fetchGrievances();
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
            Grievance Redressal
          </h2>
          <p className="text-gray-600 ml-11">Submit and track your grievances</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>New Grievance</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Submit a Grievance</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="local_issue">Local Issue in AP</option>
                  <option value="party_matter">Party Matter</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                rows={5}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please describe your grievance in detail..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Grievance'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Your Grievances</h3>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : grievances.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No grievances submitted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grievances.map((grievance) => (
              <div
                key={grievance.id}
                className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(grievance.status)}
                      <h4 className="text-lg font-bold text-gray-900">{grievance.subject}</h4>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <span className="px-3 py-1 bg-gray-100 rounded-full capitalize">{grievance.category.replace('_', ' ')}</span>
                      <span>Submitted: {new Date(grievance.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                    grievance.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    grievance.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    grievance.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {grievance.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700">{grievance.description}</p>
                </div>

                {grievance.response && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="font-semibold text-green-900 mb-2">Response:</p>
                    <p className="text-gray-700">{grievance.response}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Updated: {new Date(grievance.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
