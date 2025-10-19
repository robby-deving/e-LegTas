import React, { useEffect, useState } from "react";
import direction from '../../assets/direction.svg';
import contact from '../../assets/contact.svg';
import evacueeCount from '../../assets/evacueeCount.svg';
import statusEC from '../../assets/statusEC.svg';
import { supabase } from '@/lib/supabaseClient';
import type { EvacuationCenter } from '@/types/EvacuationCenter';

type Props = {
  selectedEvacuationCenter: EvacuationCenter;
  setSelectedEvacuationCenter: (center: EvacuationCenter | null) => void;
};



const EvacuationCenterSidebar: React.FC<Props> = ({ selectedEvacuationCenter, setSelectedEvacuationCenter }) => {
  const [currentCapacity, setCurrentCapacity] = useState<number>(0);

  // Function to determine status badge text and colors based on capacity and status
  const getStatusDisplay = () => {
    const totalCapacity = selectedEvacuationCenter.total_capacity || 0;

    // Priority 1: Check if status is Unavailable
    if (selectedEvacuationCenter.ec_status === 'Unavailable') {
      return {
        text: 'Unavailable',
        style: 'bg-gray-100 text-gray-800'
      };
    }

    // Priority 2: Check capacity conditions
    if (currentCapacity > totalCapacity) {
      return {
        text: 'Over Capacity',
        style: 'bg-red-100 text-red-800'
      };
    } else if (currentCapacity === totalCapacity) {
      return {
        text: 'Full',
        style: 'bg-orange-100 text-orange-800'
      };
    } else {
      return {
        text: selectedEvacuationCenter.ec_status || 'Available',
        style: 'bg-green-100 text-green-800'
      };
    }
  };

  useEffect(() => {
    // First, get the initial data
    fetchEvacuationData();

    // Set up real-time subscription using the newer syntax
    const channel = supabase.channel(`evacuation-center-${selectedEvacuationCenter.id}`, {
      config: {
        broadcast: {
          self: true
        }
      }
    });

    // Listen to all changes (INSERT, UPDATE, DELETE) on both tables
    channel
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'evacuation_summaries'
        },
        (payload) => {
          console.log('Received evacuation summary change:', payload); // Add this for debugging
          fetchEvacuationData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'disaster_evacuation_event'
        },
        (payload) => {
          console.log('Received disaster evacuation event change:', payload); // Add this for debugging
          fetchEvacuationData();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status); // Add this for debugging
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEvacuationCenter.id]);

  const fetchEvacuationData = async () => {
    try {
      console.log('Fetching data for evacuation center:', selectedEvacuationCenter.id);
      
      // First get active disaster evacuation events for this center
      const { data: activeEvents, error: eventsError } = await supabase
        .from('disaster_evacuation_event')
        .select('id')
        .eq('evacuation_center_id', selectedEvacuationCenter.id)
        .is('evacuation_end_date', null);

      if (eventsError) {
        console.error('Error fetching active events:', eventsError);
        return;
      }

      console.log('Active events found:', activeEvents);

      if (!activeEvents?.length) {
        console.log('No active events found, setting capacity to 0');
        setCurrentCapacity(0);
        return;
      }

      // Get the latest evacuation summary for these events
      const { data: summaries, error: summariesError } = await supabase
        .from('evacuation_summaries')
        .select('total_no_of_individuals')
        .in('disaster_evacuation_event_id', activeEvents.map(event => event.id))
        .order('created_at', { ascending: false })
        .limit(1);

      if (summariesError) {
        console.error('Error fetching summaries:', summariesError);
        return;
      }

      console.log('Fetched summaries:', summaries);

      if (summaries && summaries.length > 0) {
        console.log('Setting new capacity:', summaries[0].total_no_of_individuals);
        setCurrentCapacity(summaries[0].total_no_of_individuals);
      } else {
        console.log('No summaries found, setting capacity to 0');
        setCurrentCapacity(0);
      }
    } catch (error) {
      console.error('Error in fetchEvacuationData:', error);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <button
        onClick={() => setSelectedEvacuationCenter(null)}
        className="hover:bg-gray-100 rounded-full transition-colors duration-200"
        aria-label="Close sidebar"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="mt-4">
        <h3 className="text-sm text-gray-500">Evacuation Center:</h3>
        <h1 className="text-2xl font-bold text-green-700">{selectedEvacuationCenter.name}</h1>

        <div className="flex items-center gap-2 mt-3">
          <img src={direction} alt="" />
          <h3 className="text-sm text-gray-500">
            {selectedEvacuationCenter.address}, {selectedEvacuationCenter.barangay_name}
          </h3>
        </div>
      </div>

      <div className="mt-3 border-t-2 border-gray-200 py-3">
        <h3 className="text-sm text-gray-500">Evacuation Capacity:</h3>
        <div className="flex items-center justify-between ps-3">
          <div className="flex items-center gap-3">
            <img src={evacueeCount} alt="" />
            <h3 className="text-sm font-bold">
              Capacity: {currentCapacity}/{selectedEvacuationCenter.total_capacity || '0'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm text-gray-500">Contact Information:</h3>
        <div className="flex items-center gap-3 ps-3">
          <img src={contact} alt="" />
          <div>
            <h3 className="text-sm font-bold">{selectedEvacuationCenter.camp_manager_name}</h3>
            <h3 className="text-sm font-bold">{selectedEvacuationCenter.camp_manager_phone_number}</h3>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-3 py-3">
        <h3 className="text-sm text-gray-500">Evacuation Status:</h3>
        <div className="flex items-center gap-3 ps-3 py-1">
          <img src={statusEC} alt="" />
          <div className={`font-semibold px-2 text-sm rounded ${getStatusDisplay().style}`}>
            {getStatusDisplay().text}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvacuationCenterSidebar;
