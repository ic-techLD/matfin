/**
 * DATABASE.JS — Camada de dados usando Firebase Firestore + Authentication
 *
 * Substitui o localStorage por banco de dados em nuvem (Firebase).
 * Os dados ficam salvos permanentemente e são acessíveis de qualquer
 * dispositivo com o mesmo login.
 *
 * Estrutura no Firestore:
 *   users/{uid}/profile        → dados do perfil (username)
 *   users/{uid}/transactions/  → receitas e despesas
 *   users/{uid}/goals/         → metas financeiras
 *   users/{uid}/goalDeposits/  → depósitos em metas
 *   users/{uid}/allocations/   → alocações de renda
 *
 * COMO CONFIGURAR:
 *   1. Acesse https://console.firebase.google.com
 *   2. Crie um projeto (ex: "matfin-app")
 *   3. Ative Authentication > Email/Password
 *   4. Ative Firestore Database (modo produção)
 *   5. Cole as configurações do seu projeto em FIREBASE_CONFIG abaixo
 *   6. Nas regras do Firestore, cole as regras do arquivo REGRAS_FIRESTORE.txt
 */

// ─── CONFIGURAÇÃO FIREBASE ────────────────────────────────────
// Substitua pelos valores do SEU projeto Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBmFmeI6-iXqE0C3tCOjwJc7sfE4nQGiyY",
  authDomain: "matfin-app.firebaseapp.com",
  projectId: "matfin-app",
  storageBucket: "matfin-app.firebasestorage.app",
  messagingSenderId: "207901857589",
  appId: "1:207901857589:web:70379a32eabdc9c890de7c"
};


// ─── INICIALIZAÇÃO ────────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();

// Ativa persistência offline (dados ficam em cache mesmo sem internet)
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// ─── UTILITÁRIOS INTERNOS ─────────────────────────────────────
const _now = () => new Date().toISOString();

function _userRef(uid) {
  return db.collection("users").doc(uid);
}
function _col(uid, name) {
  return _userRef(uid).collection(name);
}

// ─── AUTH — Authentication Firebase ──────────────────────────
const Auth = {
  /**
   * Cria conta com email derivado do username (username@matfin.app)
   * O username é armazenado no Firestore e verificado quanto à unicidade.
   */
  register: async (username, password) => {
    if (!username || username.trim().length < 3)
      return { ok: false, error: "Nome de usuário deve ter no mínimo 3 caracteres." };
    if (!password || password.length < 6)
      return { ok: false, error: "Senha deve ter no mínimo 6 caracteres." };

    // Verifica unicidade do username no Firestore
    const snap = await db.collection("usernames")
      .doc(username.trim().toLowerCase()).get();
    if (snap.exists)
      return { ok: false, error: "Este nome de usuário já está em uso. Escolha outro." };

    // Cria conta no Firebase Auth com email sintético
    const email = `${username.trim().toLowerCase()}@matfin.internal`;
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const uid  = cred.user.uid;

      // Salva perfil e reserva username
      const batch = db.batch();
      batch.set(_userRef(uid), {
        username: username.trim(),
        createdAt: _now(),
        updatedAt: _now(),
      });
      batch.set(db.collection("usernames").doc(username.trim().toLowerCase()), {
        uid,
        username: username.trim(),
      });
      await batch.commit();

      return { ok: true, user: { uid, username: username.trim() } };
    } catch (e) {
      if (e.code === "auth/email-already-in-use")
        return { ok: false, error: "Este nome de usuário já está em uso. Escolha outro." };
      return { ok: false, error: "Erro ao criar conta: " + e.message };
    }
  },

  login: async (username, password) => {
    if (!username || !password)
      return { ok: false, error: "Preencha usuário e senha." };
    const email = `${username.trim().toLowerCase()}@matfin.internal`;
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const uid  = cred.user.uid;
      const snap = await _userRef(uid).get();
      const profile = snap.data() || {};
      return { ok: true, user: { uid, username: profile.username || username.trim() } };
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
        return { ok: false, error: "Usuário ou senha incorretos." };
      return { ok: false, error: "Erro ao fazer login: " + e.message };
    }
  },

  logout: async () => {
    await auth.signOut();
  },

  resetPassword: async (username, newPassword) => {
    if (!newPassword || newPassword.length < 6)
      return { ok: false, error: "Nova senha deve ter no mínimo 6 caracteres." };
    // Verifica se username existe
    const snap = await db.collection("usernames")
      .doc(username.trim().toLowerCase()).get();
    if (!snap.exists)
      return { ok: false, error: "Usuário não encontrado." };

    const email = `${username.trim().toLowerCase()}@matfin.internal`;
    try {
      // Login temporário para trocar a senha não é possível sem a senha antiga.
      // Usamos updatePassword que requer o usuário estar autenticado.
      await auth.currentUser.updatePassword(newPassword);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Erro ao redefinir senha. Faça login novamente e tente." };
    }
  },

  deleteAccount: async (uid, username) => {
    try {
      const batch = db.batch();
      // Remove username reservado
      batch.delete(db.collection("usernames").doc(username.toLowerCase()));
      // Remove perfil
      batch.delete(_userRef(uid));
      await batch.commit();
      // Deleta subcoleções (Firestore não deleta automaticamente)
      for (const col of ["transactions", "goals", "goalDeposits", "allocations"]) {
        const snaps = await _col(uid, col).get();
        const b2 = db.batch();
        snaps.docs.forEach((d) => b2.delete(d.ref));
        await b2.commit();
      }
      await auth.currentUser.delete();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Erro ao excluir conta: " + e.message };
    }
  },

  onAuthChange: (callback) => auth.onAuthStateChanged(callback),
};

