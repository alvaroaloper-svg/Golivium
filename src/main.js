import './index.css';
import * as XLSX from 'xlsx';
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
  setDoc,
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
  state.loading = false;
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
  Download: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  Refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
  User: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  ArrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  Save: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  Clock: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  Loader: '<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
};

let matchFormState = {
  matchday: 1,
  opponent: '',
  result: '0-0',
  goalsLocal: 0,
  goalsVisitor: 0,
  ownGoals: 0,
  playerStats: [],
  validationError: null,
  saving: false
};

// --- State ---
window.state = {
  view: 'dashboard', // 'dashboard', 'new-match', 'player-detail', 'profile', 'join-team', 'invite-coach'
  user: null,
  userData: null,
  authReady: false,
  onboardingComplete: localStorage.getItem('onboardingComplete') === 'true',
  teams: [],
  currentTeamId: null,
  currentTeam: null,
  teamToDelete: null,
  players: [],
  matches: [],
  teamStats: null,
  selectedPlayer: null,
  playerSummary: null,
  guestMode: false,
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
  inviteCode: null,
  joinCode: '',
  teamMembers: [],
  viewingCodeInput: '',
  editViewingCode: '',
};

// --- Auth Functions ---
window.login = async () => {
  state.loading = true;
  render();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save user to Firestore
    const userRef = doc(db, 'users', user.uid);
    const userData = {
      google_id: user.uid,
      name: user.displayName,
      email: user.email,
      avatar_url: user.photoURL,
      role: user.email === 'alvaro.aloper@gmail.com' ? 'admin' : 'user',
      created_at: serverTimestamp(),
    };
    
    // Check if user exists first to not overwrite created_at if not needed
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await updateDoc(userRef, userData).catch(async () => {
        // If update fails, it doesn't exist, so set it
        const { created_at, ...rest } = userData;
        await setDoc(userRef, { ...rest, created_at: serverTimestamp() });
      });
    } else {
      // Update existing user data (except created_at)
      const { created_at, ...updateData } = userData;
      await updateDoc(userRef, updateData);
    }
    
    state.userData = (await getDoc(userRef)).data();
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      state.loading = false;
      state.error = "Has cerrado la ventana de inicio de sesión.";
      render();
    } else {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }
};

window.loginAsGuest = async () => {
  state.guestMode = true;
  state.user = { uid: 'guest', isGuest: true, displayName: 'Invitado', photoURL: 'https://picsum.photos/seed/guest/200/200' };
  state.teams = [];
  state.currentTeamId = null;
  state.currentTeam = null;
  render();
};

