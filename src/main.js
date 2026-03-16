import './index.css';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged 
} from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

// --- Error Handling ---
const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  state.error = `Error en la base de datos: ${errInfo.error}`;
  render();
}

// --- Icons (SVG Strings) ---
const Icons = {
  Users: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  Plus: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  Trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  Calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
  History: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  TrendingUp: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  Activity: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  AlertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  ChevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  Edit2: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  Trash2: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  X: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>',
  Check: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  Refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
  User: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  ArrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  Save: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  Clock: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};

let matchFormState = {
  matchday: 1,
  opponent: '',
  result: '0-0',
  goalsLocal: 0,
  goalsVisitor: 0,
  playerStats: []
};

// --- State ---
window.state = {
  view: 'dashboard', // 'dashboard', 'new-match', 'player-detail'
  user: null,
  authReady: false,
  teams: [],
  currentTeamId: null,
  teamToDelete: null,
  players: [],
  matches: [],
  teamStats: null,
  selectedPlayer: null,
  playerSummary: null,
  loading: true,
  error: null,
  playerToDelete: null,
  matchToDelete: null,
  editingPlayerId: null,
  editingMatchId: null,
  editingTeamId: null,
  refreshing: false,
  editName: '',
  editTeamName: '',
  isAddingTeam: false,
  newTeamName: '',
  sortBy: 'name-asc',
};

// --- Auth Functions ---
window.login = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Login error:", error);
  }
};

window.logout = async () => {
  try {
    await auth.signOut();
    state.user = null;
    state.teams = [];
    state.players = [];
    state.matches = [];
    state.currentTeamId = null;
    render();
  } catch (error) {
    console.error("Logout error:", error);
  }
};

onAuthStateChanged(auth, (user) => {
  state.user = user;
  state.authReady = true;
  if (user) {
    fetchTeams();
  } else {
    state.loading = false;
    render();
  }
});

// --- API Functions (Firestore) ---
let unsubTeams = null;
let unsubPlayers = null;
let unsubMatches = null;

async function fetchTeams() {
  if (!state.user) return;
  if (unsubTeams) unsubTeams();
  
  // Filter teams by the logged-in user's ID
  const q = query(
    collection(db, 'teams'), 
    where('ownerId', '==', state.user.uid),
    orderBy('name', 'asc')
  );
  
  unsubTeams = onSnapshot(q, (snapshot) => {
    state.teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (state.teams.length > 0) {
      if (!state.currentTeamId) {
        state.currentTeamId = state.teams[0].id;
      }
      fetchInitialData(state.currentTeamId);
    } else {
      state.loading = false;
      render();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));
}

window.refreshData = async () => {
  if (!state.currentTeamId) return;
  state.refreshing = true;
  render();
  
  // Re-fetch everything manually to be sure
  await fetchInitialData(state.currentTeamId);
  
  // Give it a moment to feel like it did something if it was too fast
  setTimeout(() => {
    state.refreshing = false;
    render();
  }, 800);
};

async function fetchInitialData(teamId) {
  state.loading = true;
  state.players = [];
  state.matches = [];
  state.teamStats = null;
  render();

  if (unsubPlayers) unsubPlayers();
  if (unsubMatches) unsubMatches();

  // Listen to Players
  const playersQ = query(collection(db, `teams/${teamId}/players`), orderBy('name', 'asc'));
  unsubPlayers = onSnapshot(playersQ, (snapshot) => {
    state.players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    calculateTeamStats();
    render();
  }, (error) => handleFirestoreError(error, OperationType.LIST, `teams/${teamId}/players`));

  // Listen to Matches
  const matchesQ = query(collection(db, `teams/${teamId}/matches`), orderBy('matchday', 'desc'));
  unsubMatches = onSnapshot(matchesQ, async (snapshot) => {
    try {
      const matchesData = [];
      // We'll fetch stats in parallel for better performance
      const statsPromises = snapshot.docs.map(async (matchDoc) => {
        const match = { id: matchDoc.id, ...matchDoc.data() };
        try {
          const statsSnapshot = await getDocs(collection(db, `teams/${teamId}/matches/${match.id}/stats`));
          match.playerStats = statsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.error(`Error fetching stats for match ${match.id}:`, e);
          match.playerStats = [];
        }
        return match;
      });

      state.matches = await Promise.all(statsPromises);
      calculateTeamStats();
      state.loading = false;
      render();
    } catch (error) {
      console.error("Error processing matches snapshot:", error);
      state.loading = false;
      state.error = "Error al procesar los datos de los partidos.";
      render();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, `teams/${teamId}/matches`));
}

function calculateTeamStats() {
  if (!state.matches.length) {
    state.teamStats = {
      totalMatches: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalAverage: 0,
      avgGoalsFor: 0,
      totalYellowCards: 0,
      totalRedCards: 0,
      totalDoubleYellowCards: 0,
      totalPlayerGoals: 0
    };
    return;
  }

  let goalsFor = 0;
  let goalsAgainst = 0;
  let totalYellow = 0;
  let totalRed = 0;
  let totalDoubleYellow = 0;
  let totalGoals = 0;

  state.matches.forEach(m => {
    const [f, a] = m.result.split("-").map(n => parseInt(n.trim()));
    if (!isNaN(f) && !isNaN(a)) {
      goalsFor += f;
      goalsAgainst += a;
    }
    if (m.playerStats) {
      m.playerStats.forEach(s => {
        if (s.doubleYellowCards) {
          totalDoubleYellow += 1;
        } else {
          totalYellow += (s.yellowCards || 0);
        }
        totalRed += (s.redCards || 0);
        totalGoals += (s.goals || 0);
      });
    }
  });

  // Update player totals in state for the dashboard list
  state.players.forEach(p => {
    let pGoals = 0;
    let pMatches = 0;
    let pYellow = 0;
    let pRed = 0;
    let pDoubleYellow = 0;
    state.matches.forEach(m => {
      const stat = m.playerStats?.find(s => s.playerId === p.id);
      if (stat) {
        pGoals += (stat.goals || 0);
        if (stat.doubleYellowCards) {
          pDoubleYellow += 1;
        } else {
          pYellow += (stat.yellowCards || 0);
        }
        pRed += (stat.redCards || 0);
        if (stat.minutes > 0) pMatches++;
      }
    });
    p.totalGoals = pGoals;
    p.totalMatches = pMatches;
    p.totalYellowCards = pYellow;
    p.totalRedCards = pRed;
    p.totalDoubleYellowCards = pDoubleYellow;
  });

  state.teamStats = {
    totalMatches: state.matches.length,
    goalsFor,
    goalsAgainst,
    goalAverage: goalsFor - goalsAgainst,
    avgGoalsFor: state.matches.length > 0 ? (goalsFor / state.matches.length).toFixed(2) : 0,
    totalYellowCards: totalYellow,
    totalRedCards: totalRed,
    totalDoubleYellowCards: totalDoubleYellow,
    totalPlayerGoals: totalGoals
  };
}

window.fetchPlayerStats = async (player) => {
  try {
    let matchesPlayed = 0;
    let totalMinutes = 0;
    let totalGoals = 0;
    let totalYellowCards = 0;
    let totalDoubleYellowCards = 0;
    let totalRedCards = 0;

    state.matches.forEach(m => {
      const stat = m.playerStats?.find(s => s.playerId === player.id);
      if (stat) {
        if (stat.minutes > 0) matchesPlayed++;
        totalMinutes += (stat.minutes || 0);
        totalGoals += (stat.goals || 0);
        if (stat.doubleYellowCards) {
          totalDoubleYellowCards += 1;
        } else {
          totalYellowCards += (stat.yellowCards || 0);
        }
        totalRedCards += (stat.redCards || 0);
      }
    });

    state.playerSummary = {
      matchesPlayed,
      totalMinutes,
      totalGoals,
      totalYellowCards,
      totalDoubleYellowCards,
      totalRedCards,
      avgMinutes: matchesPlayed > 0 ? totalMinutes / matchesPlayed : 0
    };
    state.selectedPlayer = player;
    state.view = 'player-detail';
    render();
  } catch (error) {
    console.error("Error calculating player stats:", error);
  }
};

// --- Event Handlers ---
window.setView = (view) => {
  state.view = view;
  if (view === 'dashboard') {
    state.editingMatchId = null;
  }
  if (view === 'new-match') {
    window.initMatchForm();
  }
  render();
};

window.setCurrentTeam = (id) => {
  state.currentTeamId = id;
  fetchInitialData(id);
};

window.toggleAddTeam = () => {
  state.isAddingTeam = !state.isAddingTeam;
  render();
};

window.handleNewTeamNameChange = (e) => {
  state.newTeamName = e.target.value;
};

window.addTeam = async () => {
  if (!state.newTeamName.trim() || !state.user) return;
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      name: state.newTeamName.trim(),
      ownerId: state.user.uid,
      createdAt: serverTimestamp()
    });
    state.currentTeamId = docRef.id;
    state.newTeamName = '';
    state.isAddingTeam = false;
    fetchInitialData(docRef.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'teams');
  }
};

