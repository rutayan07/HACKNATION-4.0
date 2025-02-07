import React, { useState, useEffect } from 'react';
import { BatteryCharging, Clock, CreditCard, Phone, Zap, Thermometer, Power, AlertOctagon } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const [duration, setDuration] = useState<number>(30);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isCharging, setIsCharging] = useState(false);
  const [cost, setCost] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);


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
            setTimeRemaining(0);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    let interval: number;
    if (isCharging) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev > 0 ? prev - 1 : 0;
          if (newTime === 0) {
            clearInterval(interval);
          }
          return newTime;
        });

      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isCharging]);

  const startCharging = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    const cost = duration * 4; // 4rs per minute
    setCost(cost);
    setIsCharging(true);
    setTimeRemaining(duration * 60);

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
  };

  const emergencyStop = async () => {
    if (sessionId) {
      await supabase
        .from('charging_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
      
      setIsCharging(false);
      setSessionId(null);
      setTimeRemaining(0);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <BatteryCharging className="w-12 h-12 text-green-500" />
          <h1 className="text-3xl font-bold ml-3">EV Charging Station</h1>
        </div>

        <div className="space-y-6">
          {isCharging && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock className="w-5 h-5 text-blue-1000 mr-2" />
                  <span className="text-sm font-medium">Time Remaining</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{formatTime(timeRemaining)}</p>
              </div>

              <div className="col-span-2">
                <button
                  onClick={emergencyStop}
                  className="w-full py-3 px-6 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-all flex items-center justify-center"
                >
                  <AlertOctagon className="w-5 h-5 mr-2" />
                  Emergency Stop
                </button>
              </div>
            </div>
          )}

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
            <p className="text-sm text-gray-600">Rate: ₹4 per minute</p>
          </div>

          {!isCharging && (
            <button
              onClick={startCharging}
              className="w-full py-3 px-6 rounded-lg text-white font-semibold transition-all bg-green-500 hover:bg-green-600"
            >
              Start Charging
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
