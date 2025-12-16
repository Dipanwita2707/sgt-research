'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  BookOpen, 
  Calendar, 
  Award, 
  TrendingUp, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Target,
  BarChart3
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface StudentStats {
  cgpa: number;
  attendance: number;
  semester: number;
  program: string;
  enrolledCourses: number;
  completedCredits: number;
  pendingAssignments: number;
  upcomingExams: number;
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchStudentData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchStudentData = async () => {
    try {
      const response = await api.get('/dashboard/student');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAttendanceColor = (attendance: number) => {
    if (attendance >= 90) return 'text-emerald-600 bg-emerald-100';
    if (attendance >= 75) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getCgpaColor = (cgpa: number) => {
    if (cgpa >= 9) return 'text-emerald-600';
    if (cgpa >= 7) return 'text-sgt-600';
    if (cgpa >= 5) return 'text-amber-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-sgt-100 rounded-full animate-spin border-t-sgt-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-sgt-gradient rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden bg-sgt-gradient rounded-3xl p-8 text-white shadow-sgt-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 right-20 w-4 h-4 bg-sgt-50 rounded-full animate-float opacity-60"></div>
        <div className="absolute bottom-20 right-40 w-3 h-3 bg-sgt-100 rounded-full animate-float opacity-40" style={{animationDelay: '0.5s'}}></div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-6 lg:mb-0">
              {/* Avatar */}
              <div className="relative mr-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sgt-50 rounded-lg flex items-center justify-center border-2 border-white">
                  <Sparkles className="w-3 h-3 text-sgt-700" />
                </div>
              </div>
              
              {/* Greeting */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-sgt-50" />
                  <span className="text-sgt-50 text-sm font-medium">{formatTime()}</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-1">
                  {getUserGreeting()}, {user?.firstName || user?.username}!
                </h1>
                <p className="text-sgt-100 text-lg">
                  Welcome to your Student Portal
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link 
                href="/my-work" 
                className="flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur text-white hover:bg-white/30 rounded-xl transition-all duration-200 font-semibold border border-white/20"
              >
                <FileText className="w-5 h-5" />
                <span>My Work</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/ipr/apply" 
                className="flex items-center gap-2 px-5 py-3 bg-white text-sgt-700 hover:bg-sgt-50 rounded-xl transition-all duration-200 font-semibold shadow-lg"
              >
                <FileText className="w-5 h-5" />
                <span>File IPR</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/research/apply" 
                className="flex items-center gap-2 px-5 py-3 bg-white text-sgt-700 hover:bg-sgt-50 rounded-xl transition-all duration-200 font-semibold shadow-lg"
              >
                <BookOpen className="w-5 h-5" />
                <span>New Research</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${stats?.cgpa && stats.cgpa >= 7 ? 'bg-emerald-400/30 text-emerald-100' : 'bg-amber-400/30 text-amber-100'}`}>
                  {stats?.cgpa && stats.cgpa >= 7 ? 'Excellent' : 'Good'}
                </div>
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">CGPA</p>
              <p className="text-3xl font-bold mt-1">{stats?.cgpa?.toFixed(2) || 'N/A'}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${(stats?.attendance || 0) >= 75 ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'}`}>
                  {(stats?.attendance || 0) >= 75 ? 'On Track' : 'Low'}
                </div>
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Attendance</p>
              <p className="text-3xl font-bold mt-1">{stats?.attendance || 0}%</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <Target className="w-4 h-4 text-sgt-50" />
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Semester</p>
              <p className="text-3xl font-bold mt-1">{stats?.semester || 'N/A'}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <BarChart3 className="w-4 h-4 text-sgt-50" />
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Credits</p>
              <p className="text-3xl font-bold mt-1">{stats?.completedCredits || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-sgt-gradient rounded-xl flex items-center justify-center shadow-sm">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Program Details</h3>
              <p className="text-xs text-gray-500">Your enrollment information</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-sgt-50 to-white rounded-xl border border-sgt-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Program</p>
              <p className="font-semibold text-gray-900 mt-1">{stats?.program || user?.student?.program || 'N/A'}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Registration Number</p>
              <p className="font-semibold text-gray-900 mt-1 font-mono">{user?.student?.registrationNo || user?.username}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Student ID</p>
              <p className="font-semibold text-gray-900 mt-1 font-mono">{user?.student?.studentId || user?.username}</p>
            </div>
          </div>
        </div>

        {/* Current Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Current Progress</h3>
              <p className="text-xs text-gray-500">Your academic standing</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* CGPA Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">CGPA Progress</span>
                <span className={`text-sm font-bold ${getCgpaColor(stats?.cgpa || 0)}`}>{stats?.cgpa?.toFixed(2) || 0}/10</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sgt-gradient rounded-full transition-all duration-500"
                  style={{ width: `${((stats?.cgpa || 0) / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Attendance Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Attendance</span>
                <span className={`text-sm font-bold ${(stats?.attendance || 0) >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{stats?.attendance || 0}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${(stats?.attendance || 0) >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                  style={{ width: `${stats?.attendance || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Enrolled Courses */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-sgt-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-sgt-700">{stats?.enrolledCourses || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Enrolled Courses</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-amber-700">{stats?.pendingAssignments || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Pending Tasks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Upcoming</h3>
              <p className="text-xs text-gray-500">Tasks and deadlines</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-r from-red-50 to-white rounded-xl border border-red-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Pending Assignments</p>
                    <p className="text-xs text-gray-500">Due soon</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-red-600">{stats?.pendingAssignments || 0}</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Upcoming Exams</p>
                    <p className="text-xs text-gray-500">This semester</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-purple-600">{stats?.upcomingExams || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500 mt-1">Navigate to frequently used features</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/ipr/apply" className="group p-5 bg-gradient-to-br from-sgt-50 to-white rounded-2xl border border-sgt-100 hover:border-sgt-300 hover:shadow-sgt transition-all duration-300 card-hover">
            <div className="w-14 h-14 bg-sgt-gradient rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Apply for IPR</h3>
            <p className="text-xs text-gray-500">File new patent or copyright</p>
            <ChevronRight className="w-5 h-5 text-sgt-400 mt-3 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/ipr/my-applications" className="group p-5 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 card-hover">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">My Applications</h3>
            <p className="text-xs text-gray-500">Track submission status</p>
            <ChevronRight className="w-5 h-5 text-emerald-400 mt-3 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button className="group p-5 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all duration-300 card-hover text-left">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Timetable</h3>
            <p className="text-xs text-gray-500">View class schedule</p>
            <ChevronRight className="w-5 h-5 text-purple-400 mt-3 group-hover:translate-x-1 transition-transform" />
          </button>

          <button className="group p-5 bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 hover:border-amber-300 hover:shadow-lg transition-all duration-300 card-hover text-left">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Award className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Exam Results</h3>
            <p className="text-xs text-gray-500">Check your grades</p>
            <ChevronRight className="w-5 h-5 text-amber-400 mt-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
