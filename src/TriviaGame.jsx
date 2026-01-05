import React, { useState, useEffect } from 'react';
import { Users, Play, SkipForward, Trophy, Plus, Trash2, CheckCircle, Circle, RotateCcw, X, Edit2, Save } from 'lucide-react';
import './firebase';

const TriviaGame = () => {
  // Check if storage is initialized
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    // Wait for storage to be ready
    const checkStorage = () => {
      if (window.storage) {
        console.log('Storage is ready');
        setStorageReady(true);
      } else {
        console.log('Waiting for storage...');
        setTimeout(checkStorage, 100);
      }
    };
    checkStorage();
  }, []);

  // Parse URL parameters on mount
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code') || '',
      team: params.get('team') || '',
      role: params.get('role') || '' // 'admin' or 'player'
    };
  };

  const urlParams = getUrlParams();
  
  const [view, setView] = useState('home'); // home, admin, player, setup
  const [gameCode, setGameCode] = useState(urlParams.code);
  const [teamName, setTeamName] = useState(urlParams.team);
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState(null);
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [editedRounds, setEditedRounds] = useState([]);

  // Auto-join on mount if URL has params
  useEffect(() => {
    if (!storageReady) return;
    
    const autoJoin = async () => {
      if (urlParams.code && urlParams.role) {
        console.log('Auto-joining from URL:', urlParams);
        
        if (urlParams.role === 'admin') {
          // Join as admin
          try {
            setIsLoading(true);
            const result = await window.storage.get(`game:${urlParams.code}`, true);
            if (result) {
              const game = JSON.parse(result.value);
              setGameState(game);
              setView('admin');
            } else {
              console.error('Game not found');
              // Clear invalid URL params
              window.history.replaceState({}, '', window.location.pathname);
            }
          } catch (error) {
            console.error('Error auto-joining as admin:', error);
            window.history.replaceState({}, '', window.location.pathname);
          } finally {
            setIsLoading(false);
          }
        } else if (urlParams.role === 'player' && urlParams.team) {
          // Join as player
          try {
            setIsLoading(true);
            const result = await window.storage.get(`game:${urlParams.code}`, true);
            if (result) {
              const game = JSON.parse(result.value);
              
              // Add team if it doesn't exist
              if (!game.teams[urlParams.team]) {
                game.teams[urlParams.team] = {
                  name: urlParams.team,
                  scores: new Array(game.rounds.length).fill(0),
                  answers: {},
                  totalScore: 0
                };
                await window.storage.set(`game:${urlParams.code}`, JSON.stringify(game), true);
              }
              
              setGameState(game);
              setView('player');
            } else {
              console.error('Game not found');
              window.history.replaceState({}, '', window.location.pathname);
            }
          } catch (error) {
            console.error('Error auto-joining as player:', error);
            window.history.replaceState({}, '', window.location.pathname);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    autoJoin();
  }, [storageReady]);

  // Setup state
  const [setupData, setSetupData] = useState({
    gameName: '',
    rounds: [
      {
        name: 'Round 1',
        theme: '',
        questions: [
          { question: '', answer: '', points: 10 }
        ]
      }
    ]
  });

  // Generate random game code
  const generateGameCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create new game
  const createGame = async () => {
    if (!window.storage) {
      alert('Storage not ready. Please wait a moment and try again.');
      return;
    }

    const code = generateGameCode();
    const newGame = {
      code,
      name: setupData.gameName,
      rounds: setupData.rounds,
      currentRound: 0,
      status: 'lobby', // lobby, active, reviewing, completed
      teams: {},
      createdAt: Date.now()
    };

    try {
      setIsLoading(true);
      await window.storage.set(`game:${code}`, JSON.stringify(newGame), true);
      setGameCode(code);
      setGameState(newGame);
      
      // Update URL
      window.history.pushState({}, '', `?code=${code}&role=admin`);
      
      setView('admin');
    } catch (error) {
      alert('Error creating game: ' + error.message);
      console.error('Create game error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Join game
  const joinGame = async () => {
    if (!gameCode || !teamName) {
      alert('Please fill in all fields');
      return;
    }

    console.log('Attempting to join game:', gameCode);
    
    try {
      setIsLoading(true);
      const upperGameCode = gameCode.toUpperCase();
      console.log('Looking for game:', `game:${upperGameCode}`);
      
      const result = await window.storage.get(`game:${upperGameCode}`, true);
      console.log('Storage result:', result);
      
      if (!result) {
        alert('Game not found. Please check the game code.');
        setIsLoading(false);
        return;
      }

      const game = JSON.parse(result.value);
      console.log('Parsed game:', game);
      
      // Add team if it doesn't exist
      if (!game.teams[teamName]) {
        game.teams[teamName] = {
          name: teamName,
          scores: new Array(game.rounds.length).fill(0),
          answers: {},
          totalScore: 0
        };
      }

      console.log('Saving updated game with team:', teamName);
      await window.storage.set(`game:${upperGameCode}`, JSON.stringify(game), true);
      
      setGameCode(upperGameCode);
      setGameState(game);
      
      // Update URL
      window.history.pushState({}, '', `?code=${upperGameCode}&team=${encodeURIComponent(teamName)}&role=player`);
      
      console.log('Setting view to player');
      setView('player');
    } catch (error) {
      console.error('Join game error:', error);
      alert('Error joining game: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load game state (for both admin and players)
  const loadGameState = async () => {
    if (!gameCode) return;

    try {
      const result = await window.storage.get(`game:${gameCode.toUpperCase()}`, true);
      if (result) {
        setGameState(JSON.parse(result.value));
      }
    } catch (error) {
      console.error('Error loading game:', error);
    }
  };

  // Update game state
  const updateGameState = async (updates) => {
    const updated = { ...gameState, ...updates };
    try {
      await window.storage.set(`game:${gameCode}`, JSON.stringify(updated), true);
      setGameState(updated);
    } catch (error) {
      alert('Error updating game: ' + error.message);
    }
  };

  // Admin controls
  const startRound = () => {
    updateGameState({
      status: 'active'
    });
  };

  const reviewRound = () => {
    updateGameState({
      status: 'reviewing'
    });
  };

  const endRound = () => {
    if (gameState.currentRound < gameState.rounds.length - 1) {
      updateGameState({
        currentRound: gameState.currentRound + 1,
        status: 'lobby'
      });
    } else {
      updateGameState({ status: 'completed' });
    }
  };

  // Restart game
  const restartGame = async () => {
    const updated = {
      ...gameState,
      currentRound: 0,
      status: 'lobby',
      teams: {}
    };

    try {
      await window.storage.set(`game:${gameCode}`, JSON.stringify(updated), true);
      setGameState(updated);
      setShowRestartConfirm(false);
    } catch (error) {
      alert('Error restarting game: ' + error.message);
    }
  };

  // Remove team
  const removeTeam = async (teamId) => {
    const updated = { ...gameState };
    delete updated.teams[teamId];

    try {
      await window.storage.set(`game:${gameCode}`, JSON.stringify(updated), true);
      setGameState(updated);
      setTeamToRemove(null);
    } catch (error) {
      alert('Error removing team: ' + error.message);
    }
  };

  // Start editing questions
  const startEditingQuestions = () => {
    setEditedRounds(JSON.parse(JSON.stringify(gameState.rounds))); // Deep copy
    setIsEditingQuestions(true);
  };

  // Save edited questions
  const saveEditedQuestions = async () => {
    const updated = {
      ...gameState,
      rounds: editedRounds
    };

    try {
      await window.storage.set(`game:${gameCode}`, JSON.stringify(updated), true);
      setGameState(updated);
      setIsEditingQuestions(false);
      alert('Questions updated successfully!');
    } catch (error) {
      alert('Error saving questions: ' + error.message);
    }
  };

  // Update edited round
  const updateEditedRound = (roundIndex, field, value) => {
    const newRounds = [...editedRounds];
    newRounds[roundIndex][field] = value;
    setEditedRounds(newRounds);
  };

  // Update edited question
  const updateEditedQuestion = (roundIndex, questionIndex, field, value) => {
    const newRounds = [...editedRounds];
    newRounds[roundIndex].questions[questionIndex][field] = value;
    setEditedRounds(newRounds);
  };

  // Add question to edited round
  const addEditedQuestion = (roundIndex) => {
    const newRounds = [...editedRounds];
    newRounds[roundIndex].questions.push({ question: '', answer: '', points: 10 });
    setEditedRounds(newRounds);
  };

  // Delete question from edited round
  const deleteEditedQuestion = (roundIndex, questionIndex) => {
    const newRounds = [...editedRounds];
    newRounds[roundIndex].questions = newRounds[roundIndex].questions.filter((_, i) => i !== questionIndex);
    setEditedRounds(newRounds);
  };

  // Add round to edited rounds
  const addEditedRound = () => {
    setEditedRounds([...editedRounds, {
      name: `Round ${editedRounds.length + 1}`,
      theme: '',
      questions: [{ question: '', answer: '', points: 10 }]
    }]);
  };

  // Delete edited round
  const deleteEditedRound = (roundIndex) => {
    const newRounds = editedRounds.filter((_, i) => i !== roundIndex);
    setEditedRounds(newRounds);
  };

  // Submit answers for entire round
  const submitRoundAnswers = async () => {
    const round = gameState.currentRound;
    const updated = { ...gameState };
    const currentRoundObj = gameState.rounds[round];
    
    // Collect all answers from inputs
    const answers = {};
    let allAnswered = true;
    
    currentRoundObj.questions.forEach((_, qIdx) => {
      const input = document.getElementById(`answer-${qIdx}`);
      if (input && input.value.trim()) {
        const answerKey = `${round}-${qIdx}`;
        answers[answerKey] = {
          answer: input.value.trim(),
          timestamp: Date.now()
        };
      } else {
        allAnswered = false;
      }
    });

    if (!allAnswered) {
      alert('Please answer all questions before submitting');
      return;
    }

    // Update all answers at once
    if (!updated.teams[teamName]) {
      updated.teams[teamName] = {
        name: teamName,
        scores: new Array(gameState.rounds.length).fill(0),
        answers: {},
        totalScore: 0
      };
    }
    
    updated.teams[teamName].answers = {
      ...updated.teams[teamName].answers,
      ...answers
    };

    try {
      await window.storage.set(`game:${gameCode}`, JSON.stringify(updated), true);
      setGameState(updated);
    } catch (error) {
      alert('Error submitting answers: ' + error.message);
    }
  };

  // Grade answer and update score
  const gradeAnswer = async (team, roundIndex, questionIndex, isCorrect) => {
    const updated = { ...gameState };
    const question = gameState.rounds[roundIndex].questions[questionIndex];
    const answerKey = `${roundIndex}-${questionIndex}`;
    
    if (updated.teams[team].answers[answerKey]) {
      updated.teams[team].answers[answerKey].isCorrect = isCorrect;
      
      // Recalculate round score
      let roundScore = 0;
      gameState.rounds[roundIndex].questions.forEach((q, idx) => {
        const key = `${roundIndex}-${idx}`;
        if (updated.teams[team].answers[key]?.isCorrect) {
          roundScore += q.points;
        }
      });
      
      updated.teams[team].scores[roundIndex] = roundScore;
      
      // Recalculate total score
      updated.teams[team].totalScore = updated.teams[team].scores.reduce((a, b) => a + b, 0);
    }
    
    try {
      await window.storage.set(`game:${gameCode}`, JSON.stringify(updated), true);
      setGameState(updated);
    } catch (error) {
      alert('Error grading answer: ' + error.message);
    }
  };

  // Check if team has submitted all answers for current round
  const hasTeamSubmittedAll = (team, roundIndex) => {
    if (!team || !team.answers) return false;
    
    const round = gameState.rounds[roundIndex];
    let submittedCount = 0;
    
    round.questions.forEach((_, qIdx) => {
      const answerKey = `${roundIndex}-${qIdx}`;
      if (team.answers[answerKey]) {
        submittedCount++;
      }
    });
    
    return submittedCount === round.questions.length;
  };

  // Auto-refresh for players and admin
  useEffect(() => {
    if (view === 'player' || view === 'admin') {
      const interval = setInterval(loadGameState, 2000);
      return () => clearInterval(interval);
    }
  }, [view, gameCode]);

  // Setup helpers
  const addRound = () => {
    setSetupData({
      ...setupData,
      rounds: [...setupData.rounds, {
        name: `Round ${setupData.rounds.length + 1}`,
        theme: '',
        questions: [{ question: '', answer: '', points: 10 }]
      }]
    });
  };

  const addQuestion = (roundIndex) => {
    const newRounds = [...setupData.rounds];
    newRounds[roundIndex].questions.push({ question: '', answer: '', points: 10 });
    setSetupData({ ...setupData, rounds: newRounds });
  };

  const updateRound = (roundIndex, field, value) => {
    const newRounds = [...setupData.rounds];
    newRounds[roundIndex][field] = value;
    setSetupData({ ...setupData, rounds: newRounds });
  };

  const updateQuestion = (roundIndex, questionIndex, field, value) => {
    const newRounds = [...setupData.rounds];
    newRounds[roundIndex].questions[questionIndex][field] = value;
    setSetupData({ ...setupData, rounds: newRounds });
  };

  const deleteRound = (roundIndex) => {
    const newRounds = setupData.rounds.filter((_, i) => i !== roundIndex);
    setSetupData({ ...setupData, rounds: newRounds });
  };

  const deleteQuestion = (roundIndex, questionIndex) => {
    const newRounds = [...setupData.rounds];
    newRounds[roundIndex].questions = newRounds[roundIndex].questions.filter((_, i) => i !== questionIndex);
    setSetupData({ ...setupData, rounds: newRounds });
  };

  // HOME VIEW
  if (view === 'home') {
    // Show loading while storage initializes
    if (!storageReady) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Live Trivia</h1>
            <p className="text-gray-600">Host or join a game</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView('setup')}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Game
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Game Code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
              />
              <input
                type="text"
                placeholder="Team Name (required for player)"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={joinGame}
                disabled={isLoading || !gameCode || !teamName}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Joining...' : 'Join as Player'}
              </button>
              <button
                onClick={async () => {
                  if (!gameCode) {
                    alert('Please enter a game code');
                    return;
                  }
                  
                  try {
                    setIsLoading(true);
                    const upperGameCode = gameCode.toUpperCase();
                    const result = await window.storage.get(`game:${upperGameCode}`, true);
                    if (!result) {
                      alert('Game not found. Please check the game code.');
                      setIsLoading(false);
                      return;
                    }

                    const game = JSON.parse(result.value);
                    setGameCode(upperGameCode);
                    setGameState(game);
                    
                    // Update URL
                    window.history.pushState({}, '', `?code=${upperGameCode}&role=admin`);
                    
                    setView('admin');
                  } catch (error) {
                    alert('Error loading game: ' + error.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading || !gameCode}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Join as Admin'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SETUP VIEW
  if (view === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Create Your Game</h2>
            <input
              type="text"
              placeholder="Game Name"
              value={setupData.gameName}
              onChange={(e) => setSetupData({ ...setupData, gameName: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4 text-sm sm:text-base"
            />

            {setupData.rounds.map((round, roundIndex) => (
              <div key={roundIndex} className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <input
                    type="text"
                    value={round.name}
                    onChange={(e) => updateRound(roundIndex, 'name', e.target.value)}
                    className="text-lg sm:text-xl font-semibold border-b border-gray-300 focus:border-purple-500 outline-none flex-1 mr-2"
                  />
                  <button
                    onClick={() => deleteRound(roundIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Theme (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 80s Movies, World Geography"
                    value={round.theme}
                    onChange={(e) => updateRound(roundIndex, 'theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  />
                </div>

                {round.questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Q{qIndex + 1}</span>
                      <button
                        onClick={() => deleteQuestion(roundIndex, qIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Question"
                      value={q.question}
                      onChange={(e) => updateQuestion(roundIndex, qIndex, 'question', e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg mb-2 text-sm sm:text-base"
                    />
                    <input
                      type="text"
                      placeholder="Answer"
                      value={q.answer}
                      onChange={(e) => updateQuestion(roundIndex, qIndex, 'answer', e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg mb-2 text-sm sm:text-base"
                    />
                    <input
                      type="number"
                      placeholder="Points"
                      value={q.points}
                      onChange={(e) => updateQuestion(roundIndex, qIndex, 'points', parseInt(e.target.value))}
                      className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                    />
                  </div>
                ))}

                <button
                  onClick={() => addQuestion(roundIndex)}
                  className="text-purple-600 hover:text-purple-800 text-xs sm:text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  Add Question
                </button>
              </div>
            ))}

            <button
              onClick={addRound}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 sm:py-3 text-gray-600 hover:border-purple-500 hover:text-purple-600 transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add Round
            </button>

            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setView('home')}
                className="flex-1 bg-gray-200 text-gray-700 py-2 sm:py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={createGame}
                disabled={isLoading || !setupData.gameName}
                className="flex-1 bg-purple-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 text-sm sm:text-base"
              >
                {isLoading ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  if (view === 'admin' && gameState) {
    const currentRound = gameState.rounds[gameState.currentRound];

    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto">
          {/* Restart Confirmation Modal */}
          {showRestartConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Restart Game?</h3>
                <p className="text-gray-600 mb-6">
                  This will reset all teams and scores. The game code will stay the same so new teams can join.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRestartConfirm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={restartGame}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Restart Game
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Team Confirmation Modal */}
          {teamToRemove && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Remove Team?</h3>
                <p className="text-gray-600 mb-6">
                  Remove team "{teamToRemove}" from the game?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTeamToRemove(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => removeTeam(teamToRemove)}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Remove Team
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{gameState.name}</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Game Code: <span className="font-mono font-bold text-purple-600 text-xl sm:text-2xl">{gameState.code}</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {gameState.status === 'lobby' && (
                <>
                  <button
                    onClick={startRound}
                    className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    Start Round {gameState.currentRound + 1}
                  </button>
                  {gameState.currentRound === 0 && (
                    <>
                      <button
                        onClick={() => setShowRestartConfirm(true)}
                        className="bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                        Restart Game
                      </button>
                      <button
                        onClick={startEditingQuestions}
                        className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        Edit Questions
                      </button>
                    </>
                  )}
                </>
              )}
              {gameState.status === 'active' && (
                <button
                  onClick={reviewRound}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-sm sm:text-base"
                >
                  Review Answers
                </button>
              )}
              {gameState.status === 'reviewing' && (
                <button
                  onClick={endRound}
                  className="bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                  {gameState.currentRound < gameState.rounds.length - 1 ? 'Next Round' : 'End Game'}
                </button>
              )}
              {gameState.status === 'completed' && (
                <button
                  onClick={() => setShowRestartConfirm(true)}
                  className="bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                  Restart Game
                </button>
              )}
              <span className="text-sm sm:text-base text-gray-600 font-semibold text-center sm:text-left">
                Round {gameState.currentRound + 1} of {gameState.rounds.length}
              </span>
            </div>
          </div>

          {/* Edit Questions Modal */}
          {isEditingQuestions && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-4xl w-full my-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Questions</h3>
                  <button
                    onClick={() => setIsEditingQuestions(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto mb-4">
                  {editedRounds.map((round, roundIndex) => (
                    <div key={roundIndex} className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <input
                          type="text"
                          value={round.name}
                          onChange={(e) => updateEditedRound(roundIndex, 'name', e.target.value)}
                          className="text-lg sm:text-xl font-semibold border-b border-gray-300 focus:border-purple-500 outline-none flex-1 mr-2"
                        />
                        <button
                          onClick={() => deleteEditedRound(roundIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>

                      <div className="mb-3 sm:mb-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Theme (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 80s Movies, World Geography"
                          value={round.theme}
                          onChange={(e) => updateEditedRound(roundIndex, 'theme', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                        />
                      </div>

                      {round.questions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">Q{qIndex + 1}</span>
                            <button
                              onClick={() => deleteEditedQuestion(roundIndex, qIndex)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Question"
                            value={q.question}
                            onChange={(e) => updateEditedQuestion(roundIndex, qIndex, 'question', e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg mb-2 text-sm sm:text-base"
                          />
                          <input
                            type="text"
                            placeholder="Answer"
                            value={q.answer}
                            onChange={(e) => updateEditedQuestion(roundIndex, qIndex, 'answer', e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg mb-2 text-sm sm:text-base"
                          />
                          <input
                            type="number"
                            placeholder="Points"
                            value={q.points}
                            onChange={(e) => updateEditedQuestion(roundIndex, qIndex, 'points', parseInt(e.target.value))}
                            className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                          />
                        </div>
                      ))}

                      <button
                        onClick={() => addEditedQuestion(roundIndex)}
                        className="text-purple-600 hover:text-purple-800 text-xs sm:text-sm font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        Add Question
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addEditedRound}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 sm:py-3 text-gray-600 hover:border-purple-500 hover:text-purple-600 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Add Round
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditingQuestions(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedQuestions}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Team Submission Status */}
          {gameState.status === 'active' && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Submission Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                {Object.entries(gameState.teams).map(([teamId, team]) => {
                  const allSubmitted = hasTeamSubmittedAll(team, gameState.currentRound);
                  return (
                    <div key={teamId} className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg ${allSubmitted ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      {allSubmitted ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`font-medium text-xs sm:text-sm ${allSubmitted ? 'text-green-800' : 'text-gray-700'}`}>
                        {team.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review/Grading View */}
          {gameState.status === 'reviewing' && currentRound && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{currentRound.name}</h2>
                {currentRound.theme && (
                  <p className="text-purple-600 font-medium mt-1 text-sm sm:text-base">{currentRound.theme}</p>
                )}
              </div>

              {currentRound.questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">Question {qIdx + 1}</p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900">{q.question}</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ml-2">
                        {q.points} pts
                      </span>
                    </div>
                    <p className="text-green-700 font-medium text-sm sm:text-base">Correct Answer: {q.answer}</p>
                  </div>

                  {/* Team answers */}
                  <div className="space-y-2">
                    {Object.entries(gameState.teams).map(([teamId, team]) => {
                      const answerKey = `${gameState.currentRound}-${qIdx}`;
                      const teamAnswer = team.answers[answerKey];
                      
                      if (!teamAnswer) return null;

                      return (
                        <div key={teamId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-lg gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{team.name}</p>
                            <p className="text-gray-700 text-sm break-words">{teamAnswer.answer}</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => gradeAnswer(teamId, gameState.currentRound, qIdx, true)}
                              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                                teamAnswer.isCorrect === true
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                              }`}
                            >
                              ✓ Correct
                            </button>
                            <button
                              onClick={() => gradeAnswer(teamId, gameState.currentRound, qIdx, false)}
                              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                                teamAnswer.isCorrect === false
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                              }`}
                            >
                              ✗ Wrong
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Round Questions (Active Mode) */}
          {gameState.status === 'active' && currentRound && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{currentRound.name}</h2>
                {currentRound.theme && (
                  <p className="text-purple-600 font-medium mt-1 text-sm sm:text-base">{currentRound.theme}</p>
                )}
              </div>
              <div className="space-y-3 sm:space-y-4">
                {currentRound.questions.map((q, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">Question {idx + 1}</p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{q.question}</p>
                        <p className="text-green-700 text-sm sm:text-base">Answer: {q.answer}</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ml-2">
                        {q.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams & Scores */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {gameState.status === 'lobby' && gameState.currentRound === 0 ? 'Teams Waiting' : 'Leaderboard'}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(gameState.teams)
                .sort(([, a], [, b]) => b.totalScore - a.totalScore)
                .map(([teamId, team]) => (
                <div key={teamId} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{team.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600">
                        {team.totalScore} pts
                      </div>
                      {gameState.status === 'lobby' && gameState.currentRound === 0 && (
                        <button
                          onClick={() => setTeamToRemove(teamId)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove team"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Round scores */}
                  {gameState.currentRound > 0 || gameState.status !== 'lobby' ? (
                    <div className="flex gap-1 sm:gap-2 mt-3 overflow-x-auto">
                      {team.scores.map((score, idx) => (
                        <div key={idx} className="flex-shrink-0 min-w-0">
                          <label className="block text-xs text-gray-600 mb-1">R{idx + 1}</label>
                          <div className="w-12 sm:w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded text-center font-semibold text-sm">
                            {score}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {Object.keys(gameState.teams).length === 0 && (
                <p className="text-center text-gray-500 py-8">No teams have joined yet. Share the game code!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAYER VIEW
  if (view === 'player' && gameState) {
    const currentRound = gameState.rounds[gameState.currentRound];
    const myTeam = gameState.teams[teamName];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 sm:p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 text-white">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">{gameState.name}</h1>
            <div className="flex items-center justify-between">
              <p className="text-purple-200 text-sm sm:text-base">Team: {teamName}</p>
              <p className="text-xl sm:text-2xl font-bold">{myTeam?.totalScore} pts</p>
            </div>
          </div>

          {/* Active Round - Questions */}
          {gameState.status === 'active' && currentRound ? (
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{currentRound.name}</h2>
                {currentRound.theme && (
                  <p className="text-purple-600 font-medium mt-1 text-sm sm:text-base">{currentRound.theme}</p>
                )}
              </div>
              
              <div className="space-y-4 sm:space-y-6">
                {currentRound.questions.map((q, idx) => {
                  const answerKey = `${gameState.currentRound}-${idx}`;
                  const hasAnswered = myTeam?.answers[answerKey];
                  
                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Question {idx + 1}</p>
                          <p className="text-base sm:text-lg font-semibold text-gray-900">{q.question}</p>
                        </div>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold ml-2">
                          {q.points} pts
                        </span>
                      </div>

                      <input
                        type="text"
                        placeholder="Your answer..."
                        id={`answer-${idx}`}
                        defaultValue={hasAnswered?.answer || ''}
                        disabled={!!hasAnswered}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 text-sm sm:text-base"
                      />
                    </div>
                  );
                })}
              </div>

              {!hasTeamSubmittedAll(myTeam, gameState.currentRound) ? (
                <button
                  onClick={submitRoundAnswers}
                  className="w-full mt-4 sm:mt-6 bg-purple-600 text-white py-3 sm:py-4 rounded-lg font-semibold hover:bg-purple-700 transition text-base sm:text-lg"
                >
                  Submit All Answers
                </button>
              ) : (
                <div className="mt-4 sm:mt-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-green-800 font-semibold text-sm sm:text-base">✓ Answers Submitted</p>
                  <p className="text-green-600 text-xs sm:text-sm mt-1">Waiting for other teams...</p>
                </div>
              )}
            </div>
          ) : gameState.status === 'reviewing' && currentRound ? (
            /* Review Mode - Show Results */
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{currentRound.name} - Results</h2>
                {currentRound.theme && (
                  <p className="text-purple-600 font-medium mt-1 text-sm sm:text-base">{currentRound.theme}</p>
                )}
              </div>

              <div className="space-y-4 sm:space-y-6">
                {currentRound.questions.map((q, idx) => {
                  const answerKey = `${gameState.currentRound}-${idx}`;
                  const teamAnswer = myTeam?.answers[answerKey];
                  
                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Question {idx + 1}</p>
                          <p className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{q.question}</p>
                        </div>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold ml-2">
                          {q.points} pts
                        </span>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                        <p className="text-green-800 font-semibold text-xs sm:text-sm">Correct Answer:</p>
                        <p className="text-green-700 text-xs sm:text-sm mt-1">{q.answer}</p>
                      </div>

                      {teamAnswer && (
                        <div className={`rounded-lg p-2 sm:p-3 ${
                          teamAnswer.isCorrect === true
                            ? 'bg-green-50 border border-green-200'
                            : teamAnswer.isCorrect === false
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <p className={`font-semibold text-xs sm:text-sm ${
                            teamAnswer.isCorrect === true
                              ? 'text-green-800'
                              : teamAnswer.isCorrect === false
                              ? 'text-red-800'
                              : 'text-gray-800'
                          }`}>
                            Your Answer: {
                              teamAnswer.isCorrect === true
                                ? '✓ Correct'
                                : teamAnswer.isCorrect === false
                                ? '✗ Incorrect'
                                : 'Pending Review'
                            }
                          </p>
                          <p className={`text-xs sm:text-sm mt-1 ${
                            teamAnswer.isCorrect === true
                              ? 'text-green-700'
                              : teamAnswer.isCorrect === false
                              ? 'text-red-700'
                              : 'text-gray-700'
                          }`}>
                            {teamAnswer.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Round Score */}
              <div className="mt-4 sm:mt-6 bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-purple-800 font-semibold mb-1 text-sm sm:text-base">Round {gameState.currentRound + 1} Score</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-900">{myTeam?.scores[gameState.currentRound]} pts</p>
              </div>
            </div>
          ) : (
            /* Waiting Room */
            <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-12 text-center">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {gameState.status === 'lobby' ? 'Waiting for next round...' : 'Game Complete!'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {gameState.status === 'lobby' 
                  ? 'The host will start the round soon'
                  : 'Thanks for playing!'}
              </p>
              
              {/* Final Leaderboard */}
              {gameState.status === 'completed' && (
                <div className="mt-6 sm:mt-8">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Final Standings</h3>
                  <div className="space-y-2">
                    {Object.entries(gameState.teams)
                      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
                      .map(([teamId, team], index) => (
                        <div key={teamId} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                          teamId === teamName ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xl sm:text-2xl font-bold text-gray-400">#{index + 1}</span>
                            <span className="font-semibold text-gray-900 text-sm sm:text-base">{team.name}</span>
                          </div>
                          <span className="text-lg sm:text-xl font-bold text-purple-600">{team.totalScore} pts</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default TriviaGame;