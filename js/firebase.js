/* ============================================================
   FIREBASE — Google-авторизация
   ============================================================ */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAGxtpRuEyUkxeRws871MNIZvX3XV_Y-8A",
    authDomain: "college-analytics-66e4e.firebaseapp.com",
    projectId: "college-analytics-66e4e",
    storageBucket: "college-analytics-66e4e.firebasestorage.app",
    messagingSenderId: "876647793500",
    appId: "1:876647793500:web:4de4ef464eb8f6afb5f799"
};

// ⚠️ ВАЖНО: вставь сюда email, с которого БУДЕШЬ заходить как администратор
const ADMIN_EMAILS = [
    "kurmanbekovcyntemir@gmail.com" // ← ЗАМЕНИ на свой
];

// Необязательно: email преподавателей
const TEACHER_EMAILS = [
    // "teacher@college.ru"
];

const FirebaseService = (() => {
    let auth = null;
    let currentUser = null;
    const listeners = [];

    const isConfigured = () =>
        FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.length > 20;

    function init() {
        if (!isConfigured() || typeof firebase === 'undefined') {
            console.warn('Firebase не настроен — работаем в демо-режиме');
            return false;
        }
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            auth = firebase.auth();
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

            auth.onAuthStateChanged(user => {
                currentUser = user;
                listeners.forEach(cb => cb(user));
            });
            return true;
        } catch (e) {
            console.error('Ошибка инициализации Firebase:', e);
            return false;
        }
    }

    async function signInWithGoogle() {
        if (!auth) throw new Error('Firebase не инициализирован');
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await auth.signInWithPopup(provider);
        return result.user;
    }

    async function signOut() {
        if (auth) await auth.signOut();
        currentUser = null;
    }

    function onAuthChanged(cb) {
        listeners.push(cb);
        if (currentUser !== null) cb(currentUser);
    }

    function roleForEmail(email) {
        if (!email) return null;
        const e = email.toLowerCase().trim();
        if (ADMIN_EMAILS.map(x => x.toLowerCase().trim()).includes(e)) return 'admin';
        if (TEACHER_EMAILS.map(x => x.toLowerCase().trim()).includes(e)) return 'teacher';
        return null;
    }

    return {
        init,
        signInWithGoogle,
        signOut,
        onAuthChanged,
        getCurrentUser: () => currentUser,
        roleForEmail,
        isConfigured
    };
})();