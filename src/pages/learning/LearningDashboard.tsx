import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Clock,
  Play,
  CheckCircle,
  Star,
  Users,
  Calendar,
  ChevronRight,
  Target,
  Zap,
  GraduationCap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard, ProgressRing } from '../../components/ui/Charts';

interface LearningStats {
  enrolledCourses: number;
  completedCourses: number;
  skillsAcquired: number;
  certifications: number;
  totalHours: number;
  averageProgress: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  instructor: string;
  instructor_name?: string;
  enrolled_count: number;
  rating?: number;
  thumbnail_url?: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  course_title: string;
  progress: number;
  status: 'in_progress' | 'completed';
  enrolled_at: string;
  completed_at?: string;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  courses_count: number;
  estimated_hours: number;
  enrolled: boolean;
}

export default function LearningDashboard() {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, coursesRes, enrollmentsRes, pathsRes] = await Promise.all([
        api.getLearningDashboard(),
        api.getCourses(),
        api.getMyEnrollments(),
        api.getLearningPaths(),
      ]);

      if (dashboardRes.data) setStats(dashboardRes.data);
      if (coursesRes.data) setCourses(coursesRes.data);
      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data);
      if (pathsRes.data) setPaths(pathsRes.data);
    } catch (error) {
      showError('Failed to load learning data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const result = await api.enrollInCourse(courseId);
      if (result.data) {
        success('Successfully enrolled in course');
        fetchLearningData();
      }
    } catch (error) {
      showError('Failed to enroll');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-yellow-100 text-yellow-700',
      advanced: 'bg-red-100 text-red-700',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const inProgressEnrollments = enrollments.filter(e => e.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning & Development</h1>
          <p className="text-gray-500">Expand your skills and grow your career</p>
        </div>
        <Link
          to="/learning/catalog"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 w-fit"
        >
          <BookOpen className="w-4 h-4" />
          Browse Catalog
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Enrolled Courses"
          value={stats?.enrolledCourses || 0}
          icon={<BookOpen className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Completed"
          value={stats?.completedCourses || 0}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Skills Acquired"
          value={stats?.skillsAcquired || 0}
          icon={<Zap className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Certifications"
          value={stats?.certifications || 0}
          icon={<Award className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Continue Learning */}
      {inProgressEnrollments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Continue Learning</h2>
            <Link to="/learning/my-courses" className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressEnrollments.slice(0, 3).map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100"
              >
                <ProgressRing
                  progress={enrollment.progress}
                  size={56}
                  strokeWidth={4}
                  color="#6366f1"
                  label={`${enrollment.progress}%`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{enrollment.course_title}</h3>
                  <p className="text-sm text-gray-500">{enrollment.progress}% complete</p>
                </div>
                <button className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">
                  <Play className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recommended Courses */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recommended Courses</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                className="p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{course.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(course.difficulty_level)}`}>
                        {course.difficulty_level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{course.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        {course.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Users className="w-4 h-4" />
                        {course.enrolled_count} enrolled
                      </span>
                      {course.rating !== undefined && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          {course.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnroll(course.id)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    Enroll
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Paths */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Learning Paths</h2>
              <Link to="/learning/paths" className="text-primary-600 text-sm font-medium hover:text-primary-700">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {paths.slice(0, 3).map((path) => (
                <div
                  key={path.id}
                  className="p-4 border border-gray-100 rounded-xl hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{path.name}</h3>
                      <p className="text-xs text-gray-500">
                        {path.courses_count} courses • {path.estimated_hours}h
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link
                to="/learning/skills"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-gray-700">My Skills</span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
              <Link
                to="/learning/certifications"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-gray-700">Certifications</span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
              <Link
                to="/learning/sessions"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Training Sessions</span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
