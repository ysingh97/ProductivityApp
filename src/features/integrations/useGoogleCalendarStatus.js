import { useEffect, useState } from "react";
import { fetchGoogleCalendarStatus } from "./googleCalendarService";

const useGoogleCalendarStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadStatus = async () => {
      setLoading(true);
      try {
        const nextStatus = await fetchGoogleCalendarStatus();
        if (isActive) {
          setStatus(nextStatus);
        }
      } catch (err) {
        if (isActive) {
          setStatus(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadStatus();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    status,
    loading
  };
};

export default useGoogleCalendarStatus;
