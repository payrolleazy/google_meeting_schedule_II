import React, { useState, useEffect } from 'react';
import { Calendar, Mail, Clock, Users, Send } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { api, MeetingData } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<MeetingData>({
    attendeeEmails: '',
    subject: '',
    description: '',
    duration: '30',
    date: '',
    time: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await api.checkAuthStatus();
        setIsAuthenticated(status);
      } catch (error) {
        console.error('Failed to check auth status');
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await api.createMeeting(formData);
      toast.success('Meeting scheduled successfully!');
      // Reset form
      setFormData({
        attendeeEmails: '',
        subject: '',
        description: '',
        duration: '30',
        date: '',
        time: ''
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to schedule meeting');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-indigo-600" />
              <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
                Schedule Interview Meeting
              </h2>
              <p className="mt-2 text-gray-600">
                Create and send Google Calendar meeting invites to candidates and interviewers
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="mt-8 text-center">
                <button
                  onClick={handleGoogleLogin}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Connect Google Calendar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="attendeeEmails" className="block text-sm font-medium text-gray-700">
                      Attendee Emails
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="attendeeEmails"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                        placeholder="candidate@example.com, interviewer@example.com"
                        value={formData.attendeeEmails}
                        onChange={(e) => setFormData({ ...formData, attendeeEmails: e.target.value })}
                        required
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Separate multiple emails with commas</p>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Meeting Subject
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="subject"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Interview for Software Engineer Position"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Meeting Description
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="description"
                        rows={4}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Please join us for the technical interview..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          id="date"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                        Time
                      </label>
                      <div className="mt-1">
                        <input
                          type="time"
                          id="time"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                        Duration (minutes)
                      </label>
                      <div className="mt-1">
                        <select
                          id="duration"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          required
                        >
                          <option value="30">30 minutes</option>
                          <option value="45">45 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="90">1.5 hours</option>
                          <option value="120">2 hours</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {isLoading ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;