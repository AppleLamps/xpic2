'use client';

import { useState, useEffect, useRef } from 'react';

export interface PromptHistoryItem {
  id: string;
  username: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
}

const STORAGE_KEY = 'xpic-prompt-history';
const MAX_HISTORY_ITEMS = 20; // Reduced from 50 - base64 images are large
const SAVE_DEBOUNCE_MS = 500;

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoadRef = useRef(true);

  // Load history from localStorage on mount (only once)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load prompt history:', error);
      setHistory([]);
    } finally {
      // Mark initial load as complete
      isInitialLoadRef.current = false;
    }
  }, []); // Empty dependency - only run once on mount

  // Debounced save to localStorage whenever history changes
  useEffect(() => {
    // Skip save on initial load to avoid redundant write
    if (isInitialLoadRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce writes by 500ms to reduce CPU usage
    saveTimeoutRef.current = setTimeout(() => {
      const saveWithRetry = (items: PromptHistoryItem[], attempt: number = 0): void => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
          console.error('Failed to save prompt history:', error);
          // Handle quota exceeded - progressively reduce history
          if (attempt < 3 && items.length > 5) {
            const reduced = items.slice(0, Math.ceil(items.length / 2));
            console.log(`Quota exceeded, reducing history from ${items.length} to ${reduced.length} items`);
            saveWithRetry(reduced, attempt + 1);
            // Update state to match what we actually saved
            if (attempt === 0) {
              setHistory(reduced);
            }
          } else if (items.length > 0) {
            // Last resort: clear everything
            console.log('Clearing history due to persistent quota issues');
            localStorage.removeItem(STORAGE_KEY);
            setHistory([]);
          }
        }
      };
      saveWithRetry(history);
    }, SAVE_DEBOUNCE_MS);

    // Cleanup timeout on unmount or before next effect
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [history]);

  const addToHistory = (item: Omit<PromptHistoryItem, 'id' | 'createdAt'>) => {
    const newItem: PromptHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev];
      // Keep only the most recent items
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const deleteFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getHistoryItem = (id: string) => {
    return history.find((item) => item.id === id);
  };

  return {
    history,
    addToHistory,
    deleteFromHistory,
    clearHistory,
    getHistoryItem,
  };
}