window.startOnboarding = () => {
  state.onboardingComplete = true;
  localStorage.setItem('onboardingComplete', 'true');
  render();
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

onAuthStateChanged(auth, async (user) => {
  if (state.guestMode && !user) return; // Don't overwrite guest session
  state.user = user;
  state.authReady = true;
  render();
  if (user) {
    try {
      // Fetch user data
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        state.userData = userSnap.data();
      } else {
        // Create user if doesn't exist (e.g. first login)
        const userData = {
          google_id: user.uid,
          name: user.displayName,
          email: user.email,
          avatar_url: user.photoURL,
          role: user.email === 'alvaro.aloper@gmail.com' ? 'admin' : 'user',
          created_at: serverTimestamp(),
        };
        await setDoc(userRef, userData);
        state.userData = userData;
      }
      fetchTeams();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    }
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
  if (!state.user || state.guestMode) return;
  if (unsubTeams) unsubTeams();
  
  // Query team_members where user_id == uid
  const q = query(
    collection(db, 'team_members'), 
    where('user_id', '==', state.user.uid)
  );
  
  unsubTeams = onSnapshot(q, async (snapshot) => {
    const teamIds = snapshot.docs.map(doc => doc.data().team_id);
    if (teamIds.length === 0) {
      state.teams = [];
      state.loading = false;
      render();
      return;
    }
    
    // Fetch each team
    const teamsData = [];
    for (const teamId of teamIds) {
      try {
        const teamSnap = await getDoc(doc(db, 'teams', teamId));
        if (teamSnap.exists()) {
          teamsData.push({ id: teamSnap.id, ...teamSnap.data() });
        }
      } catch (e) {
        console.error(`Error fetching team ${teamId}:`, e);
      }
    }
    
    state.teams = teamsData.sort((a, b) => a.name.localeCompare(b.name));
    
    if (state.teams.length > 0) {
      if (!state.currentTeamId || !state.teams.find(t => t.id === state.currentTeamId)) {
        state.currentTeamId = state.teams[0].id;
      }
      state.currentTeam = state.teams.find(t => t.id === state.currentTeamId);
      fetchInitialData(state.currentTeamId);
    } else {
      state.loading = false;
      render();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'team_members'));
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
  state.teamMembers = [];
  state.currentTeam = state.teams.find(t => t.id === teamId);
  render();

  if (unsubPlayers) unsubPlayers();
  if (unsubMatches) unsubMatches();

  // Listen to Members
  const membersQ = query(collection(db, 'team_members'), where('team_id', '==', teamId));
  onSnapshot(membersQ, async (snapshot) => {
    const membersData = [];
    for (const memberDoc of snapshot.docs) {
      const member = memberDoc.data();
      try {
        // Only try to fetch user details if authenticated or if it's a known public admin
        // Guests might not have permission to read all users
        const userSnap = await getDoc(doc(db, 'users', member.user_id));
        if (userSnap.exists()) {
          membersData.push({ ...member, ...userSnap.data() });
        } else {
          membersData.push({ ...member, name: 'Usuario' });
        }
      } catch (e) {
        console.warn(`Could not fetch user ${member.user_id} (likely permission issue for guest):`, e);
        membersData.push({ ...member, name: 'Miembro del equipo' });
      }
    }
    state.teamMembers = membersData;
    render();
  }, (error) => {
    if (state.guestMode && (error.code === 'permission-denied' || error.message?.includes('permissions'))) {
      console.warn("Guest mode: No permission to list team members. This is expected if the team is not fully public or rules are restrictive.");
      state.teamMembers = [];
      render();
      return;
    }
    handleFirestoreError(error, OperationType.LIST, 'team_members');
  });

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
  let totalOwnGoals = 0;

  state.matches.forEach(m => {
    const [f, a] = m.result.split("-").map(n => parseInt(n.trim()));
    if (!isNaN(f) && !isNaN(a)) {
      goalsFor += f;
      goalsAgainst += a;
    }
    totalOwnGoals += (m.ownGoals || 0);
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
    totalPlayerGoals: totalGoals,
    totalOwnGoals: totalOwnGoals
  };
}

window.exportToExcel = () => {
  if (!state.currentTeam) return;
  
  const teamName = state.currentTeam.name;
  const wb = XLSX.utils.book_new();
  
  // 1. Players Sheet
  const playersData = state.players.map(p => ({
    'Nombre': p.name,
    'Partidos Jugados': p.totalMatches || 0,
    'Goles': p.totalGoals || 0,
    'Tarjetas Amarillas': p.totalYellowCards || 0,
    'Doble Amarilla': p.totalDoubleYellowCards || 0,
    'Tarjetas Rojas': p.totalRedCards || 0
  }));
  const wsPlayers = XLSX.utils.json_to_sheet(playersData);
  XLSX.utils.book_append_sheet(wb, wsPlayers, "Plantilla");
  
  // 2. Matches Sheet
  const matchesData = state.matches.map(m => ({
    'Jornada': m.matchday,
    'Rival': m.opponent,
    'Resultado': m.result,
    'Goles Propios': m.ownGoals || 0
  }));
  const wsMatches = XLSX.utils.json_to_sheet(matchesData);
  XLSX.utils.book_append_sheet(wb, wsMatches, "Partidos");
  
  // Write and download
  XLSX.writeFile(wb, `${teamName}_Estadisticas.xlsx`);
};

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
  state.loading = true;
  render();
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      name: state.newTeamName.trim(),
      owner_id: state.user.uid,
      created_at: serverTimestamp()
    });
    
    // Create member entry for owner
    const memberId = `${state.user.uid}_${docRef.id}`;
    await setDoc(doc(db, 'team_members', memberId), {
      team_id: docRef.id,
      user_id: state.user.uid,
      role: 'owner'
    });
    
    state.currentTeamId = docRef.id;
    state.newTeamName = '';
    state.isAddingTeam = false;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'teams');
  }
};

window.generateInviteCode = async () => {
  if (!state.currentTeamId) return;
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const inviteRef = doc(db, 'invite_codes', code);
  await setDoc(inviteRef, {
    team_id: state.currentTeamId,
    code: code,
    created_by: state.user.uid,
    used: false,
    created_at: serverTimestamp(),
  });
  state.inviteCode = code;
  render();
};

window.joinTeamWithCode = async () => {
  if (!state.joinCode) return;
  state.loading = true;
  render();
  try {
    const inviteRef = doc(db, 'invite_codes', state.joinCode.trim().toUpperCase());
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists() || inviteSnap.data().used) {
      state.error = "Código inválido o ya usado.";
      state.loading = false;
      render();
      return;
    }
    
    const inviteData = inviteSnap.data();
    
    // Add member
    const memberId = `${state.user.uid}_${inviteData.team_id}`;
    await setDoc(doc(db, 'team_members', memberId), {
      team_id: inviteData.team_id,
      user_id: state.user.uid,
      role: 'coach',
      invite_code: inviteSnap.id
    });
    
    // Mark code as used
    await updateDoc(inviteRef, { used: true });
    
    state.joinCode = '';
    state.view = 'dashboard';
    state.currentTeamId = inviteData.team_id;
    fetchTeams();
  } catch (error) {
    console.error("Error joining team:", error);
    state.error = "Error al unirse al equipo.";
    state.loading = false;
    render();
  }
};

window.setEditingTeam = (id, name, viewingCode) => {
  state.editingTeamId = id;
  state.editTeamName = name;
  state.editViewingCode = viewingCode || '';
  render();
};

window.handleEditViewingCodeChange = (e) => {
  state.editViewingCode = e.target.value.toUpperCase().replace(/[^A-Z0-9Ñ]/g, '').substring(0, 10);
};