window.setEditingTeam = (id, name) => {
  state.editingTeamId = id;
  state.editTeamName = name;
  render();
};

window.handleEditTeamNameChange = (e) => {
  state.editTeamName = e.target.value;
};

window.updateTeam = async (id) => {
  if (!state.editTeamName.trim()) return;
  try {
    await updateDoc(doc(db, 'teams', id), {
      name: state.editTeamName.trim()
    });
    state.editingTeamId = null;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `teams/${id}`);
  }
};

window.confirmDeleteTeam = (id, name) => {
  state.teamToDelete = { id, name };
  render();
};

window.deleteTeam = async () => {
  if (!state.teamToDelete) return;
  const id = state.teamToDelete.id;
  try {
    // 1. Delete Players
    const playersCol = collection(db, `teams/${id}/players`);
    const playersSnapshot = await getDocs(playersCol);
    for (const d of playersSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    // 2. Delete Matches (and their stats)
    const matchesCol = collection(db, `teams/${id}/matches`);
    const matchesSnapshot = await getDocs(matchesCol);
    for (const m of matchesSnapshot.docs) {
      const statsCol = collection(db, `teams/${id}/matches/${m.id}/stats`);
      const statsSnapshot = await getDocs(statsCol);
      for (const s of statsSnapshot.docs) {
        await deleteDoc(s.ref);
      }
      await deleteDoc(m.ref);
    }

    // 3. Delete the Team itself
    await deleteDoc(doc(db, 'teams', id));
    
    // If we deleted the current team, switch to another one if available
    if (state.currentTeamId === id) {
      const remainingTeams = state.teams.filter(t => t.id !== id);
      if (remainingTeams.length > 0) {
        state.currentTeamId = remainingTeams[0].id;
      } else {
        state.currentTeamId = null;
      }
    }
    
    state.teamToDelete = null;
    render();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teams/${id}`);
  }
};

window.setSortBy = (val) => {
  state.sortBy = val;
  render();
};

window.triggerPhotoUpload = (playerId) => {
  let input = document.getElementById('global-photo-upload');
  if (!input) {
    input = document.createElement('input');
    input.id = 'global-photo-upload';
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
  }
  input.onchange = (e) => handlePhotoUpload(e, playerId);
  input.click();
};

window.handlePhotoUpload = async (e, playerId) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 800000) {
    state.error = 'La imagen es demasiado grande. Por favor, elige una de menos de 800KB.';
    render();
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target.result;
    try {
      await updateDoc(doc(db, `teams/${state.currentTeamId}/players`, playerId), {
        photoUrl: base64
      });
      render();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${state.currentTeamId}/players/${playerId}`);
    }
  };
  reader.readAsDataURL(file);
};

window.addPlayer = async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('new-player-name');
  const name = nameInput.value.trim();
  if (!name) return;
  try {
    await addDoc(collection(db, `teams/${state.currentTeamId}/players`), {
      name,
      photoUrl: '',
      teamId: state.currentTeamId,
      createdAt: serverTimestamp()
    });
    nameInput.value = '';
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `teams/${state.currentTeamId}/players`);
  }
};

window.setEditingPlayer = (id, name) => {
  state.editingPlayerId = id;
  state.editName = name;
  render();
};

window.handleEditNameChange = (e) => {
  state.editName = e.target.value;
};

