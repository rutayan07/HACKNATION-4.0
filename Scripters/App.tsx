import React, { useState, useEffect } from 'react';
import { BatteryCharging, Clock, CreditCard, Phone } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const [duration, setDuration] = useState<number>(30);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isCharging, setIsCharging] = useState(false);
  const [cost, setCost] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel('charging_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'charging_sessions',
          filter: sessionId ? `id=eq.${sessionId}` : undefined
        },
        (payload) => {
          console.log('Real-time update:', payload);
          if (payload.new.status === 'completed') {
            setIsCharging(false);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const startCharging = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    const cost = duration * 2; // 2rs per minute
    setCost(cost);
    setIsCharging(true);

    const { data, error } = await supabase
      .from('charging_sessions')
      .insert([
        {
          duration_minutes: duration,
          cost: cost,
          status: 'active',
          phone_number: phoneNumber
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error starting charging session:', error);
      return;
    }

    setSessionId(data.id);

    setTimeout(async () => {
      await supabase
        .from('charging_sessions')
        .update({ status: 'completed' })
        .eq('id', data.id);
      
      setIsCharging(false);
      setSessionId(null);
    }, duration * 60 * 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <BatteryCharging className="w-12 h-12 text-green-500" />
          <h1 className="text-3xl font-bold ml-3">EV Charging Station</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Phone className="w-5 h-5 text-blue-600 mr-2" />
              <label className="text-lg font-medium">Phone Number</label>
            </div>
            <input
              type="tel"
              pattern="[0-9]{10}"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isCharging}
              placeholder="Enter 10-digit number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <label className="text-lg font-medium">Charging Duration (minutes)</label>
            </div>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={isCharging}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-lg font-medium">Cost (₹{cost})</span>
            </div>
            <p className="text-sm text-gray-600">Rate: ₹2 per minute</p>
          </div>

          <button
            onClick={startCharging}
            disabled={isCharging}
            className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-all ${
              isCharging
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isCharging ? 'Charging in Progress...' : 'Start Charging'}
          </button>

          {isCharging && (
            <div className="text-center">
              <div className="animate-pulse flex items-center justify-center text-green-500">
                <BatteryCharging className="w-6 h-6 mr-2" />
                <span>Charging in progress...</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Time remaining: {duration} minutes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;