window.handleViewingCodeInput = (el) => {
  const val = el.value.toUpperCase().replace(/[^A-Z0-9Ñ]/g, '').substring(0, 10);
  state.viewingCodeInput = val;
  el.value = val;
};

window.updateTeam = async (id) => {
  if (!state.editTeamName.trim()) return;
  state.loading = true;
  render();
  try {
    const teamRef = doc(db, 'teams', id);
    const teamSnap = await getDoc(teamRef);
    const oldViewingCode = teamSnap.data().viewingCode;
    const newViewingCode = state.editViewingCode.trim();

    // 1. Update Team document
    await updateDoc(teamRef, {
      name: state.editTeamName.trim(),
      viewingCode: newViewingCode || null
    });

    // 2. Manage viewing_codes collection
    if (oldViewingCode && oldViewingCode !== newViewingCode) {
      await deleteDoc(doc(db, 'viewing_codes', oldViewingCode));
    }
    if (newViewingCode && newViewingCode !== oldViewingCode) {
      // Check if code is already taken
      const codeRef = doc(db, 'viewing_codes', newViewingCode);
      const codeSnap = await getDoc(codeRef);
      if (codeSnap.exists() && codeSnap.data().teamId !== id) {
        state.error = "Ese código ya está en uso por otro equipo.";
        state.loading = false;
        render();
        return;
      }
      await setDoc(codeRef, { teamId: id });
    }

    state.editingTeamId = null;
    state.loading = false;
    fetchTeams();
  } catch (error) {
    state.loading = false;
    handleFirestoreError(error, OperationType.UPDATE, `teams/${id}`);
  }
};

window.joinTeamWithViewingCode = async () => {
  if (!state.viewingCodeInput) return;
  state.loading = true;
  state.error = null;
  render();
  
  try {
    const code = state.viewingCodeInput.trim().toUpperCase();
    const codeRef = doc(db, 'viewing_codes', code);
    const codeSnap = await getDoc(codeRef);
    
    if (codeSnap.exists()) {
      const teamId = codeSnap.data().teamId;
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = { id: teamSnap.id, ...teamSnap.data() };
        state.teams = [teamData];
        state.currentTeamId = teamId;
        state.currentTeam = teamData;
        state.viewingCodeInput = '';
        state.loading = false;
        fetchInitialData(teamId);
        render();
      } else {
        state.error = "El equipo asociado al código ya no existe.";
        state.loading = false;
        render();
      }
    } else {
      state.error = "Código de equipo no válido.";
      state.loading = false;
      render();
    }
  } catch (error) {
    console.error("Error joining with viewing code:", error);
    if (error.code === 'permission-denied') {
      state.error = "Permiso denegado. Asegúrate de que el código es correcto.";
    } else {
      state.error = "Error al buscar el equipo.";
    }
    state.loading = false;
    render();
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
    const teamSnap = await getDoc(doc(db, 'teams', id));
    const viewingCode = teamSnap.data()?.viewingCode;
    if (viewingCode) {
      await deleteDoc(doc(db, 'viewing_codes', viewingCode));
    }
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
  const clickHandler = (id && !state.guestMode) ? `onclick="event.stopPropagation(); triggerPhotoUpload('${id}')"` : '';
  const cursorClass = (id && !state.guestMode) ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all' : '';

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
  
  // Save focus and selection
  const activeId = document.activeElement?.id;
  const selectionStart = document.activeElement?.selectionStart;
  const selectionEnd = document.activeElement?.selectionEnd;

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

  if (!state.user || (state.guestMode && !state.currentTeamId)) {
    if (!state.user && !state.onboardingComplete) {
      app.innerHTML = renderOnboarding();
    } else {
      app.innerHTML = renderLogin();
    }
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

  // Restore focus and selection
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      try {
        if (typeof selectionStart === 'number' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && ['text', 'search', 'url', 'tel', 'password', 'email'].includes(el.type || 'text')) {
          el.setSelectionRange(selectionStart, selectionEnd);
        }
      } catch (e) {
        // Selection range not supported for this type
      }
    }
  }
}

