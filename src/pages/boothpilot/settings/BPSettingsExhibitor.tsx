import React, { useEffect, useState } from 'react';
import {
  Building,
  Calendar,
  Save,
  Loader2,
  FileText,
} from 'lucide-react';
import { useBoothPilot } from '../../../context/BoothPilotContext';

const BPSettingsExhibitor: React.FC = () => {
  const { exhibitor, fetchExhibitor, updateExhibitor } = useBoothPilot();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    website: '',
    icpDescription: '',
    eventName: '',
    eventLocation: '',
    eventStartDate: '',
    eventEndDate: '',
    boothNumber: '',
  });

  useEffect(() => {
    const load = async () => {
      await fetchExhibitor();
      setLoading(false);
    };
    load();
  }, [fetchExhibitor]);

  useEffect(() => {
    if (exhibitor) {
      setFormData({
        companyName: exhibitor.companyName || '',
        industry: exhibitor.industry || '',
        website: exhibitor.website || '',
        icpDescription: exhibitor.icpDescription || '',
        eventName: exhibitor.eventName || '',
        eventLocation: exhibitor.eventLocation || '',
        eventStartDate: exhibitor.eventStartDate || '',
        eventEndDate: exhibitor.eventEndDate || '',
        boothNumber: exhibitor.boothNumber || '',
      });
    }
  }, [exhibitor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateExhibitor(formData);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exhibitor Settings</h1>
        <p className="text-gray-500">Configure your company and event details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g., Enterprise Software"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourcompany.com"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ICP Description */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Ideal Customer Profile (ICP)</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe your ideal customer
            </label>
            <textarea
              name="icpDescription"
              value={formData.icpDescription}
              onChange={handleChange}
              rows={4}
              placeholder="Describe your ideal customer: industry, company size, job titles, pain points, budget range, etc. This helps AI score leads more accurately."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This description is used by the AI to better score leads based on how well they match your ideal customer.
            </p>
          </div>
        </div>

        {/* Event Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleChange}
              placeholder="e.g., Enterprise Tech Summit 2026"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Location</label>
              <input
                type="text"
                name="eventLocation"
                value={formData.eventLocation}
                onChange={handleChange}
                placeholder="e.g., Pragati Maidan, New Delhi"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booth Number</label>
              <input
                type="text"
                name="boothNumber"
                value={formData.boothNumber}
                onChange={handleChange}
                placeholder="e.g., Hall A - Booth 42"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="eventStartDate"
                value={formData.eventStartDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="eventEndDate"
                value={formData.eventEndDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BPSettingsExhibitor;
