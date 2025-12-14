import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Camera, 
  Users, 
  Play, 
  Loader2, 
  Copy, 
  LogOut,
  XCircle,
  RotateCcw,
  Square,
  Trophy,
  Monitor,
  X 
} from 'lucide-react';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAO3Fhu7_e1Myj2MMqvA3BoAVFCCc-t5qo",
  authDomain: "camspin-5bb72.firebaseapp.com",
  projectId: "camspin-5bb72",
  storageBucket: "camspin-5bb72.firebasestorage.app",
  messagingSenderId: "680699453422",
  appId: "1:680699453422:web:39b206d3482ba2c92cb8ff"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'camspin-game-v1';

// --- STYLES (Tailwind Wrapper) ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-purple-900/50",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-lg",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/50 shadow-red-900/20",
    success: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 shadow-emerald-900/20"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl ${className}`}>
    {children}
  </div>
);

// --- MAIN COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  
  // Auth Setup
  useEffect(() => {
    const initAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Authentication failed:", e);
            setError("Could not connect to authentication server.");
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const goHome = () => {
    setView('home');
    setError('');
    setRoomCode('');
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500" />
      <span className="ml-3">Connecting to Game Server...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-fuchsia-500/30 overflow-x-hidden">
      {/* Background Gradient Blob */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-900/20 blur-[100px] rounded-full pointer-events-none -z-0" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-gradient-to-tr from-fuchsia-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">CamSpin</h1>
          </div>
        </header>

        {view === 'home' && (
          <HomeScreen 
            onHost={() => setView('host')} 
            onJoin={(code) => { 
                setRoomCode(code); 
                setView('player'); 
            }}
            onRejoin={(code, role) => {
                setRoomCode(code);
                setView(role === 'host' ? 'host' : 'player');
            }}
          />
        )}
        
        {view === 'host' && (
          <HostRoom userId={user.uid} onError={(e) => setError(e)} onExit={goHome} />
        )}
        
        {view === 'player' && (
          <PlayerRoom userId={user.uid} initialRoomCode={roomCode} onError={(e) => setError(e)} onExit={goHome} />
        )}

        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-xl backdrop-blur-md animate-bounce flex items-center gap-3 z-50">
            <XCircle size={20} />
            {error}
            <button onClick={() => setError('')} className="ml-2 opacity-50 hover:opacity-100"><XCircle size={16}/></button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- HOME SCREEN ---
function HomeScreen({ onHost, onJoin, onRejoin }) {
  const [code, setCode] = useState('');
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    // Check for previous session
    const saved = localStorage.getItem('camspin_session');
    if (saved) {
        setLastSession(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-12 space-y-4">
        <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400 drop-shadow-2xl">
          Spin the Squad
        </h2>
        <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto">
          The ultimate visual player picker. Snap a selfie, watch the shuffle, and capture the winner's reaction instantly.
        </p>
      </div>

      {lastSession && (
        <div className="mb-8 w-full max-w-md animate-in slide-in-from-top fade-in duration-500">
            <Button 
                variant="success" 
                className="w-full py-4 text-lg border-emerald-500/50"
                onClick={() => onRejoin(lastSession.code, lastSession.role)}
            >
                <RotateCcw size={20} />
                Rejoin Room {lastSession.code} ({lastSession.role === 'host' ? 'HOST' : 'PLAYER'})
            </Button>
            <button 
                onClick={() => {
                    localStorage.removeItem('camspin_session');
                    setLastSession(null);
                }}
                className="text-xs text-slate-500 mt-2 hover:text-slate-300 underline"
            >
                Forget this session
            </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
        {/* Host Card */}
        <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <button 
                onClick={onHost}
                className="relative w-full h-full bg-slate-900 border border-white/10 p-12 rounded-2xl flex flex-col items-center justify-center gap-6 hover:bg-slate-800 transition-all text-center group-hover:scale-[1.02]"
            >
                <div className="w-20 h-20 bg-fuchsia-500/10 rounded-full flex items-center justify-center group-hover:bg-fuchsia-500/20 transition-colors">
                    <Play className="w-10 h-10 text-fuchsia-400 fill-fuchsia-400" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Host Game</h3>
                    <p className="text-slate-400">Create a room & shuffle cards</p>
                </div>
            </button>
        </div>

        {/* Join Card */}
        <Card className="flex flex-col items-center justify-center gap-6 p-12">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="text-center w-full">
                <h3 className="text-2xl font-bold text-white mb-6">Join Game</h3>
                <div className="space-y-3 w-full">
                    <input 
                        type="text" 
                        placeholder="ENTER ROOM CODE" 
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                        maxLength={4}
                        className="w-full bg-slate-950 border border-slate-700 text-center text-2xl tracking-widest font-mono py-4 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-700 uppercase text-white transition-all"
                    />
                    <Button 
                        variant="secondary" 
                        className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-500 border-none text-white shadow-lg shadow-indigo-900/20"
                        onClick={() => code.length >= 3 && onJoin(code)}
                        disabled={code.length < 3}
                    >
                        Enter Room
                    </Button>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
}

// --- HOST ROOM ---
function HostRoom({ userId, onError, onExit }) {
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerId, setWinnerId] = useState(null);
  const [forceStop, setForceStop] = useState(false);
  
  const carouselRef = useRef();
  
  // Create or Recover Room on Mount
  useEffect(() => {
    const initRoom = async () => {
      // Check if we are recovering a session
      const saved = localStorage.getItem('camspin_session');
      if (saved) {
          const session = JSON.parse(saved);
          if (session.role === 'host') {
              setRoomCode(session.code);
              return;
          }
      }

      // Create new room
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code), {
          hostId: userId,
          status: 'waiting',
          createdAt: serverTimestamp(),
          winnerId: null
        });
        setRoomCode(code);
        // Save session
        localStorage.setItem('camspin_session', JSON.stringify({ code, role: 'host' }));
      } catch (e) {
        console.error("Error creating room:", e);
        onError("Could not create room. Try again.");
      }
    };
    if (!roomCode) initRoom();
  }, [userId, onError, roomCode]);

  // Listen for players
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players'), 
      (snapshot) => {
        const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPlayers(pList);
      }, 
      (err) => console.error("Player listener error", err)
    );
    return () => unsub();
  }, [roomCode]);

  // Listen for winner updates
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setWinnerId(data.winnerId || null);
        }
      },
      (err) => console.error("Room listener error", err)
    );
    return () => unsub();
  }, [roomCode]);

  // Clean exit (End Game)
  const handleHostExit = async () => {
    if (window.confirm("Are you sure? This will end the game for everyone.")) {
        try {
            if (roomCode) {
                // Delete the room document - this signals players to leave
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode));
            }
            localStorage.removeItem('camspin_session');
            onExit();
        } catch (e) {
            console.error("Error closing room", e);
            onExit();
        }
    }
  };

  // Spin Logic
  const handleSpin = async () => {
    if (players.length < 2) {
      onError("Need at least 2 players to shuffle!");
      return;
    }
    
    setIsSpinning(true);
    setWinnerId(null);
    setForceStop(false);
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
        status: 'spinning',
        winnerId: null
    });
  };

  const handleForceStop = () => {
    setForceStop(true);
    if (carouselRef.current) {
      carouselRef.current.stopImmediately();
    }
  };

  const handleSpinComplete = async (winningPlayer) => {
    setIsSpinning(false);
    setForceStop(false);
    setWinnerId(winningPlayer.id);
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
        status: 'finished',
        winnerId: winningPlayer.id
    });
  };

  // Get current winner from players array (this will be live)
  const winner = winnerId ? players.find(p => p.id === winnerId) : null;

  if (!roomCode) return <div className="text-center pt-20"><Loader2 className="animate-spin w-12 h-12 mx-auto text-fuchsia-500"/></div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full animate-in fade-in duration-500">
      {/* Sidebar: Players List */}
      <Card className="lg:w-1/4 h-[40vh] lg:h-[70vh] flex flex-col order-2 lg:order-1">
        <div className="mb-6 pb-6 border-b border-white/10">
            <h3 className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-2">Room Code</h3>
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-dashed border-slate-700">
                <span className="text-4xl font-mono font-black text-white tracking-widest">{roomCode}</span>
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(roomCode);
                    }}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    <Copy size={20} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Players ({players.length})</h3>
                <span className="text-xs text-fuchsia-400 animate-pulse">● Live</span>
            </div>
            
            {players.length === 0 ? (
                <div className="text-center py-10 text-slate-500 italic">
                    Waiting for players to join...
                </div>
            ) : (
                players.map(p => (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-white/5 animate-in slide-in-from-left duration-300">
                        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-white/10 relative">
                           {p.photo ? (
                               <img src={p.photo} className="w-full h-full object-cover" alt="player" />
                           ) : (
                               <Users className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500" />
                           )}
                        </div>
                        <span className="font-medium truncate">{p.name || 'Anonymous'}</span>
                    </div>
                ))
            )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
            <Button variant="danger" className="w-full" onClick={handleHostExit}>
                <LogOut size={20} /> End Game
            </Button>
        </div>
      </Card>

      {/* Main Area: Carousel */}
      <div className="lg:w-3/4 flex flex-col gap-6 order-1 lg:order-2">
        <div className="relative flex-1 bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col justify-center min-h-[500px]">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-950 to-slate-950"></div>
            
            {/* Winner Overlay - Now uses live data */}
            {winnerId && !isSpinning && winner && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-500 p-4">
                    <div className="relative text-center p-8 bg-gradient-to-b from-slate-900 to-slate-950 border border-fuchsia-500/30 rounded-3xl shadow-2xl shadow-fuchsia-900/50 max-w-md w-full mx-auto transform animate-in zoom-in slide-in-from-bottom-10 duration-500">
                         {/* Close Button */}
                         <button 
                            onClick={() => setWinnerId(null)}
                            className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-lg animate-bounce" />
                        <h2 className="text-3xl font-black text-white mb-2">WINNER SELECTED!</h2>
                        <div className="w-48 h-64 mx-auto my-6 bg-slate-800 rounded-xl p-2 shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                            {winner.photo ? (
                                <img 
                                    src={winner.photo} 
                                    className="w-full h-full object-cover rounded-lg border-2 border-white/10" 
                                    alt="winner"
                                    key={winner.photo}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-700 rounded-lg">
                                    <Users className="w-12 h-12 text-slate-500" />
                                </div>
                            )}
                        </div>
                        <h3 className="text-3xl font-bold text-fuchsia-400 mb-6 truncate">{winner.name || 'Anonymous'}</h3>
                        <Button onClick={() => setWinnerId(null)} className="w-full">
                            Shuffle Again
                        </Button>
                    </div>
                </div>
            )}

            {/* The Carousel */}
            <div className="relative w-full py-12">
                <CardCarousel 
                    ref={carouselRef}
                    players={players} 
                    spinning={isSpinning}
                    forceStop={forceStop}
                    onFinish={handleSpinComplete} 
                />
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
            <Button 
              onClick={handleSpin} 
              disabled={isSpinning || players.length < 2}
              className="w-full sm:w-auto text-xl px-16 py-6 rounded-full shadow-2xl shadow-fuchsia-500/20 text-lg uppercase tracking-wider"
            >
              {isSpinning ? 'Shuffling...' : 'SHUFFLE THE SQUAD'}
            </Button>
            
            {isSpinning && (
              <Button 
                onClick={handleForceStop}
                variant="danger"
                className="w-full sm:w-auto text-xl px-8 py-6 rounded-full shadow-2xl shadow-red-500/20 text-lg uppercase tracking-wider"
              >
                <Square size={20} className="fill-current" />
                STOP SHUFFLE
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PLAYER ROOM ---
function PlayerRoom({ userId, initialRoomCode, onError, onExit }) {
    const [roomCode] = useState(initialRoomCode);
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [hasPhoto, setHasPhoto] = useState(false); // Track if they've taken their lobby selfie
    const [countdown, setCountdown] = useState(null); // Initial selfie countdown
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [gameState, setGameState] = useState('waiting');
    const [winnerId, setWinnerId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [isRoomClosed, setIsRoomClosed] = useState(false);

    // Save session
    useEffect(() => {
        if (roomCode && joined) {
            localStorage.setItem('camspin_session', JSON.stringify({ code: roomCode, role: 'player' }));
        }
    }, [roomCode, joined]);

    // Listen for room state and players
    useEffect(() => {
        if (!roomCode || !joined) return;
        
        const roomUnsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setGameState(data.status);
                setWinnerId(data.winnerId || data.winner?.id);
            } else {
                localStorage.removeItem('camspin_session');
                setIsRoomClosed(true);
            }
        }, (err) => {
            console.error("Room snapshot error:", err);
            setIsRoomClosed(true);
        });

        const playersUnsub = onSnapshot(
            collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players'),
            (snapshot) => {
                const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setPlayers(pList);
            },
            (err) => console.error("Players snapshot error:", err)
        );

        return () => {
            roomUnsub();
            playersUnsub();
        };
    }, [roomCode, joined]);

    // Camera Setup - Fix: Re-attach stream whenever video element mounts or stream changes
    useEffect(() => {
        const startCamera = async () => {
            try {
                const constraints = {
                    video: { facingMode: "user", width: 640, height: 480 },
                    audio: false
                };
                const s = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(s);
            } catch (err) {
                console.error("Camera Error:", err);
                onError("Camera access required!");
            }
        };
        
        if (joined && !isRoomClosed && !stream) startCamera();
        
        return () => {
             // We don't stop tracks here to keep stream alive during navigation/hide
        };
    }, [joined, isRoomClosed, stream]);

    // Ensure stream is attached to video ref whenever it's available and not 'spinning'
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, gameState]); // Re-run when gameState changes (view might unhide)

    // --- NEW: Single Snapshot Logic ---
    const captureSnapshot = async (reason = 'update') => {
        if (!videoRef.current || !canvasRef.current) {
            console.warn("Camera not ready for snapshot");
            return;
        }
        
        const ctx = canvasRef.current.getContext('2d');
        // Draw current video frame to canvas
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        
        // Convert to base64
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6); // Lower quality for speed
        
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', userId), {
                photo: base64,
                updatedAt: serverTimestamp()
            });
            if (reason === 'initial') setHasPhoto(true);
        } catch (e) {
            console.error("Snapshot upload failed:", e);
        }
    };

    // --- NEW: Timer Logic for Initial Selfie ---
    // 1. Start timer when stream is ready and we don't have a photo yet
    useEffect(() => {
        if (stream && !hasPhoto && countdown === null) {
            setCountdown(3);
        }
    }, [stream, hasPhoto]); 

    // 2. Handle the Countdown Tick
    useEffect(() => {
        if (countdown === null) return;
        
        if (hasPhoto) {
            setCountdown(null);
            return;
        }

        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            captureSnapshot('initial');
        }
    }, [countdown, hasPhoto]);


    // --- NEW: Auto-Snap on Win ---
    useEffect(() => {
        // If I am the winner, take a "Reaction Shot"
        if (winnerId === userId && gameState === 'finished') {
            console.log("I WON! Taking reaction shot...");
            // Small delay to ensure they are looking at the screen realizing they won
            setTimeout(() => {
                captureSnapshot('reaction');
            }, 500);
        }
    }, [winnerId, gameState, userId]);

    const handleJoin = async () => {
        if (!name.trim()) return;
        try {
            const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) { onError("Room not found!"); return; }

            // Join without photo first
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', userId), {
                name: name.trim(),
                joinedAt: serverTimestamp(),
                photo: null,
                updatedAt: serverTimestamp()
            });
            setJoined(true);
        } catch (e) {
            console.error(e);
            onError("Connection failed.");
        }
    };

    const handleLeaveRoom = async () => {
        if (window.confirm("Leave the room?")) {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', userId));
                localStorage.removeItem('camspin_session');
                onExit();
            } catch (e) { onExit(); }
        }
    };

    const winner = winnerId ? players.find(p => p.id === winnerId) : null;

    if (isRoomClosed) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
                 <Card className="max-w-md w-full animate-in zoom-in duration-300">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut className="text-red-500 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Game Ended</h2>
                        <p className="text-slate-400">The host has closed the room.</p>
                    </div>
                    <Button onClick={onExit} className="w-full">Back to Home</Button>
                 </Card>
            </div>
        );
    }

    if (!joined) {
        return (
            <div className="max-w-md mx-auto pt-20 px-4 animate-in slide-in-from-bottom duration-500">
                <Card>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">Join Room</h2>
                        <span className="font-mono text-3xl font-black text-fuchsia-400 tracking-widest">{roomCode}</span>
                    </div>
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mb-4 text-white"
                        value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" autoFocus
                    />
                    <Button className="w-full" onClick={handleJoin} disabled={!name}>Start Camera & Join</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center pt-8 max-w-lg mx-auto px-4 w-full">
             {/* Winner Display */}
             {gameState === 'finished' && winner && (
                 <div className="w-full mb-8 animate-in slide-in-from-top duration-500">
                    <div className={`p-6 rounded-2xl border ${winner.id === userId ? 'bg-yellow-500/20 border-yellow-500' : 'bg-slate-800 border-slate-700'} text-center`}>
                        <h2 className="text-3xl font-black mb-2 text-white">{winner.id === userId ? "YOU WON!" : "WINNER"}</h2>
                        <p className="text-xl font-bold text-white">{winner.name}</p>
                    </div>
                 </div>
            )}

            {/* LIVE SHUFFLE DISPLAY */}
            {gameState === 'spinning' && (
                <div className="w-full mb-8 animate-in zoom-in duration-300">
                    <h2 className="text-2xl font-bold text-fuchsia-400 text-center mb-4 animate-pulse">SHUFFLING...</h2>
                    <div className="w-full bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden">
                        <div className="relative w-full py-6">
                            <CardCarousel 
                                players={players} 
                                spinning={true}
                                showOnly={true} // Read-only mode for players
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {/* CAMERA CARD 
               Fix: Used 'style={{ display: ... }}' to hide instead of unmounting. 
               This keeps the stream active for reaction shots.
            */}
            <Card className="w-full" style={{ display: gameState === 'spinning' ? 'none' : 'block' }}>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4 shadow-inner border border-white/10">
                    <canvas ref={canvasRef} width={320} height={240} className="hidden" />
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    
                    {/* Countdown Overlay */}
                    {countdown !== null && countdown > 0 && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                            <span className="text-9xl font-black text-white drop-shadow-lg animate-bounce">
                                {countdown}
                            </span>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${hasPhoto ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                        {hasPhoto ? 'READY' : 'TAKE PHOTO'}
                    </div>
                </div>

                <div className="space-y-3">
                    {/* The Manual Snap Button - Always available when not spinning */}
                    <Button 
                        onClick={() => captureSnapshot('initial')} 
                        className="w-full"
                        variant={hasPhoto ? "secondary" : "primary"}
                    >
                        <Camera size={20} />
                        {hasPhoto ? "Retake Selfie" : (countdown ? "Snap Now (Skip Timer)" : "Snap Selfie")}
                    </Button>
                    
                    <p className="text-xs text-slate-500 text-center">
                        {hasPhoto ? "Wait for the host to spin!" : "Smile! Taking photo automatically..."}
                    </p>

                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Connected as {name}</span>
                        <button onClick={handleLeaveRoom} className="text-xs text-red-400 hover:text-red-300">Leave</button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

// --- CARD CAROUSEL COMPONENT ---
const CardCarousel = forwardRef(({ players, spinning, onFinish, forceStop = false, showOnly = false }, ref) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const stopTimeoutRef = useRef();
    const stateRef = useRef({
        offset: 0,
        velocity: 0,
        isStopping: false,
        targetOffset: 0,
        winnerIndex: -1,
        isAnimating: false
    });

    const CARD_W = 220;
    const CARD_H = 320;
    const GAP = 40;
    const ITEM_W = CARD_W + GAP;
    const MAX_SPEED = 40;
    
    // Store images
    const [images, setImages] = useState({});

    // Image Preloader
    useEffect(() => {
        let mounted = true;
        players.forEach(p => {
            if (p.photo) {
                if (!images[p.id] || images[p.id]._lastPhoto !== p.photo) {
                    const img = new Image();
                    img.src = p.photo;
                    img._lastPhoto = p.photo;
                    img.onload = () => {
                        if (mounted) setImages(prev => ({ ...prev, [p.id]: img }));
                    };
                }
            }
        });
        return () => { mounted = false; };
    }, [players]);

    // Expose stop method via ref
    useImperativeHandle(ref, () => ({
        stopImmediately: () => {
            if (players.length > 0 && stateRef.current.velocity > 0 && !stateRef.current.isStopping) {
                // Clear any existing timeout
                if (stopTimeoutRef.current) {
                    clearTimeout(stopTimeoutRef.current);
                    stopTimeoutRef.current = null;
                }
                
                // Calculate winner and stop immediately
                const winnerIndex = Math.floor(Math.random() * players.length);
                stateRef.current.winnerIndex = winnerIndex;
                
                // Calculate target offset to align winner with arrow
                const currentOffset = stateRef.current.offset;
                const totalStripW = players.length * ITEM_W;
                
                // We want the winner's card to be centered at the arrow (canvas center)
                // The arrow is at canvas.width / 2
                const canvas = canvasRef.current;
                if (!canvas) return;
                
                const canvasCenter = canvas.width / 2;
                
                // Winner's card center position in the infinite strip
                const winnerCenterInStrip = winnerIndex * ITEM_W + CARD_W / 2;
                
                // We need to find an offset where:
                // (winnerCenterInStrip - offset + canvasCenter) % totalStripW = canvasCenter
                // This means: winnerCenterInStrip - offset = multiple of totalStripW
                // So: offset = winnerCenterInStrip - k * totalStripW
                
                // Find k such that offset is ahead of current offset by at least one full rotation
                const currentCycle = Math.floor(currentOffset / totalStripW);
                const k = currentCycle + 1; // At least one full cycle ahead
                
                // Calculate the exact target offset
                let targetOffset = winnerCenterInStrip - k * totalStripW + canvasCenter;
                
                // Adjust to make sure we're stopping ahead of current position
                while (targetOffset <= currentOffset) {
                    targetOffset += totalStripW;
                }
                
                // Add some extra distance for smooth deceleration
                targetOffset += totalStripW * 2;
                
                stateRef.current.targetOffset = targetOffset;
                stateRef.current.isStopping = true;
            }
        }
    }));

    // Animation Loop
    const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = stateRef.current;
        
        // Physics
        if (state.isStopping) {
            // Decelerate to target with smooth easing
            const dist = state.targetOffset - state.offset;
            
            // Apply deceleration
            state.velocity *= 0.95;
            
            // Add a small force toward the target to ensure we reach it
            const force = dist * 0.02;
            state.velocity += force;
            
            // Cap maximum velocity during deceleration
            const maxDecelSpeed = 15;
            if (state.velocity > maxDecelSpeed) state.velocity = maxDecelSpeed;
            if (state.velocity < -maxDecelSpeed) state.velocity = -maxDecelSpeed;
            
            // Check if we're close enough to stop
            if (Math.abs(dist) < 5 && Math.abs(state.velocity) < 2) {
                state.velocity = 0;
                state.offset = state.targetOffset;
                state.isStopping = false;
                state.isAnimating = false;
                
                if (onFinish && players.length > 0 && state.winnerIndex >= 0) {
                    onFinish(players[state.winnerIndex]);
                }
            }
        } else if (spinning && !showOnly) {
            // Accelerate
            if (state.velocity < MAX_SPEED) {
                state.velocity += 1.5;
            }
            state.isAnimating = true;
        } else {
            // Idle drift
            state.velocity *= 0.98;
            if (Math.abs(state.velocity) < 0.1) state.velocity = 0;
        }

        // --- NEW: Client-side spin for Read-Only mode (Players) ---
        // If showOnly is true (player view), we just spin endlessly until the 'spinning' prop becomes false
        // The host controls the actual stop logic.
        if (showOnly && spinning) {
             if (state.velocity < MAX_SPEED) state.velocity += 1.5;
        }

        state.offset += state.velocity;

        // Rendering
        const w = canvas.width;
        const h = canvas.height;
        const cy = h / 2;
        const cardY = cy - CARD_H / 2;

        ctx.clearRect(0, 0, w, h);

        // Draw selection marker (Center Line)
        const cx = w / 2;
        
        // Draw Track Rails
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, cy - 20, w, 40);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, cy - 15); ctx.lineTo(w, cy - 15);
        ctx.moveTo(0, cy + 15); ctx.lineTo(w, cy + 15);
        ctx.stroke();

        if (players.length > 0) {
            // Calculate visible range
            const totalStripW = players.length * ITEM_W;
            
            // Find which index is roughly at x=0
            const startIdx = Math.floor((state.offset - w) / ITEM_W);
            const endIdx = Math.floor((state.offset + w * 2) / ITEM_W);

            for (let i = startIdx; i <= endIdx; i++) {
                // Get wrapped index
                let pIndex = i % players.length;
                if (pIndex < 0) pIndex += players.length;
                
                const p = players[pIndex];
                const x = (i * ITEM_W) - state.offset + (w / 2) - (CARD_W / 2);

                // Draw Card
                ctx.save();
                
                // Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 20;
                ctx.shadowOffsetY = 10;
                
                // Base Shape
                roundedRect(ctx, x, cardY, CARD_W, CARD_H, 15);
                ctx.fillStyle = '#0f172a';
                ctx.fill();
                
                // Border - highlight if this is the selected winner
                ctx.shadowColor = 'transparent';
                ctx.lineWidth = pIndex === state.winnerIndex && state.isStopping ? 6 : 4;
                ctx.strokeStyle = pIndex === state.winnerIndex && state.isStopping ? '#fbbf24' : '#c026d3';
                ctx.stroke();

                // Image Area
                if (images[p.id]) {
                    ctx.save();
                    roundedRect(ctx, x + 10, cardY + 10, CARD_W - 20, CARD_H - 80, 10);
                    ctx.clip();
                    
                    // Draw Image fit to cover
                    const img = images[p.id];
                    const scale = Math.max((CARD_W - 20) / img.width, (CARD_H - 80) / img.height);
                    const imgW = img.width * scale;
                    const imgH = img.height * scale;
                    const imgX = x + 10 + (CARD_W - 20 - imgW) / 2;
                    const imgY = cardY + 10 + (CARD_H - 80 - imgH) / 2;
                    
                    ctx.drawImage(img, imgX, imgY, imgW, imgH);
                    ctx.restore();
                } else {
                    // Placeholder
                    ctx.fillStyle = '#1e293b';
                    roundedRect(ctx, x + 10, cardY + 10, CARD_W - 20, CARD_H - 80, 10);
                    ctx.fill();
                    ctx.fillStyle = '#64748b';
                    ctx.font = '40px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', x + CARD_W/2, cardY + CARD_H/2 - 20);
                }

                // Name
                ctx.fillStyle = 'white';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.name, x + CARD_W/2, cardY + CARD_H - 30);

                ctx.restore();
            }
        }
        
        // Marker (Arrow)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(cx - 15, 0);
        ctx.lineTo(cx + 15, 0);
        ctx.lineTo(cx, 25);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx - 15, h);
        ctx.lineTo(cx + 15, h);
        ctx.lineTo(cx, h - 25);
        ctx.fill();
        
        // Center line (subtle)
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
        ctx.setLineDash([]);

        requestRef.current = requestAnimationFrame(animate);
    };

    // Helper for rounded rect
    const roundedRect = (ctx, x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    // Watch for start spinning
    useEffect(() => {
        if (spinning && !stateRef.current.isStopping && !showOnly) {
            // Start spinning
            stateRef.current.velocity = 0;
            stateRef.current.isAnimating = true;
            
            // Set random timeout to stop (3-5 seconds)
            const spinDuration = 3000 + Math.random() * 2000;
            
            stopTimeoutRef.current = setTimeout(() => {
                if (players.length > 0 && !stateRef.current.isStopping) {
                    const winnerIndex = Math.floor(Math.random() * players.length);
                    stateRef.current.winnerIndex = winnerIndex;
                    
                    // Calculate target offset to align winner with arrow
                    const currentOffset = stateRef.current.offset;
                    const totalStripW = players.length * ITEM_W;
                    const canvas = canvasRef.current;
                    
                    if (!canvas) return;
                    
                    const canvasCenter = canvas.width / 2;
                    const winnerCenterInStrip = winnerIndex * ITEM_W + CARD_W / 2;
                    
                    // Find k such that offset is ahead of current offset
                    const currentCycle = Math.floor(currentOffset / totalStripW);
                    const k = currentCycle + 2; // Add extra cycles for smooth deceleration
                    
                    // Calculate the exact target offset
                    let targetOffset = winnerCenterInStrip - k * totalStripW + canvasCenter;
                    
                    // Make sure we're stopping ahead of current position
                    while (targetOffset <= currentOffset) {
                        targetOffset += totalStripW;
                    }
                    
                    // Add some extra distance for smooth deceleration
                    targetOffset += totalStripW * 2;
                    
                    stateRef.current.targetOffset = targetOffset;
                    stateRef.current.isStopping = true;
                }
            }, spinDuration);
            
            return () => {
                if (stopTimeoutRef.current) {
                    clearTimeout(stopTimeoutRef.current);
                }
            };
        }
    }, [spinning, players.length, showOnly]);

    // Handle force stop
    useEffect(() => {
        if (forceStop && spinning) {
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
            // Trigger stop via ref method
            if (ref && ref.current) {
                ref.current.stopImmediately();
            }
        }
    }, [forceStop, spinning, ref]);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = 400;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Start Loop
    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(requestRef.current);
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
        };
    }, [players, spinning]);

    return (
        <canvas ref={canvasRef} className="w-full h-[400px] block" />
    );
});

CardCarousel.displayName = 'CardCarousel';