import { CheckCircle, Clock, Calendar, MessageSquare, FileText, Users, AlertCircle } from 'lucide-react';

type ActivityType = 'task_completed' | 'task_assigned' | 'leave_approved' | 'leave_requested' | 'check_in' | 'comment' | 'meeting' | 'announcement';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  time: string;
  user?: string;
}

const activityConfig: Record<ActivityType, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  task_completed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  task_assigned: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  leave_approved: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  leave_requested: { icon: Calendar, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  check_in: { icon: Clock, color: 'text-primary-600', bgColor: 'bg-primary-100' },
  comment: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  meeting: { icon: Users, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  announcement: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
};

interface ActivityTimelineProps {
  activities: Activity[];
  maxItems?: number;
}

export function ActivityTimeline({ activities, maxItems = 5 }: ActivityTimelineProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-6 bottom-6 w-px bg-gray-200" />

      <div className="space-y-4">
        {displayActivities.map((activity, index) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className="relative flex gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center shadow-sm`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1.5">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{activity.time}</span>
                  {activity.user && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{activity.user}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

// Sample activities for demo
export const sampleActivities: Activity[] = [
  {
    id: '1',
    type: 'task_completed',
    title: 'Completed project proposal',
    description: 'Marketing campaign Q1 2024',
    time: '5 min ago',
    user: 'You',
  },
  {
    id: '2',
    type: 'check_in',
    title: 'Checked in for the day',
    time: '2 hours ago',
  },
  {
    id: '3',
    type: 'leave_approved',
    title: 'Leave request approved',
    description: 'Jan 26-27, 2024',
    time: '3 hours ago',
    user: 'HR Admin',
  },
  {
    id: '4',
    type: 'task_assigned',
    title: 'New task assigned',
    description: 'Review client presentation',
    time: 'Yesterday',
    user: 'Priya Sharma',
  },
  {
    id: '5',
    type: 'meeting',
    title: 'Team standup completed',
    description: 'Weekly sync meeting',
    time: 'Yesterday',
  },
];
