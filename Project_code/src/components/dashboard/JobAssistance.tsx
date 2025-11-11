import { useState, useEffect } from 'react';
import { Briefcase, Plus, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, JobPosting } from '../../lib/supabase';

export default function JobAssistance() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [myJobs, setMyJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'myposts'>('browse');

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    country: '',
    job_type: 'full_time',
    description: '',
    requirements: '',
    salary_range: '',
    application_email: profile?.email || ''
  });

  useEffect(() => {
    fetchJobs();
  }, [profile]);

  const fetchJobs = async () => {
    const [allJobsResult, myJobsResult] = await Promise.all([
      supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),

      supabase
        .from('job_postings')
        .select('*')
        .eq('posted_by', profile?.id || '')
        .order('created_at', { ascending: false })
    ]);

    if (allJobsResult.data) setJobs(allJobsResult.data);
    if (myJobsResult.data) setMyJobs(myJobsResult.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('job_postings')
      .insert({
        posted_by: profile?.id,
        ...formData,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (!error) {
      setShowForm(false);
      fetchJobs();
      setFormData({
        title: '',
        company: '',
        location: '',
        country: '',
        job_type: 'full_time',
        description: '',
        requirements: '',
        salary_range: '',
        application_email: profile?.email || ''
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Briefcase className="w-8 h-8 mr-3 text-green-600" />
            Job Assistance Portal
          </h2>
          <p className="text-gray-600 ml-11">Browse opportunities and post job openings</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Post a Job</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Post a New Job Opening</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select
                  value={formData.job_type}
                  onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                <input
                  type="text"
                  placeholder="e.g., $60k - $80k"
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                rows={4}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
              <textarea
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Email *</label>
              <input
                type="email"
                required
                value={formData.application_email}
                onChange={(e) => setFormData({ ...formData, application_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post Job'}
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

      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'browse'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Browse Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('myposts')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'myposts'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Postings ({myJobs.length})
        </button>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {(activeTab === 'browse' ? jobs : myJobs).map((job) => (
              <div
                key={job.id}
                className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{job.title}</h4>
                    <p className="text-green-600 font-semibold">{job.company}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold capitalize">
                    {job.job_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {job.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      {job.location}, {job.country}
                    </div>
                  )}
                  {job.salary_range && (
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      {job.salary_range}
                    </div>
                  )}
                </div>
                <button className="w-full bg-gradient-to-r from-green-600 to-blue-500 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition">
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
