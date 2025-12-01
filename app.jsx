import React, { useState, useEffect } from 'react';
import { Trophy, Users, Plus, UserPlus, Play, Medal, Building2, Trash2, ArrowRight, Activity, Sparkles, Wand2, X, MessageSquare } from 'lucide-react';

// --- API Helper ---

const callGemini = async (prompt) => {
  const apiKey = ""; // Injected at runtime
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI is taking a nap...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The AI commentator is out for a snack. Try again!";
  }
};

// --- Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, loading = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg relative overflow-hidden";
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500",
    secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600",
    success: "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30",
    ghost: "bg-transparent text-gray-400 hover:text-white",
    magic: "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 border border-white/20"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${className} ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, icon: Icon }) => (
  <div className="relative w-full">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />}
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
    />
  </div>
);

// --- Main Application ---

export default function BowlingApp() {
  const [activeTab, setActiveTab] = useState('registration'); // registration | bracket
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]); // Flat array of all matches
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerCompany, setNewPlayerCompany] = useState('');
  const [tournamentStarted, setTournamentStarted] = useState(false);
  
  // AI States
  const [isGeneratingNickname, setIsGeneratingNickname] = useState(false);
  const [activeCommentary, setActiveCommentary] = useState(null); // { matchId, text }
  const [isLoadingCommentary, setIsLoadingCommentary] = useState(false);

  // Branding Colors
  const BRAND_GRADIENT = "bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900";

  // --- Logic ---

  const generateNickname = async () => {
    if (!newPlayerName.trim()) return;
    setIsGeneratingNickname(true);
    
    const companyContext = newPlayerCompany ? `who works at ${newPlayerCompany}` : "who is a tech enthusiast";
    const prompt = `Generate a short, cool, crypto-themed or bowling-themed nickname for someone named "${newPlayerName}" ${companyContext}. 
    Format ONLY the nickname. Examples: "The Block Striker", "Captain Consensus", "Gutter Guardian". 
    Make it fun and edgy. Return just the nickname text.`;

    const nickname = await callGemini(prompt);
    // Clean up quotes if AI adds them
    const cleanNickname = nickname.replace(/^["']|["']$/g, '');
    setNewPlayerName(`${newPlayerName} "${cleanNickname}"`);
    setIsGeneratingNickname(false);
  };

  const generateMatchHype = async (match) => {
    if (!match.p2) return; // Don't hype a bye
    setIsLoadingCommentary(match.id);
    setActiveCommentary(null);

    const p1Desc = `${match.p1.name} from ${match.p1.company}`;
    const p2Desc = `${match.p2.name} from ${match.p2.company}`;

    const prompt = `Write a 2-sentence energetic, "sports announcer" style hype commentary for a bowling match between ${p1Desc} and ${p2Desc}. 
    Use bowling puns or crypto puns. Keep it under 40 words. Make it sound like a live broadcast intro.`;

    const commentary = await callGemini(prompt);
    setActiveCommentary({ matchId: match.id, text: commentary });
    setIsLoadingCommentary(false);
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    
    const newPlayer = {
      id: Date.now().toString(),
      name: newPlayerName,
      company: newPlayerCompany || 'Freelance',
      isEliminated: false
    };

    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerCompany('');

    if (tournamentStarted) {
      handleLateJoiner(newPlayer);
    }
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startTournament = () => {
    if (players.length < 2) return;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const round1Matches = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
      round1Matches.push({
        id: `m-1-${i}`,
        round: 1,
        p1: shuffled[i],
        p2: shuffled[i + 1] || null,
        winner: null,
        score1: '',
        score2: ''
      });
    }

    setMatches(round1Matches);
    setTournamentStarted(true);
    setActiveTab('bracket');
  };

  const handleLateJoiner = (player) => {
    const currentMatches = [...matches];
    const byeMatchIndex = currentMatches.findIndex(m => m.round === 1 && m.p2 === null && !m.winner);

    if (byeMatchIndex !== -1) {
      currentMatches[byeMatchIndex].p2 = player;
      setMatches(currentMatches);
    } else {
      const newMatchId = `m-1-${Date.now()}`;
      currentMatches.push({
        id: newMatchId,
        round: 1,
        p1: player,
        p2: null,
        winner: null,
        score1: '',
        score2: ''
      });
      setMatches(currentMatches);
    }
  };

  const setWinner = (matchId, winnerPlayer) => {
    if (!winnerPlayer) return;
    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, winner: winnerPlayer } : m);
    setMatches(updatedMatches);
  };

  const generateNextRound = () => {
    const rounds = matches.map(m => m.round);
    const currentMaxRound = Math.max(...rounds);
    
    let winners = matches
      .filter(m => m.round === currentMaxRound)
      .map(m => m.winner ? m.winner : (m.p2 === null ? m.p1 : null))
      .filter(Boolean);

    if (winners.length < 2) {
      alert("Finish all matches in the current round first!");
      return;
    }

    const nextRoundMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
      nextRoundMatches.push({
        id: `m-${currentMaxRound + 1}-${i}`,
        round: currentMaxRound + 1,
        p1: winners[i],
        p2: winners[i + 1] || null,
        winner: null,
        score1: '',
        score2: ''
      });
    }

    setMatches([...matches, ...nextRoundMatches]);
  };

  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const maxRound = Math.max(...(matches.map(m => m.round).length ? matches.map(m => m.round) : [0]));

  return (
    <div className={`min-h-screen ${BRAND_GRADIENT} text-white font-sans selection:bg-cyan-500 selection:text-white pb-20`}>
      
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              NodeOps & XDC
            </div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter">
              PROOF OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">BUILD</span>
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-300">Bowling Tournament</p>
            <p className="text-xs text-gray-500">Dec 1st • Chill Session</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-8">
        
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-gray-800/50 rounded-xl mb-8 backdrop-blur-sm border border-white/5">
          <button
            onClick={() => setActiveTab('registration')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
              ${activeTab === 'registration' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <UserPlus size={18} />
            Lobby & Players
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            disabled={!tournamentStarted}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
              ${activeTab === 'bracket' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400'}
              ${!tournamentStarted ? 'opacity-50 cursor-not-allowed' : 'hover:text-white'}`}
          >
            <Trophy size={18} />
            Tournament Bracket
          </button>
        </div>

        {activeTab === 'registration' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Add Player Form */}
            <div className="bg-gray-800/40 border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
               {/* Decorative glow */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"></div>

              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                <Plus className="text-green-400" />
                Add Participant
              </h2>
              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 flex gap-2">
                    <Input 
                      value={newPlayerName} 
                      onChange={setNewPlayerName} 
                      placeholder="Player Name" 
                      icon={Users} 
                    />
                    <Button 
                      onClick={generateNickname} 
                      variant="magic" 
                      disabled={!newPlayerName.trim()}
                      loading={isGeneratingNickname}
                      className="px-3"
                      title="Generate Crypto Nickname"
                    >
                      <Wand2 size={18} />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <Input 
                      value={newPlayerCompany} 
                      onChange={setNewPlayerCompany} 
                      placeholder="Company (NodeOps, XDC...)" 
                      icon={Building2} 
                    />
                  </div>
                </div>
                
                <Button onClick={addPlayer} variant="success" className="w-full md:w-auto self-start">
                  {tournamentStarted ? 'Join Late' : 'Add Player'}
                </Button>
              </div>
              {tournamentStarted && (
                <p className="mt-3 text-xs text-yellow-400/80 flex items-center gap-1 relative z-10">
                  <Activity size={12} />
                  Tournament is live! New players will be added to Round 1 via Byes or new matches.
                </p>
              )}
            </div>

            {/* Player List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 font-medium text-sm uppercase tracking-wider">
                  Registered ({players.length})
                </h3>
                {!tournamentStarted && players.length > 0 && (
                  <Button onClick={startTournament} variant="primary">
                    <Play size={16} fill="currentColor" /> Start Tournament
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((player) => (
                  <div key={player.id} className="bg-gray-800/30 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg text-white">
                        {player.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-lg truncate">{player.name}</div>
                        <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full inline-block">
                          {player.company}
                        </div>
                      </div>
                    </div>
                    {!tournamentStarted && (
                      <button 
                        onClick={() => removePlayer(player.id)}
                        className="text-gray-600 hover:text-red-400 p-2 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                {players.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                    Add players to get the bowling rolling! 🎳
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20 relative">
            
            {/* AI Commentary Popover */}
            {activeCommentary && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="bg-gradient-to-r from-purple-900/90 to-indigo-900/90 backdrop-blur-xl border border-purple-500/30 p-4 rounded-2xl shadow-2xl relative">
                  <button 
                    onClick={() => setActiveCommentary(null)}
                    className="absolute top-2 right-2 text-purple-200 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg h-fit">
                      <Sparkles className="text-purple-300 w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">AI MatchCaster</h4>
                      <p className="text-sm text-white leading-relaxed italic">"{activeCommentary.text}"</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Round Navigation / Controls */}
            <div className="flex items-center justify-between mb-6 sticky top-24 z-30 bg-gray-900/90 p-4 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
              <div>
                <h2 className="font-bold text-xl">Current Round: {maxRound}</h2>
                <p className="text-xs text-gray-400">Tap a player to declare winner</p>
              </div>
              <Button onClick={generateNextRound} variant="secondary" className="text-xs md:text-sm">
                Next Round <ArrowRight size={16} />
              </Button>
            </div>

            <div className="flex gap-8 overflow-x-auto pb-8 snap-x">
              {Object.keys(matchesByRound).map((round) => (
                <div key={round} className="min-w-[320px] snap-center">
                  <div className="bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-t-lg border-t border-x border-cyan-500/20 text-center">
                    Round {round}
                  </div>
                  <div className="bg-gray-800/20 border-x border-b border-white/5 p-4 rounded-b-lg space-y-4 min-h-[200px]">
                    {matchesByRound[round].map((match) => (
                      <div key={match.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg relative">
                        {match.winner && (
                          <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center pointer-events-none">
                            <Medal className="text-yellow-400 w-12 h-12 opacity-20" />
                          </div>
                        )}
                        
                        {/* Hype Button for upcoming matches */}
                        {match.p2 && !match.winner && (
                          <div className="absolute top-2 right-2 z-20">
                            <button
                              onClick={(e) => { e.stopPropagation(); generateMatchHype(match); }}
                              disabled={isLoadingCommentary === match.id}
                              className="p-1.5 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-all transform hover:scale-110"
                              title="Generate AI Commentary"
                            >
                              {isLoadingCommentary === match.id ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                            </button>
                          </div>
                        )}
                        
                        {/* Player 1 */}
                        <div 
                          onClick={() => !match.winner && setWinner(match.id, match.p1)}
                          className={`p-3 flex justify-between items-center cursor-pointer transition-all border-b border-gray-700/50
                            ${match.winner?.id === match.p1.id ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40' : 'hover:bg-gray-700'}
                            ${match.winner && match.winner.id !== match.p1.id ? 'opacity-30' : ''}
                          `}
                        >
                          <div>
                            <span className={`font-bold block ${match.winner?.id === match.p1.id ? 'text-green-400' : 'text-white'}`}>
                              {match.p1.name}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase">{match.p1.company}</span>
                          </div>
                          {match.winner?.id === match.p1.id && <Trophy size={16} className="text-yellow-400" />}
                        </div>

                        {/* VS Divider */}
                        <div className="bg-black/20 text-center py-1 text-[10px] text-gray-500 font-mono tracking-widest relative">
                          VS
                        </div>

                        {/* Player 2 */}
                        {match.p2 ? (
                          <div 
                            onClick={() => !match.winner && setWinner(match.id, match.p2)}
                            className={`p-3 flex justify-between items-center cursor-pointer transition-all 
                              ${match.winner?.id === match.p2.id ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40' : 'hover:bg-gray-700'}
                              ${match.winner && match.winner.id !== match.p2.id ? 'opacity-30' : ''}
                            `}
                          >
                            <div>
                              <span className={`font-bold block ${match.winner?.id === match.p2.id ? 'text-green-400' : 'text-white'}`}>
                                {match.p2.name}
                              </span>
                              <span className="text-[10px] text-gray-500 uppercase">{match.p2.company}</span>
                            </div>
                            {match.winner?.id === match.p2.id && <Trophy size={16} className="text-yellow-400" />}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-900/50 text-gray-500 text-sm italic flex justify-between items-center">
                            Waiting for opponent (Bye)
                            <span className="text-[10px] border border-gray-600 px-1 rounded">AUTO WIN</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Player Shortcut for Bracket View */}
            <div className="fixed bottom-6 right-6">
              <button 
                onClick={() => setActiveTab('registration')}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold p-4 rounded-full shadow-2xl shadow-cyan-500/20 transition-all transform hover:scale-105"
              >
                <Plus size={24} />
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
