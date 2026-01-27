import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

const HISTORY_LIMIT = 200;
const DEFAULT_HISTORY_KEY = "default";

type UsePromptHistoryOptions = {
  historyKey?: string | null;
  text: string;
  hasAttachments?: boolean;
  disabled: boolean;
  isAutocompleteOpen: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  setText: (next: string) => void;
  setSelectionStart: (next: number | null) => void;
};

type UsePromptHistoryResult = {
  handleHistoryKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleHistoryTextChange: (next: string) => void;
  recordHistory: (value: string) => void;
  resetHistoryNavigation: () => void;
};

export function usePromptHistory({
  historyKey,
  text,
  hasAttachments = false,
  disabled,
  isAutocompleteOpen,
  textareaRef,
  setText,
  setSelectionStart,
}: UsePromptHistoryOptions): UsePromptHistoryResult {
  const [historyByKey, setHistoryByKey] = useState<Record<string, string[]>>({});
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const draftBeforeHistoryRef = useRef("");
  const activeKey = historyKey ?? DEFAULT_HISTORY_KEY;
  const history = useMemo(() => historyByKey[activeKey] ?? [], [activeKey, historyByKey]);

  useEffect(() => {
    setHistoryIndex(null);
    draftBeforeHistoryRef.current = "";
  }, [activeKey]);

  const resetHistoryNavigation = useCallback(() => {
    setHistoryIndex(null);
  }, []);

  const recordHistory = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      setHistoryByKey((prev) => {
        const existing = prev[activeKey] ?? [];
        if (existing[existing.length - 1] === trimmed) {
          return prev;
        }
        const next = [...existing, trimmed].slice(-HISTORY_LIMIT);
        return {
          ...prev,
          [activeKey]: next,
        };
      });
    },
    [activeKey],
  );

  const applyHistoryValue = useCallback(
    (nextValue: string) => {
      setText(nextValue);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
          return;
        }
        textarea.focus();
        textarea.setSelectionRange(nextValue.length, nextValue.length);
        setSelectionStart(nextValue.length);
      });
    },
    [setSelectionStart, setText, textareaRef],
  );

  const handleHistoryKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (disabled || isAutocompleteOpen) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }
      if (history.length === 0) {
        return;
      }
      const isNavigating = historyIndex !== null;
      const isEmpty = text.length === 0 && !hasAttachments;
      if (!isNavigating && !isEmpty) {
        return;
      }
      if (!isNavigating && event.key === "ArrowDown") {
        return;
      }

      event.preventDefault();
      if (!isNavigating) {
        draftBeforeHistoryRef.current = text;
        const nextIndex = history.length - 1;
        setHistoryIndex(nextIndex);
        applyHistoryValue(history[nextIndex]);
        return;
      }

      if (event.key === "ArrowUp") {
        const nextIndex = Math.max(0, historyIndex - 1);
        if (nextIndex !== historyIndex) {
          setHistoryIndex(nextIndex);
          applyHistoryValue(history[nextIndex]);
        }
        return;
      }

      if (historyIndex >= history.length - 1) {
        setHistoryIndex(null);
        applyHistoryValue(draftBeforeHistoryRef.current);
        return;
      }

      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      applyHistoryValue(history[nextIndex]);
    },
    [
      applyHistoryValue,
      disabled,
      hasAttachments,
      history,
      historyIndex,
      isAutocompleteOpen,
      text,
    ],
  );

  const handleHistoryTextChange = useCallback(
    (_next: string) => {
      if (historyIndex !== null) {
        setHistoryIndex(null);
      }
    },
    [historyIndex],
  );

  return {
    handleHistoryKeyDown,
    handleHistoryTextChange,
    recordHistory,
    resetHistoryNavigation,
  };
}
