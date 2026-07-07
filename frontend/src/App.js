import { useEffect, useRef, useState } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const calculateStats = (value, snippetText, secondsElapsed) => {
  if (!snippetText) {
    return { accuracyPercent: 100, wpmValue: 0 };
  }

  let correct = 0;
  const trimmedValue = value.slice(0, snippetText.length);

  for (let i = 0; i < trimmedValue.length; i += 1) {
    if (trimmedValue[i] === snippetText[i]) {
      correct += 1;
    }
  }

  const totalTyped = value.length;
  const accuracyPercent =
    totalTyped === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((correct / totalTyped) * 100)));

  let wpmValue = 0;
  if (secondsElapsed > 0) {
    wpmValue = Math.max(0, Math.round(((correct / 5) * 60) / secondsElapsed));
  }

  return { accuracyPercent, wpmValue };
};

const prettyTimestamp = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

function App() {
  const [snippet, setSnippet] = useState('');
  const [typedValue, setTypedValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [bestScores, setBestScores] = useState(null);
  const [error, setError] = useState('');
  const startTimeRef = useRef(null);
  const submittedRef = useRef(false);
  const intervalRef = useRef(null);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetState = () => {
    stopTimer();
    setTypedValue('');
    setIsFinished(false);
    setIsTyping(false);
    setElapsed(0);
    setWpm(0);
    setAccuracy(100);
    startTimeRef.current = null;
    submittedRef.current = false;
  };

  const loadBestScores = async () => {
    try {
      setError('');
      const response = await fetch(`${API_BASE}/api/best-scores`);
      if (!response.ok) {
        throw new Error('Bad response');
      }
      const data = await response.json();
      setBestScores(data);
    } catch (err) {
      setError('Unable to fetch leaderboard right now.');
    }
  };

  const loadSnippet = async () => {
    try {
      setError('');
      const response = await fetch(`${API_BASE}/api/snippet`);
      if (!response.ok) {
        throw new Error('Bad response');
      }
      const data = await response.json();
      setSnippet(data.text);
      resetState();
    } catch (err) {
      setError('Unable to load snippet. Try again.');
    }
  };

  useEffect(() => {
    loadSnippet();
    loadBestScores();
    return () => {
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (isTyping && !isFinished) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed((Date.now() - startTimeRef.current) / 1000);
        }
      }, 100);
    }
    return () => stopTimer();
  }, [isTyping, isFinished]);

  const submitResult = async (payload) => {
    if (submittedRef.current) {
      return;
    }
    submittedRef.current = true;
    try {
      await fetch(`${API_BASE}/api/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      loadBestScores();
    } catch {
      setError('Unable to save your score. Please try again later.');
      submittedRef.current = false;
    }
  };

  const finishTest = (secondsElapsed, accuracyPercent, wpmValue) => {
    setIsFinished(true);
    setIsTyping(false);
    setElapsed(secondsElapsed);
    setAccuracy(accuracyPercent);
    setWpm(wpmValue);
    submitResult({
      wpm: wpmValue,
      accuracy: accuracyPercent,
      timestamp: new Date().toISOString(),
    });
  };

  const handleTyping = (event) => {
    if (!snippet || isFinished) {
      return;
    }

    const rawValue = event.target.value;
    const nextValue =
      rawValue.length > snippet.length
        ? rawValue.substring(0, snippet.length)
        : rawValue;

    if (!isTyping && nextValue.length > 0) {
      startTimeRef.current = Date.now();
      setIsTyping(true);
    }

    const secondsElapsed = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;

    const { accuracyPercent, wpmValue } = calculateStats(
      nextValue,
      snippet,
      secondsElapsed
    );

    setTypedValue(nextValue);
    setAccuracy(accuracyPercent);
    setWpm(wpmValue);

    if (nextValue.length === snippet.length) {
      finishTest(secondsElapsed, accuracyPercent, wpmValue);
    }
  };

  const handleNewSnippet = async () => {
    resetState();
    await loadSnippet();
  };

  const snippetCharacters = snippet.split('').map((char, index) => {
    let status = 'pending-char';
    if (index < typedValue.length) {
      status = typedValue[index] === char ? 'correct-char' : 'incorrect-char';
    }
    return (
      <span key={`${char}-${index}`} className={`snippet-char ${status}`}>
        {char}
      </span>
    );
  });

  const history = bestScores?.history ?? [];

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Typing Speed Test</h1>
        <p className="app-subtitle">
          Type as accurately and quickly as you can. The timer starts on your first keystroke.
        </p>
      </header>

      <section className="card snippet-card">
        <div className="card-head">
          <h2>Current challenge</h2>
          <button type="button" onClick={handleNewSnippet}>
            Load new text
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <p className="snippet-display" aria-live="polite">
          {snippetCharacters.length ? snippetCharacters : 'Loading...'}
        </p>
        <textarea
          aria-label="Typing area"
          placeholder="Start typing here..."
          value={typedValue}
          onChange={handleTyping}
          disabled={!snippet || isFinished}
        />
      </section>

      <section className="card grid-grid">
        <article className="stat-card">
          <p className="stat-label">Timer</p>
          <p className="stat-value">{`${elapsed.toFixed(1)}s`}</p>
          <p className="stat-detail">{isFinished ? 'Stopped' : 'Live timer'}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">WPM</p>
          <p className="stat-value">{wpm}</p>
          <p className="stat-detail">Words per minute</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Accuracy</p>
          <p className="stat-value">{accuracy}%</p>
          <p className="stat-detail">Character accuracy</p>
        </article>
      </section>

      <section className="card result-card">
        <h2>Previous best scores</h2>
        <div className="best-grid">
          <div>
            <p className="stat-label">Best WPM</p>
            <p className="stat-value highlight">{bestScores?.best_wpm ?? '—'}</p>
          </div>
          <div>
            <p className="stat-label">Best accuracy</p>
            <p className="stat-value highlight">
              {bestScores?.best_accuracy ?? '—'}%
            </p>
          </div>
        </div>
        <div className="history">
          <h3>Recent attempts</h3>
          {history.length === 0 && <p className="history-empty">No submissions yet.</p>}
          <ul className="history-list">
            {history.map((entry, index) => (
              <li key={`${entry.timestamp}-${index}`} className="history-item">
                <span>
                  <strong>{entry.wpm} WPM</strong> @ {entry.accuracy}% accuracy
                </span>
                <span className="history-time">{prettyTimestamp(entry.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default App;
