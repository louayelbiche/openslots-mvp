'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ServiceCategory, TimeWindow } from '../types/discovery';
import { CityDropdown, CITIES } from '../components/CityDropdown';

// Service categories with display info
const SERVICE_CATEGORIES: Array<{
  value: ServiceCategory;
  label: string;
  icon: string;
}> = [
  { value: 'MASSAGE', label: 'Massage', icon: '💆' },
  { value: 'ACUPUNCTURE', label: 'Acupuncture', icon: '🪡' },
  { value: 'NAILS', label: 'Nails', icon: '💅' },
  { value: 'HAIR', label: 'Hair', icon: '✂️' },
  { value: 'FACIALS_AND_SKIN', label: 'Facials & Skin', icon: '🧴' },
  { value: 'LASHES_AND_BROWS', label: 'Lashes & Brows', icon: '👁️' },
];

// Time window options
const TIME_WINDOWS: Array<{
  value: TimeWindow;
  label: string;
  description: string;
}> = [
  { value: 'Morning', label: 'Morning', description: '9 AM - 12 PM' },
  { value: 'Afternoon', label: 'Afternoon', description: '12 PM - 4 PM' },
  { value: 'Evening', label: 'Evening', description: '4 PM - 8 PM' },
  { value: 'Custom', label: 'Any Time', description: 'All available' },
];

export default function IndexScreen() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(null);
  const [cityError, setCityError] = useState('');

  const isFormValid = selectedService && city && timeWindow;

  const handleSubmit = () => {
    if (!isFormValid) return;

    // Validate city is selected
    if (!city) {
      setCityError('Please select a city');
      return;
    }

    setCityError('');

    // Get the city label for the API
    const selectedCityObj = CITIES.find((c) => c.value === city);
    const cityLabel = selectedCityObj?.label || city;

    // Build query params
    const params = new URLSearchParams({
      service: selectedService,
      city: cityLabel,
      timeWindow: timeWindow,
    });

    if (zipCode.trim()) {
      params.set('zipCode', zipCode.trim());
    }

    router.push(`/service-type?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            What are you looking for?
          </h1>
          <p className="text-slate-600 text-sm">
            Choose your service to begin
          </p>
        </div>

        {/* Service Category Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_CATEGORIES.map((service) => (
              <button
                key={service.value}
                type="button"
                onClick={() => setSelectedService(service.value)}
                className={`
                  flex flex-col items-center justify-center
                  p-4 rounded-xl border-2 transition-all
                  min-h-[100px] text-center
                  ${
                    selectedService === service.value
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                  }
                `}
                aria-pressed={selectedService === service.value}
              >
                <span className="text-2xl mb-2" aria-hidden="true">
                  {service.icon}
                </span>
                <span className="font-medium text-sm">{service.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* City and Zip Code */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Location
          </h2>
          <div className="flex gap-3">
            <CityDropdown
              value={city}
              onChange={(newCity) => {
                setCity(newCity);
                if (cityError) setCityError('');
              }}
              error={cityError}
              placeholder="Search for a city..."
            />
            <div className="w-28">
              <label htmlFor="zipCode" className="sr-only">
                Zip Code (optional)
              </label>
              <input
                id="zipCode"
                type="text"
                placeholder="Zip"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                inputMode="numeric"
                className="
                  w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm
                  placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent
                "
              />
            </div>
          </div>
        </section>

        {/* Time Window Selector */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Preferred Time
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={tw.value}
                type="button"
                onClick={() => setTimeWindow(tw.value)}
                className={`
                  flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left
                  ${
                    timeWindow === tw.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                  }
                `}
                aria-pressed={timeWindow === tw.value}
              >
                <span className="font-medium text-sm">{tw.label}</span>
                <span
                  className={`text-xs mt-1 ${
                    timeWindow === tw.value ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {tw.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`
            w-full py-4 rounded-xl font-semibold text-base transition-all
            ${
              isFormValid
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
          aria-disabled={!isFormValid}
        >
          Find Availability
        </button>

        {/* Helper text */}
        {!isFormValid && (
          <p className="text-center text-xs text-slate-500 mt-3">
            {!selectedService && 'Select a service, '}
            {!city && 'choose your city, '}
            {!timeWindow && 'choose a time window'}
            {' to continue'}
          </p>
        )}
      </div>
    </main>
  );
}
