import { useState, useEffect } from 'react';
import { sessionsAPI, termsAPI } from '../services/apiService';

export interface Session {
  id: number;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface Term {
  id: number;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export const useAcademicData = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [sessionsResponse, termsResponse] = await Promise.all([
          sessionsAPI.getAll(),
          termsAPI.getAll(),
        ]);

        const sessionsData = Array.isArray(sessionsResponse) 
          ? sessionsResponse 
          : sessionsResponse?.data || [];
        
        const termsData = Array.isArray(termsResponse)
          ? termsResponse
          : termsResponse?.data || [];

        setSessions(sessionsData);
        setTerms(termsData);

        // Set active session and term
        const currentSession = sessionsData.find((s: Session) => s.isActive);
        const currentTerm = termsData.find((t: Term) => t.isActive);

        setActiveSession(currentSession || null);
        setActiveTerm(currentTerm || null);

        // If no active session/term, try to get the active ones specifically
        if (!currentSession || !currentTerm) {
          try {
            const [activeSessionData, activeTermData] = await Promise.all([
              sessionsAPI.getActive(),
              termsAPI.getActive(),
            ]);

            if (!currentSession && activeSessionData) {
              const session = activeSessionData?.data || activeSessionData;
              setActiveSession(session);
            }

            if (!currentTerm && activeTermData) {
              const term = activeTermData?.data || activeTermData;
              setActiveTerm(term);
            }
          } catch (activeError) {
            console.warn('Could not fetch active session/term:', activeError);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch academic data');
        console.error('Error fetching academic data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    sessions,
    terms,
    activeSession,
    activeTerm,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      // Refetch logic would go here
    },
  };
};