function renderOnboarding() {
  return `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full text-center relative overflow-hidden">
        <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        <div class="relative z-10">
          <div class="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-600/30 transform -rotate-6">
            <span class="w-10 h-10 block text-white font-black text-2xl flex items-center justify-center">G</span>
          </div>
          
          <h1 class="text-5xl font-black tracking-tighter mb-2 text-indigo-600">GOLIVIUM</h1>
          <h2 class="text-3xl font-bold tracking-tight mb-6 text-slate-900">Tu Equipo, Tus Reglas, Tus Estadísticas</h2>
          
          <div class="space-y-6 text-left mb-10">
            <div class="flex gap-4">
              <div class="bg-indigo-100 p-3 rounded-2xl shrink-0 h-fit text-indigo-600">
                <span class="w-6 h-6 block">${Icons.Users}</span>
              </div>
              <div>
                <h4 class="font-bold text-slate-800">Gestiona tu Plantilla</h4>
                <p class="text-slate-500 text-sm">Añade jugadores, ponles cara con fotos y sigue su evolución partido a partido.</p>
              </div>
            </div>
            
            <div class="flex gap-4">
              <div class="bg-emerald-100 p-3 rounded-2xl shrink-0 h-fit text-emerald-600">
                <span class="w-6 h-6 block">${Icons.Calendar}</span>
              </div>
              <div>
                <h4 class="font-bold text-slate-800">Registra cada Partido</h4>
                <p class="text-slate-500 text-sm">Anota goles, minutos jugados y tarjetas. Todo el historial de tu equipo en un solo lugar.</p>
              </div>
            </div>
            
            <div class="flex gap-4">
              <div class="bg-amber-100 p-3 rounded-2xl shrink-0 h-fit text-amber-600">
                <span class="w-6 h-6 block">${Icons.TrendingUp}</span>
              </div>
              <div>
                <h4 class="font-bold text-slate-800">Análisis Detallado</h4>
                <p class="text-slate-500 text-sm">Visualiza quién es el pichichi, quién está apercibido y cómo va el balance de goles del equipo.</p>
              </div>
            </div>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-4">
            <button onclick="startOnboarding()" class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wider">
              Empezar
            </button>
            <button onclick="startOnboarding()" class="flex-1 py-4 bg-white text-slate-600 border-2 border-slate-100 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-200 active:scale-95 transition-all uppercase tracking-wider">
              Ya tengo cuenta
            </button>
          </div>
          
          <p class="mt-8 text-slate-400 text-xs font-medium">Únete a cientos de entrenadores que ya profesionalizan su equipo.</p>
        </div>
      </div>
    </div>
  `;
}

