import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext.jsx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Languages, 
  IndianRupee, 
  FileText,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from "lucide-react";

function GuideRegistration() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    experience: "",
    languages: [],
    destinations: [],
    bio: "",
    hourlyRate: ""
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Predefined options
  const languageOptions = [
    "English", "Hindi", "Tamil", "Bengali", "Marathi", "Gujarati", 
    "Punjabi", "Telugu", "Kannada", "Malayalam", "Odia", "Assamese",
    "French", "German", "Spanish", "Chinese", "Japanese", "Korean"
  ];

  const destinationOptions = [
    "Agra", "Jaipur", "Goa", "Leh", "Kolkata", "Mumbai", "Delhi", 
    "Varanasi", "Mysore", "Udaipur", "Chennai", "Hyderabad", 
    "Kochi", "Shimla", "Darjeeling", "Rishikesh", "Varanasi", 
    "Amritsar", "Jodhpur", "Jaisalmer", "Pushkar", "Khajuraho",
    "Hampi", "Mahabalipuram", "Konark", "Sanchi", "Ellora", "Ajanta"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLanguageChange = (language) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(lang => lang !== language)
        : [...prev.languages, language]
    }));
  };

  const handleDestinationChange = (destination) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.includes(destination)
        ? prev.destinations.filter(dest => dest !== destination)
        : [...prev.destinations, destination]
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setProfileImage(file);
    if (file) {
      setProfileImagePreview(URL.createObjectURL(file));
    } else {
      setProfileImagePreview(null);
    }
  };

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      toast.error("Please fill in all required fields");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.experience || !formData.bio || !formData.hourlyRate) {
      toast.error("Please fill in all required fields");
      return false;
    }
    if (formData.languages.length === 0) {
      toast.error("Please select at least one language");
      return false;
    }
    if (formData.destinations.length === 0) {
      toast.error("Please select at least one destination");
      return false;
    }
    if (parseFloat(formData.hourlyRate) < 100) {
      toast.error("Hourly rate must be at least ₹100");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    if (!profileImage) {
      toast.error("Please upload a profile photo.");
      return;
    }
    
    setLoading(true);
    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => form.append(key, v));
        } else {
          form.append(key, value);
        }
      });
      form.append("profileImage", profileImage);
      const response = await fetch(`${backendUrl}/api/guide/apply`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (data.success) {
        setVerificationEmail(formData.email);
        setVerificationStep(true);
        toast.success("Application submitted successfully! Please verify your email.");
      } else {
        toast.error(data.message || "Failed to submit application");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!otp) {
      toast.error("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/guide/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: verificationEmail,
          otp: otp
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Email verified successfully! Your application is under review.");
        navigate("/guide");
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/guide/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: verificationEmail
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Verification code resent successfully!");
      } else {
        toast.error(data.message || "Failed to resend code");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verificationStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">
              We've sent a verification code to <strong>{verificationEmail}</strong>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                  placeholder="000000"
                  maxLength="6"
                />
              </div>

              <button
                onClick={handleVerifyEmail}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  Didn't receive the code? Resend
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => navigate("/guide")}
                  className="text-gray-600 hover:text-gray-700 font-medium transition-colors"
                >
                  ← Back to Guide Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Guide</h1>
          <p className="text-gray-600">Share your expertise and help travelers discover amazing destinations</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Step {step} of 2</span>
            <span className="text-sm text-gray-500">{step === 1 ? "Personal Information" : "Professional Details"}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              /* Step 1: Personal Information */
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
                <div className="flex flex-col items-center mb-6">
                  <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700 mb-1">Profile Photo <span className="text-red-500">*</span></label>
                  <label htmlFor="profileImage" className="cursor-pointer inline-flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                    {profileImage ? "Change Photo" : "Upload Photo"}
                  </label>
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    required
                  />
                  <span className="text-xs text-gray-500 mb-2">Upload a clear, recent photo. Max size: 2MB.</span>
                  {profileImage && (
                    <span className="text-xs text-blue-700 font-medium mb-2">{profileImage.name}</span>
                  )}
                  {profileImagePreview && (
                    <img src={profileImagePreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-blue-400 shadow-lg mb-2 transition-transform duration-200 hover:scale-105" />
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Professional Details */
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Professional Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Description *
                    </label>
                    <textarea
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe your experience as a guide, certifications, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate (₹) *
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        id="hourlyRate"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        required
                        min="100"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your hourly rate (₹)"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages You Speak *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {languageOptions.map((language) => (
                      <label key={language} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.languages.includes(language)}
                          onChange={() => handleLanguageChange(language)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{language}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinations You Guide *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {destinationOptions.map((destination) => (
                      <label key={destination} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.destinations.includes(destination)}
                          onChange={() => handleDestinationChange(destination)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{destination}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Bio/Introduction *
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    required
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell travelers about yourself, your expertise, and what makes you a great guide..."
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Back to Guide Page */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/guide")}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to Guide Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuideRegistration; 