import { useState } from 'react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export default function OnboardingPage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: '1',
      title: 'Invite team members',
      description: 'Add your team members to start collaborating',
      completed: false,
    },
    {
      id: '2',
      title: 'Create first task',
      description: 'Set up your first competency verification task',
      completed: false,
    },
    {
      id: '3',
      title: 'Configure settings',
      description: 'Customize your organization settings and preferences',
      completed: false,
    },
  ]);

  const [dismissed, setDismissed] = useState(false);

  const toggleItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  if (dismissed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Revui!</h2>
          <p className="text-gray-600">Your dashboard would be displayed here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Revui!</h1>
          <p className="text-gray-600">Let's get you started with these quick steps</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Getting Started Checklist</h2>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600"
              title="Dismiss checklist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>
                {completedCount} of {checklist.length} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-4">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={`flex items-start p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  item.completed
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <div className="flex-shrink-0 mr-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {item.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${item.completed ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                    {item.title}
                  </h3>
                  <p className={`text-sm ${item.completed ? 'text-green-700' : 'text-gray-600'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {progress === 100 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 font-medium">
                🎉 Congratulations! You've completed all setup steps.
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Skip for now and go to dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