// ─── TRANSAÇÕES ──────────────────────────────────────────────
const Transactions = {
  findByUser: async (uid) => {
    const snap = await _col(uid, "transactions").orderBy("date", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  create: async (uid, data) => {
    const { type, amount, description, category, isEssential, date } = data;
    if (!["income", "expense"].includes(type))
      return { ok: false, error: "Tipo inválido." };
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return { ok: false, error: "Valor inválido." };
    if (!description || !description.trim())
      return { ok: false, error: "Descrição obrigatória." };

    const doc = {
      userId: uid, type,
      amount: Number(amount),
      description: description.trim(),
      category: category || "Geral",
      isEssential: type === "expense" ? Boolean(isEssential) : null,
      date: date || _now().slice(0, 10),
      createdAt: _now(),
    };
    const ref = await _col(uid, "transactions").add(doc);
    return { ok: true, transaction: { id: ref.id, ...doc } };
  },

  delete: async (uid, id) => {
    await _col(uid, "transactions").doc(id).delete();
    return { ok: true };
  },
};

// ─── METAS ───────────────────────────────────────────────────
const Goals = {
  findByUser: async (uid) => {
    const snap = await _col(uid, "goals").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  create: async (uid, { title, targetAmount }) => {
    if (!title || !title.trim())
      return { ok: false, error: "Título da meta obrigatório." };
    if (!targetAmount || isNaN(targetAmount) || Number(targetAmount) <= 0)
      return { ok: false, error: "Valor alvo inválido." };

    const doc = {
      userId: uid,
      title: title.trim(),
      targetAmount: Number(targetAmount),
      createdAt: _now(),
    };
    const ref = await _col(uid, "goals").add(doc);
    return { ok: true, goal: { id: ref.id, ...doc } };
  },

  delete: async (uid, goalId) => {
    await _col(uid, "goals").doc(goalId).delete();
    // Apaga depósitos da meta
    const deps = await _col(uid, "goalDeposits").where("goalId", "==", goalId).get();
    const batch = db.batch();
    deps.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { ok: true };
  },
};

// ─── DEPÓSITOS EM METAS ──────────────────────────────────────
const GoalDeposits = {
  findByGoal: async (uid, goalId) => {
    const snap = await _col(uid, "goalDeposits")
      .where("goalId", "==", goalId)
      .orderBy("date", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  create: async (uid, goalId, { amount, note, date }) => {
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return { ok: false, error: "Valor inválido." };

    const doc = {
      userId: uid, goalId,
      amount: Number(amount),
      note: note ? note.trim() : "",
      date: date || _now().slice(0, 10),
      createdAt: _now(),
    };
    const ref = await _col(uid, "goalDeposits").add(doc);
    return { ok: true, deposit: { id: ref.id, ...doc } };
  },
};

// ─── ALOCAÇÕES ───────────────────────────────────────────────
const Allocations = {
  findByUser: async (uid) => {
    const snap = await _col(uid, "allocations").orderBy("date", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  create: async (uid, { totalIncome, savedAmount, investedAmount, date }) => {
    const doc = {
      userId: uid,
      totalIncome: Number(totalIncome) || 0,
      savedAmount: Number(savedAmount) || 0,
      investedAmount: Number(investedAmount) || 0,
      date: date || _now().slice(0, 10),
      createdAt: _now(),
    };
    const ref = await _col(uid, "allocations").add(doc);
    return { ok: true, allocation: { id: ref.id, ...doc } };
  },

  delete: async (uid, id) => {
    await _col(uid, "allocations").doc(id).delete();
    return { ok: true };
  },
};

// ─── EXPORTA ─────────────────────────────────────────────────
const DB = { Auth, Transactions, Goals, GoalDeposits, Allocations };