function renderLogin() {
  if (state.guestMode && !state.currentTeamId) {
    return `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-md w-full text-center">
          <div class="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/20">
            <span class="w-8 h-8 block text-white font-black text-xl flex items-center justify-center">G</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight mb-2">Modo Invitado</h2>
          <p class="text-slate-500 mb-8">Introduce el código de visualización del equipo para continuar.</p>
          
          <div class="space-y-4">
            <input 
              id="guest-code-input"
              type="text" 
              placeholder="Código de equipo..." 
              maxlength="10"
              value="${state.viewingCodeInput}"
              oninput="handleViewingCodeInput(this); render()"
              class="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none text-center font-black tracking-widest uppercase"
            />
            
            <button 
              id="join-team-btn"
              onclick="joinTeamWithViewingCode()" 
              class="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group text-sm"
              ${!state.viewingCodeInput || state.loading ? 'disabled opacity-50' : ''}
            >
              ${state.loading ? Icons.Loader : Icons.Check}
              Ver Equipo
            </button>
            
            <div class="grid grid-cols-2 gap-3">
              <button onclick="state.guestMode = false; state.user = null; render()" class="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm">
                Volver
              </button>
              <button onclick="login()" class="py-3 bg-white text-indigo-600 border border-indigo-100 rounded-xl font-bold hover:bg-indigo-50 transition-all text-sm">
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-md w-full text-center">
        <div class="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/20">
          <span class="w-8 h-8 block text-white font-black text-xl flex items-center justify-center">G</span>
        </div>
        <h1 class="text-3xl font-black tracking-tighter mb-1 text-indigo-600">GOLIVIUM</h1>
        <h2 class="text-xl font-bold tracking-tight mb-2">Acceso a la App</h2>
        <p class="text-slate-500 mb-8">Inicia sesión con tu cuenta de Google para acceder a tus equipos.</p>
        
        ${state.loading ? `
          <div class="py-4 flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p class="text-xs font-bold text-indigo-600 uppercase tracking-widest">Conectando...</p>
          </div>
        ` : `
          <button onclick="login()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 group">
            <svg class="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Entrar con Google
          </button>
          <button onclick="loginAsGuest()" class="w-full mt-4 py-4 bg-white text-slate-600 border-2 border-slate-100 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3 group">
            <span class="w-5 h-5 block group-hover:scale-110 transition-transform">${Icons.Users}</span>
            Entrar como invitado
          </button>
        `}
        
        <button onclick="state.onboardingComplete = false; render()" class="mt-6 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
          Ver explicación de nuevo
        </button>
      </div>
    </div>
  `;
}

function renderHeader() {
  const isOwner = state.currentTeam && state.currentTeam.owner_id === state.user.uid;

  return `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 cursor-pointer shrink-0" onclick="setView('dashboard')">
          <div class="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/20">
            <span class="w-5 h-5 block text-white font-black text-xs flex items-center justify-center">G</span>
          </div>
          <h1 class="font-black text-lg tracking-tighter hidden md:block text-indigo-600">GOLIVIUM</h1>
        </div>

        <div class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-2">
          ${state.teams.map(team => `
            <div class="relative group flex items-center shrink-0">
              <button
                onclick="setCurrentTeam('${team.id}')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  state.currentTeamId === team.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'text-slate-500 hover:bg-slate-100'
                }"
              >
                ${team.name}
                ${state.currentTeamId === team.id && team.owner_id === state.user.uid && !state.guestMode ? `
                  <div class="flex items-center gap-1 ml-1">
                    <span class="w-3 h-3 block opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onclick="event.stopPropagation(); setEditingTeam('${team.id}', '${team.name}', '${team.viewingCode || ''}')">
                      ${Icons.Edit2}
                    </span>
                    <span class="w-3 h-3 block opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-red-200 hover:text-red-400" onclick="event.stopPropagation(); confirmDeleteTeam('${team.id}', '${team.name}')">
                      ${Icons.Trash2}
                    </span>
                  </div>
                ` : ''}
              </button>
            </div>
          `).join('')}
          
          ${!state.guestMode ? (state.isAddingTeam ? `
            <div class="flex items-center bg-white border border-indigo-300 rounded-lg px-2 py-1 shadow-sm shrink-0">
              <input 
                id="header-new-team-input"
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
              <span class="text-xs font-bold">Crear equipo</span>
            </button>
          `) : ''}

          ${!state.guestMode ? `
            <button 
              onclick="setView('join-team')"
              class="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all whitespace-nowrap group shrink-0"
            >
              <span class="w-4 h-4 block text-slate-400 group-hover:text-indigo-600 transition-colors">${Icons.Users}</span>
              <span class="text-xs font-bold">Unirse</span>
            </button>
          ` : ''}
        </div>
        
        <div class="flex items-center gap-2">
          ${state.userData?.role === 'admin' ? `
            <div class="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
              <span class="w-3 h-3 block text-indigo-600">${Icons.Trophy}</span>
              <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Admin</span>
            </div>
          ` : ''}
          ${state.guestMode ? `
            <div class="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg">
              <span class="w-3 h-3 block text-slate-600">${Icons.Users}</span>
              <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest">Invitado</span>
            </div>
          ` : ''}
          ${state.view === 'dashboard' && state.currentTeamId && !state.guestMode ? `
            <button onclick="setView('new-match')" class="shrink-0 text-xs sm:text-sm py-2 bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
              <span class="w-4 h-4 block">${Icons.Plus}</span>
              <span class="hidden sm:inline">Añadir partido</span>
              <span class="sm:hidden">Partido</span>
            </button>
            ${isOwner ? `
              <button onclick="setView('invite-coach')" class="shrink-0 p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all" title="Invitar entrenador">
                <span class="w-5 h-5 block">${Icons.Plus}</span>
              </button>
            ` : ''}
          ` : ''}
          
          <button onclick="setView('profile')" class="w-10 h-10 rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-600 transition-all shrink-0">
            <img src="${state.user.photoURL}" alt="${state.user.displayName}" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderContent() {
  switch (state.view) {
    case 'dashboard':
      return renderDashboard();
    case 'new-match':
      return renderMatchForm();
    case 'player-detail':
      return renderPlayerDetail();
    case 'profile':
      return renderProfile();
    case 'join-team':
      return renderJoinTeam();
    case 'invite-coach':
      return renderInviteCoach();
    default:
      return renderDashboard();
  }
}

function renderProfile() {
  return `
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div class="bg-indigo-600 h-32 relative">
          <button onclick="setView('dashboard')" class="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all">
            <span class="w-5 h-5 block">${Icons.ArrowLeft}</span>
          </button>
        </div>
        <div class="px-8 pb-8">
          <div class="relative -mt-16 mb-6">
            <img src="${state.user.photoURL}" alt="${state.user.displayName}" class="w-32 h-32 rounded-[2rem] border-4 border-white shadow-xl object-cover" referrerPolicy="no-referrer" />
          </div>
          <h2 class="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            ${state.user.displayName}
            ${state.userData?.role === 'admin' ? '<span class="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Admin</span>' : ''}
          </h2>
          <p class="text-slate-500 font-medium mb-8">${state.user.email}</p>
          
          <div class="space-y-4">
            <button onclick="logout()" class="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2">
              <span class="w-5 h-5 block">${Icons.Trash2}</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderJoinTeam() {
  return `
    <div class="max-w-md mx-auto">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div class="flex items-center gap-4 mb-8">
          <button onclick="setView('dashboard')" class="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <span class="w-5 h-5 block text-slate-500">${Icons.ArrowLeft}</span>
          </button>
          <h2 class="text-2xl font-black tracking-tight">Unirse a un equipo</h2>
        </div>
        
        <p class="text-slate-500 mb-6">Introduce el código de invitación que te ha proporcionado el propietario del equipo.</p>
        
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Código de invitación</label>
            <input 
              id="join-team-code-input"
              type="text" 
              placeholder="Ej: ABX92KLM" 
              class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold transition-all uppercase"
              value="${state.joinCode}"
              oninput="state.joinCode = event.target.value; render()"
            />
          </div>
          
          <button onclick="joinTeamWithCode()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all uppercase tracking-wider">
            Unirse al equipo
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderInviteCoach() {
  const team = state.teams.find(t => t.id === state.currentTeamId);
  return `
    <div class="max-w-md mx-auto">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div class="flex items-center gap-4 mb-8">
          <button onclick="setView('dashboard')" class="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <span class="w-5 h-5 block text-slate-500">${Icons.ArrowLeft}</span>
          </button>
          <h2 class="text-2xl font-black tracking-tight">Invitar entrenador</h2>
        </div>
        
        <p class="text-slate-500 mb-6">Genera un código para que otro entrenador pueda colaborar en la gestión de <strong>${team?.name}</strong>.</p>
        
        ${state.inviteCode ? `
          <div class="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-2xl text-center mb-6">
            <p class="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Código generado</p>
            <p class="text-4xl font-black text-indigo-600 tracking-widest">${state.inviteCode}</p>
          </div>
          <p class="text-xs text-slate-400 text-center mb-6">Comparte este código con la persona que quieras invitar.</p>
        ` : ''}
        
        <button onclick="generateInviteCode()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all uppercase tracking-wider">
          ${state.inviteCode ? 'Generar otro código' : 'Generar código de invitación'}
        </button>

        <div class="mt-10">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Miembros del equipo</h3>
          <div class="space-y-3">
            ${state.teamMembers.map(member => `
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div class="flex items-center gap-3">
                  <img src="${member.avatar_url}" class="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <p class="text-sm font-bold text-slate-800">${member.name}</p>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">${member.role === 'owner' ? 'Propietario' : 'Entrenador'}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
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
                  <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter">
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
                    <p class="font-bold text-base leading-tight">${topScorer.name}</p>
                    <p class="text-indigo-400 font-black text-sm mt-0.5">${topScorer.totalGoals} GOLES</p>
                  </div>
                </div>
              ` : ''}
              
              ${lastMatch ? `
                <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-center flex-1 sm:flex-none sm:min-w-[200px]">
                  <p class="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Último Resultado</p>
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-center flex-1 min-w-0">
                      <p class="text-[9px] text-slate-400 font-bold uppercase mb-1">${currentTeam?.name || 'Equipo'}</p>
                      <p class="text-2xl font-black">${lastMatch.result.split('-')[0]}</p>
                    </div>
                    <div class="h-8 w-px bg-white/10 shrink-0"></div>
                    <div class="text-center flex-1 min-w-0">
                      <p class="text-[9px] text-slate-400 font-bold uppercase mb-1">Rival</p>
                      <p class="text-2xl font-black">${lastMatch.result.split('-')[1]}</p>
                    </div>
                  </div>
                  <div class="mt-3 pt-2 border-t border-white/5 text-center">
                    <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">vs ${lastMatch.opponent}</p>
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
              <div class="flex items-center gap-2">
                <div class="relative w-5 h-5" title="Dobles Amarillas">
                  <div class="absolute top-0 left-0 w-3 h-4 bg-amber-400 rounded-sm shadow-sm"></div>
                  <div class="absolute top-1.5 left-1.5 w-3 h-4 bg-amber-400 rounded-sm shadow-sm border-l border-t border-white/40"></div>
                </div>
                <span class="text-2xl font-black text-slate-900">${state.teamStats?.totalDoubleYellowCards || 0}</span>
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
                id="sort-by-select"
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
              ${!state.guestMode ? `
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
              ` : ''}
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
                        id="edit-player-name-${player.id}"
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
                        <span class="font-bold text-slate-800 text-base">${player.name}</span>
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
                      ${!state.guestMode ? `
                        <button onclick="event.stopPropagation(); setEditingPlayer('${player.id}', '${player.name}')" class="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                          <span class="w-4 h-4 block">${Icons.Edit2}</span>
                        </button>
                        <button onclick="event.stopPropagation(); confirmDeletePlayer(${JSON.stringify(player).replace(/"/g, '&quot;')})" class="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                          <span class="w-4 h-4 block">${Icons.Trash2}</span>
                        </button>
                      ` : ''}
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
                          ${!state.guestMode ? `
                            <button onclick="editMatch('${match.id}')" class="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                              <span class="w-3.5 h-3.5 block">${Icons.Edit2}</span>
                            </button>
                            <button onclick="confirmDeleteMatch(${JSON.stringify(match).replace(/"/g, '&quot;')})" class="p-1.5 text-slate-300 hover:text-red-600 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                              <span class="w-3.5 h-3.5 block">${Icons.Trash2}</span>
                            </button>
                          ` : ''}
                          <span class="text-sm font-black ${resultColor} text-white px-2.5 py-1 rounded-lg tabular-nums shadow-sm ml-1">${match.result}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <h4 class="font-bold text-slate-800 text-sm">vs ${match.opponent} ${match.ownGoals ? `<span class="text-[10px] text-slate-400 ml-1 font-black uppercase tracking-tighter">(+${match.ownGoals} Propia)</span>` : ''}</h4>
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
                  <div class="text-right">
                    <span class="text-lg font-black text-emerald-600">${state.teamStats?.goalsFor || 0}</span>
                    ${state.teamStats?.totalOwnGoals > 0 ? `<p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">(${state.teamStats.totalOwnGoals} Propia)</p>` : ''}
                  </div>
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
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${apercibidos.map(player => `
              <div class="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-sm">
                <span class="font-bold text-slate-800 text-sm">${player.name}</span>
                <span class="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shrink-0">${player.totalYellowCards}A</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="mt-12 mb-8 flex justify-center">
        <button onclick="exportToExcel()" class="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-95 text-sm uppercase tracking-wider">
          <span class="w-5 h-5 block">${Icons.Download}</span>
          Exportar Datos a Excel
        </button>
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
      ownGoals: match.ownGoals || 0,
      validationError: null,
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
      ownGoals: 0,
      validationError: null,
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
    } else if (field === 'yellowCards' || field === 'redCards') {
      // Toggle logic for cards
      stat[field] = stat[field] > 0 ? 0 : 1;
      render();
    } else {
      let numVal = parseInt(val) || 0;
      // Limit minutes to 0-90
      if (field === 'minutes') {
        numVal = Math.min(90, Math.max(0, numVal));
      }
      stat[field] = numVal;
      render();
    }
  }
};

window.saveMatch = async (e) => {
  e.preventDefault();
  if (matchFormState.saving) return;
  
  // Validation: Total goals must match individual goals + own goals
  const totalIndividualGoals = matchFormState.playerStats.reduce((sum, s) => sum + (s.goals || 0), 0);
  const totalTeamGoals = totalIndividualGoals + (parseInt(matchFormState.ownGoals) || 0);
  
  if (totalTeamGoals !== parseInt(matchFormState.goalsLocal)) {
    matchFormState.validationError = `El recuento de goles (${totalTeamGoals}) no coincide con el marcador local (${matchFormState.goalsLocal}). Jugadores: ${totalIndividualGoals}, Propia puerta: ${matchFormState.ownGoals || 0}.`;
    render();
    return;
  }

  matchFormState.validationError = null;
  matchFormState.saving = true;
  render();
  
  try {
    let matchId = state.editingMatchId;
    const matchData = {
      matchday: parseInt(matchFormState.matchday),
      opponent: matchFormState.opponent,
      result: matchFormState.result,
      ownGoals: parseInt(matchFormState.ownGoals) || 0
    };

    if (matchId) {
      await updateDoc(doc(db, `teams/${state.currentTeamId}/matches`, matchId), matchData);
      
      // Update stats (delete and re-add for simplicity in this structure)
      const statsCol = collection(db, `teams/${state.currentTeamId}/matches/${matchId}/stats`);
      const existingStats = await getDocs(statsCol);
      for (const d of existingStats.docs) {
        await deleteDoc(d.ref);
      }
      
      for (const stat of matchFormState.playerStats) {
        // Remove UI-only fields before saving
        const { name, photoUrl, ...saveStat } = stat;
        await addDoc(statsCol, { ...saveStat, matchId });
      }
    } else {
      const matchRef = await addDoc(collection(db, `teams/${state.currentTeamId}/matches`), {
        ...matchData,
        teamId: state.currentTeamId,
        date: serverTimestamp()
      });
      matchId = matchRef.id;
      
      const statsCol = collection(db, `teams/${state.currentTeamId}/matches/${matchId}/stats`);
      for (const stat of matchFormState.playerStats) {
        const { name, photoUrl, ...saveStat } = stat;
        await addDoc(statsCol, { ...saveStat, matchId });
      }
    }
    
    matchFormState.saving = false;
    state.editingMatchId = null;
    state.view = 'dashboard';
    render();
  } catch (error) {
    matchFormState.saving = false;
    render();
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
        ${matchFormState.validationError ? `
          <div class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <span class="w-5 h-5 shrink-0">${Icons.AlertCircle}</span>
            <p class="text-sm font-bold">${matchFormState.validationError}</p>
          </div>
        ` : ''}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Jornada</label>
            <input 
              id="match-form-matchday"
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
              id="match-form-opponent"
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
                  id="match-form-goals-local"
                  type="number" 
                  min="0"
                  placeholder="Local"
                  value="${matchFormState.goalsLocal}"
                  onchange="handleMatchFormChange('goalsLocal', this.value)"
                  class="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-xl bg-slate-50"
                />
                <span class="text-[10px] text-slate-400 font-bold uppercase block text-center mt-1 px-1">
                  ${state.teams.find(t => t.id === state.currentTeamId)?.name || 'Local'}
                </span>
              </div>
              <span class="text-2xl font-black text-slate-300">-</span>
              <div class="flex-1">
                <input 
                  id="match-form-goals-visitor"
                  type="number" 
                  min="0"
                  placeholder="Rival"
                  value="${matchFormState.goalsVisitor}"
                  onchange="handleMatchFormChange('goalsVisitor', this.value)"
                  class="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-xl bg-slate-50"
                />
                <span class="text-[10px] text-slate-400 font-bold uppercase block text-center mt-1 px-1">
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
                        id="stat-minutes-${stat.playerId}"
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
                        id="stat-goals-${stat.playerId}"
                        type="number" 
                        min="0"
                        value="${stat.goals}"
                        onchange="handlePlayerStatChange('${stat.playerId}', 'goals', this.value)"
                        class="w-16 p-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-sm"
                      />
                    </td>
                    <td class="px-6 py-4">
                      <button 
                        id="stat-yellow-${stat.playerId}"
                        type="button"
                        ${stat.doubleYellowCards ? 'disabled' : ''}
                        onclick="handlePlayerStatChange('${stat.playerId}', 'yellowCards')"
                        class="w-full py-2 rounded-lg border ${stat.yellowCards > 0 ? 'bg-amber-400 border-amber-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'} transition-all flex items-center justify-center gap-1 ${stat.doubleYellowCards ? 'opacity-50 cursor-not-allowed' : ''}"
                      >
                        <span class="text-[10px] font-bold uppercase">${stat.yellowCards > 0 ? 'SÍ' : 'NO'}</span>
                      </button>
                    </td>
                    <td class="px-6 py-4">
                      <button 
                        id="stat-double-yellow-${stat.playerId}"
                        type="button"
                        onclick="handlePlayerStatChange('${stat.playerId}', 'doubleYellowCards', ${!stat.doubleYellowCards})"
                        class="w-full py-2 rounded-lg border ${stat.doubleYellowCards ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'} transition-all flex items-center justify-center gap-1"
                      >
                        <span class="text-[10px] font-bold uppercase">${stat.doubleYellowCards ? 'SÍ' : 'NO'}</span>
                      </button>
                    </td>
                    <td class="px-6 py-4">
                      <button 
                        id="stat-red-${stat.playerId}"
                        type="button"
                        onclick="handlePlayerStatChange('${stat.playerId}', 'redCards')"
                        class="w-full py-2 rounded-lg border ${stat.redCards > 0 ? 'bg-red-500 border-red-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'} transition-all flex items-center justify-center gap-1"
                      >
                        <span class="text-[10px] font-bold uppercase">${stat.redCards > 0 ? 'SÍ' : 'NO'}</span>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="p-6 bg-slate-50/30 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <span class="w-5 h-5 block">${Icons.Activity}</span>
              </div>
              <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Goles Propia Puerta</p>
                <p class="text-xs text-slate-500">Goles del rival a nuestro favor</p>
              </div>
            </div>
            <input 
              id="match-form-own-goals"
              type="number" 
              min="0"
              value="${matchFormState.ownGoals}"
              oninput="handleMatchFormChange('ownGoals', this.value)"
              class="w-24 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-lg shadow-sm bg-white"
            />
          </div>
        </div>

        <div class="flex gap-4 justify-end">
          <button type="button" onclick="setView('dashboard')" class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">
            Cancelar
          </button>
          <button 
            type="submit" 
            class="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            ${matchFormState.saving ? 'disabled' : ''}
          >
            <span class="w-5 h-5 block">${matchFormState.saving ? Icons.Loader : Icons.Save}</span>
            ${matchFormState.saving ? 'Guardando...' : 'Guardar Partido'}
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
  if (state.editingTeamId) {
    const team = state.teams.find(t => t.id === state.editingTeamId);
    modalHtml += `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 border border-slate-100">
          <div class="flex items-center justify-between mb-6">
            <div class="bg-indigo-100 p-3 rounded-2xl">
              <span class="w-6 h-6 block text-indigo-600">${Icons.Edit2}</span>
            </div>
            <button onclick="state.editingTeamId = null; render()" class="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all">
              <span class="w-6 h-6 block">${Icons.X}</span>
            </button>
          </div>
          
          <h3 class="text-2xl font-black text-slate-900 mb-2 tracking-tight">Configurar Equipo</h3>
          <p class="text-slate-500 mb-8 text-sm">Actualiza el nombre de tu equipo y gestiona el acceso para invitados.</p>
          
          <div class="space-y-6">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombre del Equipo</label>
              <input 
                id="edit-team-name-input"
                type="text"
                class="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none font-bold text-slate-700 transition-all"
                value="${state.editTeamName}"
                oninput="state.editTeamName = this.value; render()"
                placeholder="Nombre del equipo..."
              />
            </div>
            
            <div class="bg-indigo-50/50 p-6 rounded-[1.5rem] border border-indigo-100">
              <div class="flex items-center gap-3 mb-3">
                <span class="w-5 h-5 block text-indigo-600">${Icons.Users}</span>
                <label class="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">Código para Invitados</label>
              </div>
              <p class="text-[11px] text-indigo-600/70 mb-4 leading-relaxed">
                Crea un código único para que otros puedan ver las estadísticas de tu equipo sin necesidad de registrarse.
              </p>
              <input 
                id="edit-viewing-code-input"
                type="text"
                placeholder="Ej: MI-EQUIPO-2024"
                maxlength="10"
                class="w-full p-4 rounded-xl border-2 border-white bg-white focus:border-indigo-600 outline-none font-black tracking-widest uppercase text-indigo-600 shadow-sm transition-all"
                value="${state.editViewingCode}"
                oninput="handleEditViewingCodeChange(event); render()"
              />
              <p class="mt-2 text-[10px] text-slate-400 italic">
                * Deja vacío para desactivar el acceso por código.
              </p>
            </div>
            
            <div class="flex gap-3 pt-2">
              <button class="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all" onclick="state.editingTeamId = null; render()">
                Cancelar
              </button>
              <button class="flex-1 px-6 py-4 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2" onclick="updateTeam('${state.editingTeamId}')">
                ${state.loading ? Icons.Loader : Icons.Check}
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return modalHtml;
}

// --- Initialization ---
render();

