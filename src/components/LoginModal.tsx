import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Lock, ChevronDown, Search, CheckCircle2 } from 'lucide-react';
import { getCountryCodes, sendOTP, verifyOTP, saveAuthData, CountryCode } from '../services/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  initialPhone?: string;  // ADD THIS
  initialStep?: 'phone' | 'otp';  // ADD THIS
}

export function LoginModal({ isOpen, onClose, onLoginSuccess,initialPhone,initialStep }: LoginModalProps) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [fullPhoneUsedForOTP, setFullPhoneUsedForOTP] = useState<string | null>(null);
const [phoneNumber, setPhoneNumber] = useState('');// MODIFY THIS
  const [otp, setOtp] = useState('');
 const [step, setStep] = useState<'phone' | 'otp'>(initialStep || 'phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCountryCodes();
    }
  }, [isOpen]);

// Update phone number when initialPhone changes
useEffect(() => {
  if (initialPhone && countryCodes.length > 0) {
    // Parse phone number: extract country code and number
     setFullPhoneUsedForOTP(initialPhone); 
    const cleanPhone = initialPhone.replace(/\D/g, '');
    
    let foundMatch = false;
    
    // Try to find matching country code (check common lengths: 1, 2, 3 digits)
    for (let len = 3; len >= 1; len--) {
      const potentialCode = cleanPhone.substring(0, len);
      const matchedCountry = countryCodes.find(c => c.phone_code === potentialCode);
      
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(cleanPhone.substring(len));
        foundMatch = true;
        break;
      }
    }
    
    // If no match found, just set the full number
    if (!foundMatch) {
      setPhoneNumber(cleanPhone);
    }
  }
}, [initialPhone, countryCodes]);

useEffect(() => {
  if (initialStep && isOpen) {
    setStep(initialStep);
  }
}, [initialStep, isOpen]);// Fixed dependency array - removed selectedCountry and initialStep

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setSearchTerm('');
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  const loadCountryCodes = async () => {
    try {
      const codes = await getCountryCodes();
      const validCodes = codes.filter(code => 
        code.country_name && 
        code.country_name.trim() !== '' && 
        code.phone_code && 
        code.country_code &&
        code.country_code.length === 2
      );
      setCountryCodes(validCodes);
      const defaultCountry = validCodes.find(c => c.country_code === 'IN') || validCodes[0];
      setSelectedCountry(defaultCountry);
    } catch (err) {
      setError('Failed to load country codes');
    }
  };

  const filteredCountries = countryCodes.filter(country => {
    if (!country.country_name || !country.phone_code || !country.country_code) {
      return false;
    }

    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    const countryName = country.country_name.toLowerCase();
    const phoneCode = country.phone_code.toString();
    const countryCode = country.country_code.toLowerCase();
    
    return (
      countryName.includes(search) ||
      phoneCode.includes(searchTerm) ||
      countryCode.includes(search)
    );
  });

  const getFlagEmoji = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return '🌍';
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || !selectedCountry) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
    const fullPhone = `+${selectedCountry.phone_code}${phoneNumber}`;
setFullPhoneUsedForOTP(fullPhone);  // ADD THIS LINE
await sendOTP(fullPhone);
      setStep('otp');
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
   const fullPhone = fullPhoneUsedForOTP || initialPhone || `+${selectedCountry!.phone_code}${phoneNumber}`;
      const response = await verifyOTP(fullPhone, otp);
      saveAuthData(response);
      
      // Show success toast
      setShowSuccessToast(true);
      
      // Wait a bit for the toast to be visible, then close
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        handleClose();
        // Hide toast after closing
        setTimeout(() => setShowSuccessToast(false), 500);
      }, 1500);
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

const handleClose = () => {
  if (!initialPhone) {
    setPhoneNumber('');
  }
  setOtp('');
  if (!initialStep) {
    setStep('phone');
  }
  setError('');
  setSearchTerm('');
  setShowCountryDropdown(false);
  onClose();
};

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-visible animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {step === 'phone' ? 'Welcome back' : 'Verify your number'}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {step === 'phone' ? 'Enter your phone number to continue' : 'Enter the code we sent you'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
              </button>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            {step === 'phone' ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="flex items-stretch gap-0 border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all bg-white dark:bg-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center gap-2 px-3 py-3.5 border-r border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                      >
                        <span className="text-xl leading-none">
                          {selectedCountry ? getFlagEmoji(selectedCountry.country_code) : '🌍'}
                        </span>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          +{selectedCountry?.phone_code || '1'}
                        </span>
                        <ChevronDown 
                          className={`w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-all duration-200 ${
                            showCountryDropdown ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>

                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter your phone number"
                        className="flex-1 px-4 py-3.5 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400 text-base"
                      />
                    </div>

                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[10000]">
                        <div className="sticky top-0 p-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              ref={searchInputRef}
                              type="text"
                              placeholder="Search countries..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-zinc-400"
                            />
                          </div>
                        </div>

                        <div className="overflow-y-auto max-h-[280px] custom-scrollbar">
                          {filteredCountries.length > 0 ? (
                            <div className="py-1">
                              {filteredCountries.map((country) => (
                                <button
                                  key={country.country_code}
                                  onClick={() => handleSelectCountry(country)}
                                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-left transition-colors ${
                                    selectedCountry?.country_code === country.country_code
                                      ? 'bg-sky-50 dark:bg-sky-900/20'
                                      : ''
                                  }`}
                                >
                                  <span className="text-2xl flex-shrink-0">
                                    {getFlagEmoji(country.country_code)}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                      {country.country_name}
                                    </div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                      +{country.phone_code}
                                    </div>
                                  </div>
                                  {selectedCountry?.country_code === country.country_code && (
                                    <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-12 text-center">
                              <div className="text-4xl mb-2">🔍</div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                No countries found
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Try a different search term
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    We'll send you a verification code
                  </p>
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading || !phoneNumber}
                  className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Sending...
                    </span>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      className="w-full px-4 py-4 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-center text-2xl tracking-[0.5em] font-semibold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 placeholder:tracking-normal"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Code sent to {fullPhoneUsedForOTP}
                    </p>
                    <button
                      onClick={() => setStep('phone')}
                      disabled={loading}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 4}
                  className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Custom Scrollbar Styles */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(161, 161, 170, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(161, 161, 170, 0.5);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(113, 113, 122, 0.3);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(113, 113, 122, 0.5);
          }
        `}</style>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[10000] animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border bg-green-50 dark:bg-green-950/90 border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="font-medium text-green-900 dark:text-green-100">
              Successfully logged in!
            </p>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}