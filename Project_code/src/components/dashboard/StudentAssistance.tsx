import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, StudentRequest } from '../../lib/supabase';

export default function StudentAssistance() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'university_guidance',
    course_level: '',
    field_of_study: '',
    target_country: '',
    description: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [profile]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('student_requests')
      .select('*')
      .eq('profile_id', profile?.id || '')
      .order('created_at', { ascending: false });

    if (!error && data) setRequests(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('student_requests')
      .insert({
        profile_id: profile?.id,
        ...formData
      });

    if (!error) {
      setFormData({
        request_type: 'university_guidance',
        course_level: '',
        field_of_study: '',
        target_country: '',
        description: ''
      });
      setShowForm(false);
      fetchRequests();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <GraduationCap className="w-8 h-8 mr-3 text-blue-600" />
            Student Assistance
          </h2>
          <p className="text-gray-600 ml-11">Request mentorship, university guidance, and exam support</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>New Request</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Student Assistance Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
              <select
                value={formData.request_type}
                onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="university_guidance">University Application Guidance</option>
                <option value="exam_prep">Exam Preparation Support</option>
                <option value="fee_discount">Fee Discount/Scholarship</option>
                <option value="mentorship">Mentor Matching</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Level</label>
                <input
                  type="text"
                  placeholder="e.g., Undergraduate, Graduate"
                  value={formData.course_level}
                  onChange={(e) => setFormData({ ...formData, course_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science, Medicine"
                  value={formData.field_of_study}
                  onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Country</label>
              <input
                type="text"
                placeholder="e.g., USA, UK, Canada"
                value={formData.target_country}
                onChange={(e) => setFormData({ ...formData, target_country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your requirements and what kind of assistance you need..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
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
        <h3 className="text-xl font-bold text-gray-900 mb-4">Your Requests</h3>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No student assistance requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 capitalize">
                      {request.request_type.replace('_', ' ')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {request.field_of_study} • {request.course_level}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    request.status === 'completed' ? 'bg-green-100 text-green-700' :
                    request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    request.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {request.status === 'in_progress' ? (
                      <><Clock className="w-4 h-4 inline mr-1" />In Progress</>
                    ) : request.status === 'completed' ? (
                      <><CheckCircle className="w-4 h-4 inline mr-1" />Completed</>
                    ) : (
                      request.status
                    )}
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{request.description}</p>
                <div className="flex items-center text-sm text-gray-600">
                  <span>Target: {request.target_country}</span>
                  <span className="mx-2">•</span>
                  <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