window.updatePlayer = async (id) => {
  if (!state.editName.trim()) return;
  try {
    await updateDoc(doc(db, `teams/${state.currentTeamId}/players`, id), {
      name: state.editName.trim()
    });
    state.editingPlayerId = null;
    state.editName = '';
    render();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `teams/${state.currentTeamId}/players/${id}`);
  }
};

window.confirmDeletePlayer = (player) => {
  state.playerToDelete = player;
  render();
};

window.deletePlayer = async () => {
  if (!state.playerToDelete) return;
  const id = state.playerToDelete.id;
  try {
    await deleteDoc(doc(db, `teams/${state.currentTeamId}/players`, id));
    state.playerToDelete = null;
    render();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teams/${state.currentTeamId}/players/${id}`);
  }
};

window.confirmDeleteMatch = (match) => {
  state.matchToDelete = match;
  render();
};

window.deleteMatch = async () => {
  if (!state.matchToDelete) return;
  const id = state.matchToDelete.id;
  try {
    await deleteDoc(doc(db, `teams/${state.currentTeamId}/matches`, id));
    state.matchToDelete = null;
    render();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teams/${state.currentTeamId}/matches/${id}`);
  }
};

window.editMatch = (id) => {
  state.editingMatchId = id;
  state.view = 'new-match';
  window.initMatchForm(id);
  render();
};

// --- Render Functions ---

const renderPlayerAvatar = (player, sizeClass = 'w-12 h-12') => {
  const id = player.id || player.playerId;
  const clickHandler = id ? `onclick="event.stopPropagation(); triggerPhotoUpload('${id}')"` : '';
  const cursorClass = id ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all' : '';

  if (player.photoUrl) {
    return `
      <div class="${sizeClass} rounded-2xl overflow-hidden shrink-0 shadow-sm ${cursorClass}" ${clickHandler} title="Cambiar foto">
        <img src="${player.photoUrl}" alt="${player.name}" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    `;
  }
  return `
    <div class="${sizeClass} rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white ${cursorClass}" ${clickHandler} title="Añadir foto">
      <span class="w-1/2 h-1/2 block">${Icons.User}</span>
    </div>
  `;
};

