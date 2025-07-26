import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export const useUserProfile = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use any type temporarily to avoid import issues
  const { user } = useSelector((state: any) => state.auth);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try the joined query first
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select(`
            email,
            residents!inner (
              first_name,
              last_name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.warn('Joined query failed, trying separate queries:', profileError);
          
          // Fallback: Try separate queries
          const { data: userProfileData, error: userError } = await supabase
            .from('users_profile')
            .select('email, resident_id')
            .eq('user_id', user.id)
            .single();

          if (userError || !userProfileData) {
            throw new Error('User profile not found');
          }

          if (userProfileData.resident_id) {
            const { data: residentData, error: residentError } = await supabase
              .from('residents')
              .select('first_name, last_name')
              .eq('id', userProfileData.resident_id)
              .single();

            if (residentData) {
              setUserProfile({
                firstName: residentData.first_name || '',
                lastName: residentData.last_name || '',
                email: userProfileData.email || user.email || ''
              });
            } else {
              throw new Error('Resident data not found');
            }
          } else {
            throw new Error('No resident_id found');
          }
        } else if (profile && profile.residents) {
          setUserProfile({
            firstName: profile.residents.first_name || '',
            lastName: profile.residents.last_name || '',
            email: profile.email || user.email || ''
          });
        }
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message || 'Failed to fetch user profile');
        
        // Fallback to basic user data if available
        setUserProfile({
          firstName: 'Admin',
          lastName: '',
          email: user?.email || 'administrator@e-legtas.com'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, user?.email]);

  return { userProfile, loading, error };
};