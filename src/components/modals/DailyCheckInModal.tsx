import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Check, MapPin, RefreshCw, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import RequestLeaveModal from './RequestLeaveModal';

interface DailyCheckInModalProps {
  onClose: () => void;
}

export default function DailyCheckInModal({ onClose }: DailyCheckInModalProps) {
  const { hrmsSettings } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [, setIsStreaming] = useState(false);
  const [location, setLocation] = useState('In Office (Gurugram)');
  const [locationAddress, setLocationAddress] = useState('Brahma City, Sector 62, Gurgaon, Gurugram, Haryana, 122008, India');
  const [priorities, setPriorities] = useState(['', '', '']);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        setIsCaptured(true);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const retakePhoto = () => {
    setIsCaptured(false);
    setCapturedImage(null);
    startCamera();
  };

  const handlePriorityChange = (index: number, value: string) => {
    const newPriorities = [...priorities];
    newPriorities[index] = value;
    setPriorities(newPriorities);
  };

  const handleCheckIn = () => {
    // Handle check-in logic
    console.log('Check-in data:', {
      location,
      locationAddress,
      priorities: priorities.filter(p => p.trim() !== ''),
      capturedImage,
    });
    onClose();
  };

  const refreshLocation = () => {
    // Simulate location refresh
    setLocationAddress('Fetching location...');
    setTimeout(() => {
      setLocationAddress('Brahma City, Sector 62, Gurgaon, Gurugram, Haryana, 122008, India');
    }, 1000);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Daily Check-in</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Camera Section */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
              {!isCaptured ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="relative">
                  <img
                    src={capturedImage || ''}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Captured
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Apply Leave
              </button>
              {!isCaptured ? (
                <button
                  onClick={capturePhoto}
                  className="flex items-center gap-2 px-6 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              ) : (
                <button
                  onClick={retakePhoto}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake
                </button>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Where are you? <span className="text-danger-500">*</span>
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {hrmsSettings.locationOptions.filter(l => l.isVisible).map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>

              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-danger-500" />
                  <span>Your Location</span>
                  <span className="text-danger-500">*</span>
                </div>
                <button
                  onClick={refreshLocation}
                  className="ml-auto p-1 text-danger-500 hover:text-danger-600"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {locationAddress}
              </p>
            </div>

            {/* Daily Priorities */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-danger-500 rounded-full"></span>
                <label className="text-sm font-medium text-gray-700">
                  Your Daily 3 Priorities
                </label>
              </div>
              {priorities.map((priority, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index < 2 ? (
                    <Star className="w-5 h-5 text-danger-500 fill-danger-500" />
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center text-sm text-gray-400 font-medium">
                      {index + 1}
                    </span>
                  )}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={priority}
                      onChange={(e) => handlePriorityChange(index, e.target.value)}
                      placeholder={`Priority ${index + 1}`}
                      maxLength={200}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        index < 2 ? 'border-danger-300' : 'border-gray-300'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                      {priority.length}/200
                    </span>
                  </div>
                </div>
              ))}
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <span className="font-medium">Tip:</span> Your priorities will be automatically converted into tasks assigned to you, with the first two priority set as high priority. All tasks are due at 5 PM today.
                </p>
              </div>
            </div>

            {/* Check In Button */}
            <button
              onClick={handleCheckIn}
              disabled={!isCaptured}
              className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                isCaptured
                  ? 'bg-danger-500 text-white hover:bg-danger-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Check In
            </button>
          </div>
        </div>
      </div>

      {showLeaveModal && (
        <RequestLeaveModal onClose={() => setShowLeaveModal(false)} />
      )}
    </>
  );
}