window.render = () => {
  const app = document.getElementById('app');
  
  if (!state.authReady) {
    app.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p class="text-slate-500 font-medium">Iniciando sesión...</p>
        </div>
      </div>
    `;
    return;
  }

  if (!state.user) {
    app.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
          <div class="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/20">
            <span class="w-8 h-8 block text-white">${Icons.Trophy}</span>
          </div>
          <h2 class="text-2xl font-black tracking-tight mb-2">Bienvenido</h2>
          <p class="text-slate-500 mb-8">Inicia sesión con tu cuenta de Google para gestionar las estadísticas de tu equipo.</p>
          <button onclick="login()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Entrar con Google
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (state.loading && state.teams.length === 0) {
    app.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p class="text-slate-500 font-medium">Cargando datos...</p>
        </div>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      ${renderHeader()}
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        ${state.error ? `
          <div class="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between mb-8">
            <div class="flex items-center gap-3 text-red-700">
              <span class="w-5 h-5 block">${Icons.AlertCircle}</span>
              <p class="font-bold text-sm">${state.error}</p>
            </div>
            <button onclick="state.error = null; render()" class="text-red-400 hover:text-red-600">
              <span class="w-4 h-4 block">${Icons.X}</span>
            </button>
          </div>
        ` : ''}
        ${state.loading ? `
          <div class="flex flex-col items-center justify-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-slate-500 font-medium">Actualizando datos...</p>
          </div>
        ` : renderContent()}
      </main>
      ${renderModals()}
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 cursor-pointer shrink-0" onclick="setView('dashboard')">
          <div class="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/20">
            <span class="w-5 h-5 block text-white">${Icons.Trophy}</span>
          </div>
          <h1 class="font-black text-lg tracking-tighter hidden md:block">ESTADÍSTICAS</h1>
        </div>

        <div class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-2">
          ${state.teams.map(team => `
            <div class="relative group flex items-center shrink-0">
              ${state.editingTeamId === team.id ? `
                <div class="flex items-center bg-white border border-indigo-300 rounded-lg px-2 py-1 shadow-sm">
                  <input 
                    autofocus
                    class="text-xs font-bold outline-none w-24"
                    value="${state.editTeamName}"
                    oninput="handleEditTeamNameChange(event)"
                    onkeydown="if(event.key === 'Enter') updateTeam('${team.id}')"
                  />
                  <button onclick="updateTeam('${team.id}')" class="text-emerald-600 ml-1 p-0.5 hover:bg-emerald-50 rounded">
                    <span class="w-3 h-3 block">${Icons.Check}</span>
                  </button>
                  <button onclick="state.editingTeamId = null; render()" class="text-slate-400 ml-1 p-0.5 hover:bg-slate-50 rounded">
                    <span class="w-3 h-3 block">${Icons.X}</span>
                  </button>
                </div>
              ` : `
                  <button
                    onclick="setCurrentTeam('${team.id}')"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                      state.currentTeamId === team.id 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }"
                  >
                    ${team.name}
                    ${state.currentTeamId === team.id ? `
                      <div class="flex items-center gap-1 ml-1">
                        <span class="w-3 h-3 block opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onclick="event.stopPropagation(); setEditingTeam('${team.id}', '${team.name}')">
                          ${Icons.Edit2}
                        </span>
                        <span class="w-3 h-3 block opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-red-200 hover:text-red-400" onclick="event.stopPropagation(); confirmDeleteTeam('${team.id}', '${team.name}')">
                          ${Icons.Trash2}
                        </span>
                      </div>
                    ` : ''}
                  </button>
              `}
            </div>
          `).join('')}
          
          ${state.isAddingTeam ? `
            <div class="flex items-center bg-white border border-indigo-300 rounded-lg px-2 py-1 shadow-sm shrink-0">
              <input 
                autofocus
                placeholder="Nuevo equipo"
                class="text-xs font-bold outline-none w-24 sm:w-32"
                value="${state.newTeamName}"
                oninput="handleNewTeamNameChange(event)"
                onkeydown="if(event.key === 'Enter') addTeam()"
              />
              <div class="flex items-center ml-1 border-l border-slate-100 pl-1">
                <button onclick="addTeam()" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                  <span class="w-3.5 h-3.5 block">${Icons.Check}</span>
                </button>
                <button onclick="toggleAddTeam()" class="p-1 text-slate-400 hover:bg-slate-50 rounded transition-colors">
                  <span class="w-3.5 h-3.5 block">${Icons.X}</span>
                </button>
              </div>
            </div>
          ` : `
            <button 
              onclick="toggleAddTeam()"
              class="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all whitespace-nowrap group shrink-0"
            >
              <span class="w-4 h-4 block text-slate-400 group-hover:text-indigo-600 transition-colors">${Icons.Plus}</span>
              <span class="text-xs font-bold">Añadir</span>
            </button>
          `}
        </div>
        
        <div class="flex items-center gap-2">
          ${state.view === 'dashboard' ? `
            <button onclick="setView('new-match')" class="shrink-0 text-xs sm:text-sm py-2 bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
              <span class="w-4 h-4 block">${Icons.Plus}</span>
              <span class="hidden sm:inline">Añadir partido</span>
              <span class="sm:hidden">Partido</span>
            </button>
          ` : ''}
          <button onclick="logout()" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Cerrar sesión">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderContent() {
  if (state.view === 'dashboard') return renderDashboard();
  if (state.view === 'new-match') return renderMatchForm();
  if (state.view === 'player-detail') return renderPlayerDetail();
  return '';
}

function renderDashboard() {
  if (state.teams.length === 0) {
    return `
      <div class="space-y-8">
        <div class="flex flex-col items-center justify-center py-20 text-center space-y-8">
          <div class="bg-indigo-100 p-6 rounded-full text-indigo-600">
            <span class="w-12 h-12 block">${Icons.Trophy}</span>
          </div>
          <div class="max-w-md">
            <h2 class="text-2xl font-black tracking-tight mb-2">No tienes equipos aún</h2>
            <p class="text-slate-500 mb-8">Crea tu primer equipo para empezar a registrar estadísticas.</p>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <div class="flex items-center gap-2">
                <input 
                  id="first-team-name"
                  type="text" 
                  placeholder="Nombre del equipo..." 
                  class="p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
                  onkeydown="if(event.key === 'Enter') { state.newTeamName = this.value; addTeam(); }"
                />
                <button onclick="state.newTeamName = document.getElementById('first-team-name').value; addTeam()" class="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                  <span class="w-5 h-5 block">${Icons.Plus}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const sortedPlayers = [...state.players].sort((a, b) => {
    switch (state.sortBy) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'goals-desc': return (b.totalGoals || 0) - (a.totalGoals || 0);
      case 'goals-asc': return (a.totalGoals || 0) - (b.totalGoals || 0);
      case 'matches-desc': return (b.totalMatches || 0) - (a.totalMatches || 0);
      case 'matches-asc': return (a.totalMatches || 0) - (b.totalMatches || 0);
      default: return 0;
    }
  });

  const matchStats = state.matches.reduce((acc, m) => {
    const [f, a] = m.result.split("-").map(n => parseInt(n.trim()));
    if (!isNaN(f) && !isNaN(a)) {
      if (f > a) acc.wins++;
      else if (f < a) acc.losses++;
      else acc.draws++;
    }
    return acc;
  }, { wins: 0, losses: 0, draws: 0 });

  const topScorer = [...state.players].sort((a, b) => (b.totalGoals || 0) - (a.totalGoals || 0))[0];
  const lastMatch = state.matches[0];
  const currentTeam = state.teams.find(t => t.id === state.currentTeamId);

  return `
    <div class="space-y-8">
      <!-- Hero Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-2xl">
        <div class="relative z-10">
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div class="space-y-6 flex-1 min-w-0">
              <div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-3 border border-indigo-500/30">
                  <span class="w-3 h-3 block">${Icons.Activity}</span>
                  Temporada 2025/2026
                </div>
                <div class="flex items-center gap-4 mb-2">
                  <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter truncate">
                    ${currentTeam?.name || 'Equipo'}
                  </h2>
                  <button 
                    onclick="refreshData()" 
                    class="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group ${state.refreshing ? 'animate-spin' : ''}"
                    title="Refrescar datos"
                  >
                    <span class="w-5 h-5 block text-white group-hover:scale-110 transition-transform">${Icons.Refresh}</span>
                  </button>
                </div>
                <p class="text-slate-400 text-base sm:text-lg font-medium">Resumen de estadísticas del equipo</p>
              </div>
              
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
                <div class="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Jugadores</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold">${state.players.length}</span>
                    <span class="w-3.5 h-3.5 block text-indigo-400">${Icons.Users}</span>
                  </div>
                </div>
                <div class="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Partidos</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold">${state.teamStats?.totalMatches || state.matches.length}</span>
                    <span class="w-3.5 h-3.5 block text-emerald-400">${Icons.Calendar}</span>
                  </div>
                </div>
                <div class="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Victorias</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold text-emerald-400">${matchStats.wins}</span>
                  </div>
                </div>
                <div class="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Empates</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold text-amber-400">${matchStats.draws}</span>
                  </div>
                </div>
                <div class="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Derrotas</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold text-red-400">${matchStats.losses}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
              ${topScorer && topScorer.totalGoals > 0 ? `
                <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4 flex-1 sm:flex-none sm:min-w-[220px]">
                  ${renderPlayerAvatar(topScorer, 'w-12 h-12')}
                  <div class="min-w-0">
                    <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pichichi</p>
                    <p class="font-bold text-base leading-tight truncate">${topScorer.name}</p>
                    <p class="text-indigo-400 font-black text-sm mt-0.5">${topScorer.totalGoals} GOLES</p>
                  </div>
                </div>
              ` : ''}
              
              ${lastMatch ? `
                <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-center flex-1 sm:flex-none sm:min-w-[200px]">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Último Resultado</p>
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-center flex-1 min-w-0">
                      <p class="text-[9px] text-slate-400 font-bold uppercase truncate mb-1">${currentTeam?.name || 'Equipo'}</p>
                      <p class="text-2xl font-black">${lastMatch.result.split('-')[0]}</p>
                    </div>
                    <div class="h-8 w-px bg-white/10 shrink-0"></div>
                    <div class="text-center flex-1 min-w-0">
                      <p class="text-[9px] text-slate-400 font-bold uppercase truncate mb-1">Rival</p>
                      <p class="text-2xl font-black">${lastMatch.result.split('-')[1]}</p>
                    </div>
                  </div>
                  <div class="mt-3 pt-2 border-t border-white/5 text-center">
                    <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest truncate">vs ${lastMatch.opponent}</p>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <!-- Secondary Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between group hover:border-indigo-200 hover:shadow-md transition-all">
          <div>
            <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">Goles Favor</p>
            <h3 class="text-3xl font-black mt-1 text-slate-900">${state.teamStats?.goalsFor || 0}</h3>
          </div>
          <div class="bg-indigo-50 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-600">
            <span class="w-6 h-6 block">${Icons.TrendingUp}</span>
          </div>
        </div>
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between group hover:border-red-200 hover:shadow-md transition-all">
          <div>
            <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">Goles Contra</p>
            <h3 class="text-3xl font-black mt-1 text-slate-900">${state.teamStats?.goalsAgainst || 0}</h3>
          </div>
          <div class="bg-red-50 p-3 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all text-red-500">
            <span class="w-6 h-6 block rotate-180">${Icons.TrendingUp}</span>
          </div>
        </div>
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between group hover:border-indigo-200 hover:shadow-md transition-all">
          <div>
            <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">Gol Average</p>
            <h3 class="text-3xl font-black mt-1 ${(state.teamStats?.goalAverage || 0) >= 0 ? 'text-indigo-600' : 'text-red-600'}">
              ${state.teamStats?.goalAverage || 0}
            </h3>
          </div>
          <div class="bg-indigo-50 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-600">
            <span class="w-6 h-6 block">${Icons.Activity}</span>
          </div>
        </div>
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between group hover:border-amber-200 hover:shadow-md transition-all">
          <div>
            <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tarjetas</p>
            <div class="flex gap-4 mt-1">
              <div class="flex items-center gap-2">
                <div class="w-3 h-4 bg-amber-400 rounded-sm shadow-sm" title="Amarillas"></div>
                <span class="text-2xl font-black text-slate-900">${state.teamStats?.totalYellowCards || 0}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-4 bg-red-500 rounded-sm shadow-sm" title="Rojas"></div>
                <span class="text-2xl font-black text-slate-900">${state.teamStats?.totalRedCards || 0}</span>
              </div>
            </div>
          </div>
          <div class="bg-amber-50 p-3 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all text-amber-600">
            <span class="w-6 h-6 block">${Icons.AlertCircle}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Players List -->
        <section class="lg:col-span-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 class="text-xl font-black flex items-center gap-2">
              <span class="w-6 h-6 block text-indigo-600">${Icons.Users}</span>
              PLANTILLA
            </h2>
            <div class="flex items-center gap-2">
              <select 
                onchange="setSortBy(this.value)"
                class="text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              >
                <option value="name-asc" ${state.sortBy === 'name-asc' ? 'selected' : ''}>Nombre (A-Z)</option>
                <option value="name-desc" ${state.sortBy === 'name-desc' ? 'selected' : ''}>Nombre (Z-A)</option>
                <option value="goals-desc" ${state.sortBy === 'goals-desc' ? 'selected' : ''}>Más Goles</option>
                <option value="goals-asc" ${state.sortBy === 'goals-asc' ? 'selected' : ''}>Menos Goles</option>
                <option value="matches-desc" ${state.sortBy === 'matches-desc' ? 'selected' : ''}>Más Partidos</option>
                <option value="matches-asc" ${state.sortBy === 'matches-asc' ? 'selected' : ''}>Menos Partidos</option>
              </select>
              <form onsubmit="addPlayer(event)" class="flex items-center gap-2">
                <input 
                  id="new-player-name"
                  type="text" 
                  placeholder="Nuevo jugador..." 
                  class="text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-32 sm:w-48 shadow-sm"
                />
                <button type="submit" class="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10">
                  <span class="w-4 h-4 block">${Icons.Plus}</span>
                </button>
              </form>
            </div>
          </div>
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="divide-y divide-slate-50">
              ${sortedPlayers.length === 0 ? `
                <div class="p-12 text-center">
                  <p class="text-slate-400 font-medium">No hay jugadores en este equipo.</p>
                </div>
              ` : sortedPlayers.map((player) => `
                <div class="p-4 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-all group" onclick="fetchPlayerStats(${JSON.stringify(player).replace(/"/g, '&quot;')})">
                  ${state.editingPlayerId === player.id ? `
                    <div class="flex items-center gap-2 flex-1" onclick="event.stopPropagation()">
                      <input 
                        autofocus
                        type="text"
                        value="${state.editName}"
                        oninput="handleEditNameChange(event)"
                        onkeydown="if(event.key === 'Enter') updatePlayer('${player.id}')"
                        class="flex-1 p-2 text-sm font-bold rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button onclick="updatePlayer('${player.id}')" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                        <span class="w-4 h-4 block">${Icons.Check}</span>
                      </button>
                      <button onclick="state.editingPlayerId = null; render()" class="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                        <span class="w-4 h-4 block">${Icons.X}</span>
                      </button>
                    </div>
                  ` : `
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                      ${renderPlayerAvatar(player, 'w-12 h-12')}
                      <div class="flex flex-col min-w-0">
                        <span class="font-bold text-slate-800 truncate text-base">${player.name}</span>
                        <div class="flex items-center gap-3 mt-0.5">
                          <span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">
                            ${player.totalGoals || 0} ${player.totalGoals === 1 ? 'GOL' : 'GOLES'}
                          </span>
                          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            ${player.totalMatches || 0} ${player.totalMatches === 1 ? 'PARTIDO' : 'PARTIDOS'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button onclick="event.stopPropagation(); setEditingPlayer('${player.id}', '${player.name}')" class="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                        <span class="w-4 h-4 block">${Icons.Edit2}</span>
                      </button>
                      <button onclick="event.stopPropagation(); confirmDeletePlayer(${JSON.stringify(player).replace(/"/g, '&quot;')})" class="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                        <span class="w-4 h-4 block">${Icons.Trash2}</span>
                      </button>
                      <span class="w-5 h-5 block text-slate-300 group-hover:text-indigo-600 transition-colors ml-2">${Icons.ChevronRight}</span>
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- Recent Matches -->
        <div class="lg:col-span-4 space-y-8">
          <section>
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 block text-indigo-600">${Icons.History}</span>
                <h2 class="text-sm font-black uppercase tracking-widest text-slate-700">Últimos Partidos</h2>
              </div>
              ${state.matches.length === 0 ? `
                <div class="p-12 text-center">
                  <span class="w-12 h-12 text-slate-200 mx-auto mb-3 block">${Icons.Calendar}</span>
                  <p class="text-slate-500 text-sm">No hay partidos registrados aún.</p>
                </div>
              ` : `
                <div class="divide-y divide-slate-50">
                  ${state.matches.map((match) => {
                    const [f, a] = (match.result || '0-0').split("-").map(n => parseInt(n.trim()));
                    let resultColor = 'bg-slate-900';
                    if (!isNaN(f) && !isNaN(a)) {
                      if (f > a) resultColor = 'bg-emerald-500';
                      else if (f < a) resultColor = 'bg-red-500';
                      else resultColor = 'bg-amber-500';
                    }
                    return `
                    <div class="p-4 group hover:bg-slate-50/80 transition-all">
                      <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Jornada ${match.matchday}</span>
                        <div class="flex items-center gap-1.5">
                          <button onclick="editMatch('${match.id}')" class="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                            <span class="w-3.5 h-3.5 block">${Icons.Edit2}</span>
                          </button>
                          <button onclick="confirmDeleteMatch(${JSON.stringify(match).replace(/"/g, '&quot;')})" class="p-1.5 text-slate-300 hover:text-red-600 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                            <span class="w-3.5 h-3.5 block">${Icons.Trash2}</span>
                          </button>
                          <span class="text-sm font-black ${resultColor} text-white px-2.5 py-1 rounded-lg tabular-nums shadow-sm ml-1">${match.result}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <h4 class="font-bold text-slate-800 text-sm truncate">vs ${match.opponent}</h4>
                      </div>
                    </div>
                  `}).join('')}
                </div>
              `}
            </div>
          </section>

          <section>
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 block text-indigo-600">${Icons.Trophy}</span>
                <h2 class="text-sm font-black uppercase tracking-widest text-slate-700">Balance Global</h2>
              </div>
              <div class="p-6 space-y-5">
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">Partidos Jugados</span>
                  <span class="text-lg font-black text-slate-900">${state.teamStats?.totalMatches || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">Goles Totales</span>
                  <span class="text-lg font-black text-emerald-600">${state.teamStats?.goalsFor || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">Goles Contra</span>
                  <span class="text-lg font-black text-red-500">${state.teamStats?.goalsAgainst || 0}</span>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-slate-50">
                  <span class="text-slate-500 text-xs font-bold uppercase tracking-wider">Media Goles/Partido</span>
                  <span class="text-lg font-black text-indigo-600">${state.teamStats?.avgGoalsFor || 0}</span>
                </div>
              </div>
            </div>
          </section>

          ${renderWarnings()}
        </div>
      </div>
    </div>
  `;
}

function renderWarnings() {
  const apercibidos = state.players.filter(p => (p.totalYellowCards || 0) > 0 && ((p.totalYellowCards || 0) + 1) % 5 === 0);
  if (apercibidos.length === 0) return '';

  return `
    <section>
      <div class="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
        <div class="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
          <span class="w-5 h-5 block text-amber-600">${Icons.AlertCircle}</span>
          <h2 class="text-sm font-black uppercase tracking-widest text-amber-900">Jugadores Apercibidos</h2>
        </div>
        <div class="p-6">
          <p class="text-amber-700 text-xs font-medium mb-5">Los siguientes jugadores están a una tarjeta amarilla de la suspensión:</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${apercibidos.map(player => `
              <div class="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between shadow-sm">
                <span class="font-bold text-slate-800 text-sm truncate">${player.name}</span>
                <span class="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">${player.totalYellowCards}A</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPlayerDetail() {
  const { selectedPlayer: player, playerSummary: summary } = state;
  if (!player || !summary) return '';

  return `
    <div class="space-y-8">
      <button onclick="setView('dashboard')" class="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium">
        <span class="w-4 h-4 block">${Icons.ArrowLeft}</span>
        Volver al Dashboard
      </button>

      <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
          ${renderPlayerAvatar(player, 'w-32 h-32')}
          <div class="flex-1 text-center md:text-left">
            <h2 class="text-3xl font-black tracking-tight mb-2">${player.name}</h2>
            <div class="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div class="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partidos</p>
                <p class="text-xl font-bold text-slate-800">${summary.matchesPlayed}</p>
              </div>
              <div class="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Goles</p>
                <p class="text-xl font-bold text-indigo-600">${summary.totalGoals}</p>
              </div>
              <div class="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                <p class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Amarillas</p>
                <p class="text-xl font-bold text-amber-600">${summary.totalYellowCards}</p>
              </div>
              <div class="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                <p class="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Doble Am.</p>
                <p class="text-xl font-bold text-orange-600">${summary.totalDoubleYellowCards}</p>
              </div>
              <div class="bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                <p class="text-[10px] font-bold text-red-400 uppercase tracking-wider">Rojas</p>
                <p class="text-xl font-bold text-red-600">${summary.totalRedCards}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <span class="w-6 h-6 block text-indigo-600">${Icons.Clock}</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Minutos Totales</p>
              <p class="text-2xl font-black text-slate-800">${summary.totalMinutes}</p>
            </div>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <span class="w-6 h-6 block text-emerald-600">${Icons.Activity}</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Media Min/Partido</p>
              <p class="text-2xl font-black text-slate-800">${Math.round(summary.avgMinutes)}</p>
            </div>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <span class="w-6 h-6 block text-purple-600">${Icons.Trophy}</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Goles/Partido</p>
              <p class="text-2xl font-black text-slate-800">${summary.matchesPlayed > 0 ? (summary.totalGoals / summary.matchesPlayed).toFixed(2) : '0.00'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Match Form Logic ---
matchFormState = {
  matchday: '',
  opponent: '',
  result: '',
  playerStats: []
};

window.initMatchForm = (matchId) => {
  if (matchId) {
    const match = state.matches.find(m => m.id === matchId);
    if (!match) {
      console.error("Match not found for editing:", matchId);
      state.error = "No se pudo encontrar el partido seleccionado.";
      state.view = 'dashboard';
      state.editingMatchId = null;
      return;
    }
    
    const [local, visitor] = (match.result || '0-0').split('-').map(n => parseInt(n.trim()) || 0);
    matchFormState = {
      matchday: match.matchday,
      opponent: match.opponent,
      result: match.result,
      goalsLocal: local,
      goalsVisitor: visitor,
      playerStats: state.players.map(p => {
        const stat = match.playerStats?.find(s => s.playerId === p.id);
        return {
          playerId: p.id,
          name: p.name,
          photoUrl: p.photoUrl || '',
          minutes: stat ? stat.minutes : 0,
          goals: stat ? stat.goals : 0,
          yellowCards: stat ? stat.yellowCards : 0,
          redCards: stat ? stat.redCards : 0,
          doubleYellowCards: stat ? !!stat.doubleYellowCards : false
        };
      })
    };
  } else {
    matchFormState = {
      matchday: state.matches.length > 0 ? Math.max(...state.matches.map(m => m.matchday)) + 1 : 1,
      opponent: '',
      result: '0-0',
      goalsLocal: 0,
      goalsVisitor: 0,
      playerStats: state.players.map(p => ({
        playerId: p.id,
        name: p.name,
        photoUrl: p.photoUrl || '',
        minutes: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        doubleYellowCards: false
      }))
    };
  }
};

window.handleMatchFormChange = (field, val) => {
  matchFormState[field] = val;
  if (field === 'goalsLocal' || field === 'goalsVisitor') {
    matchFormState.result = `${matchFormState.goalsLocal || 0}-${matchFormState.goalsVisitor || 0}`;
  }
  render();
};

window.handlePlayerStatChange = (playerId, field, val) => {
  const stat = matchFormState.playerStats.find(s => s.playerId === playerId);
  if (stat) {
    if (typeof val === 'boolean') {
      stat[field] = val;
      render();
    } else {
      let numVal = parseInt(val) || 0;
      // Limit minutes to 0-90
      if (field === 'minutes') {
        numVal = Math.min(90, Math.max(0, numVal));
      }
      // Limit cards to maximum 1
      if (field === 'yellowCards' || field === 'redCards') {
        numVal = Math.min(1, Math.max(0, numVal));
      }
      stat[field] = numVal;
      render();
    }
  }
};

window.saveMatch = async (e) => {
  e.preventDefault();
  
  try {
    let matchId = state.editingMatchId;
    if (matchId) {
      await updateDoc(doc(db, `teams/${state.currentTeamId}/matches`, matchId), {
        matchday: parseInt(matchFormState.matchday),
        opponent: matchFormState.opponent,
        result: matchFormState.result
      });
      
      // Update stats (delete and re-add for simplicity in this structure)
      const statsCol = collection(db, `teams/${state.currentTeamId}/matches/${matchId}/stats`);
      const existingStats = await getDocs(statsCol);
      for (const d of existingStats.docs) {
        await deleteDoc(d.ref);
      }
      
      for (const stat of matchFormState.playerStats) {
        await addDoc(statsCol, stat);
      }
    } else {
      const matchRef = await addDoc(collection(db, `teams/${state.currentTeamId}/matches`), {
        matchday: parseInt(matchFormState.matchday),
        opponent: matchFormState.opponent,
        result: matchFormState.result,
        teamId: state.currentTeamId,
        date: serverTimestamp()
      });
      matchId = matchRef.id;
      
      const statsCol = collection(db, `teams/${state.currentTeamId}/matches/${matchId}/stats`);
      for (const stat of matchFormState.playerStats) {
        await addDoc(statsCol, { ...stat, matchId });
      }
    }
    
    state.editingMatchId = null;
    state.view = 'dashboard';
    render();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `teams/${state.currentTeamId}/matches`);
  }
};

function renderMatchForm() {
  if (matchFormState.playerStats.length === 0 && state.players.length > 0) {
    window.initMatchForm(state.editingMatchId);
  }

  if (state.players.length === 0) {
    return `
      <div class="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div class="bg-amber-100 p-4 rounded-full text-amber-600">
          <span class="w-8 h-8 block">${Icons.AlertCircle}</span>
        </div>
        <div>
          <h3 class="text-xl font-bold text-slate-900">No hay jugadores</h3>
          <p class="text-slate-500">Debes añadir jugadores a tu equipo antes de crear un partido.</p>
        </div>
        <button onclick="setView('dashboard')" class="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
          Volver al Panel
        </button>
      </div>
    `;
  }

  return `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-black tracking-tight">${state.editingMatchId ? 'Editar Partido' : 'Nuevo Partido'}</h2>
        <button onclick="setView('dashboard')" class="text-slate-400 hover:text-slate-600">
          <span class="w-6 h-6 block">${Icons.X}</span>
        </button>
      </div>

      <form onsubmit="saveMatch(event)" class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Jornada</label>
            <input 
              type="number" 
              required
              value="${matchFormState.matchday}"
              oninput="handleMatchFormChange('matchday', this.value)"
              class="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Rival</label>
            <input 
              type="text" 
              required
              placeholder="Nombre del equipo rival"
              value="${matchFormState.opponent}"
              oninput="handleMatchFormChange('opponent', this.value)"
              class="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Marcador</label>
            <div class="flex items-center gap-3">
              <div class="flex-1">
                <input 
                  type="number" 
                  min="0"
                  placeholder="Local"
                  value="${matchFormState.goalsLocal}"
                  onchange="handleMatchFormChange('goalsLocal', this.value)"
                  class="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-xl bg-slate-50"
                />
                <span class="text-[10px] text-slate-400 font-bold uppercase block text-center mt-1 truncate px-1">
                  ${state.teams.find(t => t.id === state.currentTeamId)?.name || 'Local'}
                </span>
              </div>
              <span class="text-2xl font-black text-slate-300">-</span>
              <div class="flex-1">
                <input 
                  type="number" 
                  min="0"
                  placeholder="Rival"
                  value="${matchFormState.goalsVisitor}"
                  onchange="handleMatchFormChange('goalsVisitor', this.value)"
                  class="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-xl bg-slate-50"
                />
                <span class="text-[10px] text-slate-400 font-bold uppercase block text-center mt-1 truncate px-1">
                  ${matchFormState.opponent || 'Rival'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 class="font-bold text-slate-800">Estadísticas de Jugadores</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th class="px-6 py-4">Jugador</th>
                  <th class="px-6 py-4 w-24">Minutos</th>
                  <th class="px-6 py-4 w-24">Goles</th>
                  <th class="px-6 py-4 w-24">Am.</th>
                  <th class="px-6 py-4 w-24">Doble Am.</th>
                  <th class="px-6 py-4 w-24">Rojas</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                ${matchFormState.playerStats.map(stat => `
                  <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        ${renderPlayerAvatar(stat, 'w-8 h-8')}
                        <span class="font-medium text-slate-700">${stat.name}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <input 
                        type="number" 
                        min="0"
                        max="90"
                        value="${stat.minutes}"
                        onchange="handlePlayerStatChange('${stat.playerId}', 'minutes', this.value)"
                        class="w-16 p-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-sm"
                      />
                    </td>
                    <td class="px-6 py-4">
                      <input 
                        type="number" 
                        min="0"
                        value="${stat.goals}"
                        onchange="handlePlayerStatChange('${stat.playerId}', 'goals', this.value)"
                        class="w-16 p-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-sm"
                      />
                    </td>
                    <td class="px-6 py-4">
                      <input 
                        type="number" 
                        min="0"
                        max="1"
                        value="${stat.yellowCards}"
                        ${stat.doubleYellowCards ? 'disabled' : ''}
                        onchange="handlePlayerStatChange('${stat.playerId}', 'yellowCards', this.value)"
                        class="w-16 p-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-sm ${stat.doubleYellowCards ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}"
                      />
                    </td>
                    <td class="px-6 py-4">
                      <button 
                        type="button"
                        onclick="handlePlayerStatChange('${stat.playerId}', 'doubleYellowCards', ${!stat.doubleYellowCards})"
                        class="w-full py-2 rounded-lg border ${stat.doubleYellowCards ? 'bg-orange-500 border-orange-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'} transition-all flex items-center justify-center gap-1"
                      >
                        <span class="text-[10px] font-bold uppercase">${stat.doubleYellowCards ? 'SÍ' : 'NO'}</span>
                      </button>
                    </td>
                    <td class="px-6 py-4">
                      <input 
                        type="number" 
                        min="0"
                        max="1"
                        value="${stat.redCards}"
                        onchange="handlePlayerStatChange('${stat.playerId}', 'redCards', this.value)"
                        class="w-16 p-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-sm"
                      />
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex gap-4 justify-end">
          <button type="button" onclick="setView('dashboard')" class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">
            Cancelar
          </button>
          <button type="submit" class="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
            <span class="w-5 h-5 block">${Icons.Save}</span>
            Guardar Partido
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderModals() {
  let modalHtml = '';
  if (state.playerToDelete) {
    modalHtml += `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <div class="bg-red-100 p-2 rounded-lg">
              <span class="w-6 h-6 block text-red-600">${Icons.AlertCircle}</span>
            </div>
            <button onclick="state.playerToDelete = null; render()" class="text-slate-400 hover:text-slate-600">
              <span class="w-5 h-5 block">${Icons.X}</span>
            </button>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">¿Eliminar jugador?</h3>
          <p class="text-slate-500 mb-6">
            Estás a punto de eliminar a <span class="font-bold text-slate-800">${state.playerToDelete.name}</span>. 
            Esta acción borrará también todas sus estadísticas y no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button class="flex-1 px-4 py-2 rounded-xl font-medium border border-slate-200 hover:bg-slate-50" onclick="state.playerToDelete = null; render()">
              Cancelar
            </button>
            <button class="flex-1 px-4 py-2 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600" onclick="deletePlayer()">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
  }
  if (state.matchToDelete) {
    modalHtml += `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <div class="bg-red-100 p-2 rounded-lg">
              <span class="w-6 h-6 block text-red-600">${Icons.AlertCircle}</span>
            </div>
            <button onclick="state.matchToDelete = null; render()" class="text-slate-400 hover:text-slate-600">
              <span class="w-5 h-5 block">${Icons.X}</span>
            </button>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">¿Eliminar partido?</h3>
          <p class="text-slate-500 mb-6">
            Estás a punto de eliminar el partido de la <span class="font-bold text-slate-800">Jornada ${state.matchToDelete.matchday}</span> contra <span class="font-bold text-slate-800">${state.matchToDelete.opponent}</span>.
            Esta acción no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button class="flex-1 px-4 py-2 rounded-xl font-medium border border-slate-200 hover:bg-slate-50" onclick="state.matchToDelete = null; render()">
              Cancelar
            </button>
            <button class="flex-1 px-4 py-2 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600" onclick="deleteMatch()">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
  }
  if (state.teamToDelete) {
    modalHtml += `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <div class="bg-red-100 p-2 rounded-lg">
              <span class="w-6 h-6 block text-red-600">${Icons.AlertCircle}</span>
            </div>
            <button onclick="state.teamToDelete = null; render()" class="text-slate-400 hover:text-slate-600">
              <span class="w-5 h-5 block">${Icons.X}</span>
            </button>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">¿Eliminar equipo?</h3>
          <p class="text-slate-500 mb-6">
            Estás a punto de eliminar el equipo <span class="font-bold text-slate-800">${state.teamToDelete.name}</span>. 
            Esta acción borrará todos sus jugadores y partidos asociados y no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button class="flex-1 px-4 py-2 rounded-xl font-medium border border-slate-200 hover:bg-slate-50" onclick="state.teamToDelete = null; render()">
              Cancelar
            </button>
            <button class="flex-1 px-4 py-2 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600" onclick="deleteTeam()">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
  }
  return modalHtml;
}

// --- Initialization ---
render();

