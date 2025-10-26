import { useEffect, useState } from 'react';
import calendar from '../assets/calendar-days.svg';
import clock from '../assets/clock.svg';


export default function TopNav() {
  const [date, setDate] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      const formattedDay = now.toLocaleDateString('en-US', {
        weekday: 'long',
      });

      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      setDate(formattedDate);
      setDay(formattedDay);
      setTime(formattedTime);
    };

    updateDateTime(); // run initially
    const interval = setInterval(updateDateTime, 1000); // update every second

    return () => clearInterval(interval); // cleanup
  }, []);

  return (
    <div className="w-full h-16 border-b-2 border-gray-200 bg-white px-10 flex items-center justify-end">
      <div className="text-black text-sm flex items-center gap-2">
        <img src={calendar} alt="" /> {date} <span>|</span> {day} 
        <img src={clock} alt="" className="ml-3" /> {time}
      </div>
    </div>
  );
}
