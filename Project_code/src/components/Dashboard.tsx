import { useState } from 'react';
import { LogOut, Home, User, GraduationCap, Briefcase, Calendar, MessageSquare, Users as UsersIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DashboardHome from './dashboard/DashboardHome';
import ProfileSection from './dashboard/ProfileSection';
import StudentAssistance from './dashboard/StudentAssistance';
import JobAssistance from './dashboard/JobAssistance';
import Events from './dashboard/Events';
import Grievances from './dashboard/Grievances';


type Tab = 'home' | 'profile' | 'student' | 'jobs' | 'events' | 'grievances' | 'directory';

export default function Dashboard() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const menuItems = [
    { id: 'home' as Tab, icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'profile' as Tab, icon: <User className="w-5 h-5" />, label: 'Profile' },
    { id: 'student' as Tab, icon: <GraduationCap className="w-5 h-5" />, label: 'Student Assistance' },
    { id: 'jobs' as Tab, icon: <Briefcase className="w-5 h-5" />, label: 'Job Portal' },
    { id: 'events' as Tab, icon: <Calendar className="w-5 h-5" />, label: 'Events' },
    { id: 'grievances' as Tab, icon: <MessageSquare className="w-5 h-5" />, label: 'Grievances' },
   
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">Y</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">YSRCP NRI Wing</h1>
                <p className="text-xs text-blue-100">Member Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="font-semibold">{profile?.full_name}</p>
                <p className="text-xs text-blue-100">{profile?.status}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className={`lg:col-span-1 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl shadow-md p-4 sticky top-4">
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-6">
              {activeTab === 'home' && <DashboardHome />}
              {activeTab === 'profile' && <ProfileSection />}
              {activeTab === 'student' && <StudentAssistance />}
              {activeTab === 'jobs' && <JobAssistance />}
              {activeTab === 'events' && <Events />}
              {activeTab === 'grievances' && <Grievances />}
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
