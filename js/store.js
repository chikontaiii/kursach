/* ============================================================
   STORE — данные в Firebase Firestore
   При запуске всё загружается в память, страницы работают синхронно.
   При изменениях — тихо пишем в Firestore.
   ============================================================ */
const Store = (() => {
    const KEY = 'sa_db_v1';
    const SESSION_KEY = 'sa_session';
    const USER_MAP_KEY = 'sa_user_map';

    let db = null;
    let currentUser = null;
    let firestore = null;
    let useCloud = false;

    /* ============================================================
       ИНИЦИАЛИЗАЦИЯ
       ============================================================ */
    const isCloudEnabled = () => {
        return typeof firebase !== 'undefined' &&
            firebase.apps && firebase.apps.length > 0 &&
            FirebaseService.isConfigured();
    };

    const load = async() => {
        if (isCloudEnabled()) {
            try {
                firestore = firebase.firestore();
                useCloud = true;
                const loaded = await loadFromCloud();
                if (loaded) return db;
                db = DEMO_DATA.create();
                await seedCloud(db);
                return db;
            } catch (e) {
                console.error('Firestore недоступен, переключаюсь на localStorage:', e);
                useCloud = false;
            }
        }
        return loadFromLocal();
    };

    const loadFromCloud = async() => {
        const [usersSnap, studentsSnap, subjectsSnap, gradesSnap, groupsSnap] = await Promise.all([
            firestore.collection('users').get(),
            firestore.collection('students').get(),
            firestore.collection('subjects').get(),
            firestore.collection('grades').get(),
            firestore.collection('groups').get()
        ]);

        if (studentsSnap.empty) return false;

            // Сортировка по имени (для студентов — по fullName, для предметов — по name, для групп — по name)
    const byName = (arr, key) => arr.sort((a, b) =>
      String(a[key] || '').localeCompare(String(b[key] || ''), 'ru')
    );

    db = {
      users:    usersSnap.docs.map(d => Object.assign({ id: d.id }, d.data()))
                  .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru')),
      students: byName(studentsSnap.docs.map(d => Object.assign({ id: d.id }, d.data())), 'fullName'),
      subjects: byName(subjectsSnap.docs.map(d => Object.assign({ id: d.id }, d.data())), 'name'),
      grades:   gradesSnap.docs.map(d => Object.assign({ id: d.id }, d.data()))
                  .sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
      groups:   byName(groupsSnap.docs.map(d => Object.assign({ id: d.id }, d.data())), 'name')
    };

        try {
            const fbUser = firebase.auth().currentUser;
            if (fbUser) {
                const mapDoc = await firestore.collection('userMap').doc(fbUser.uid).get();
                if (mapDoc.exists) {
                    const mapping = mapDoc.data();
                    currentUser = db.users.find(u => u.email === fbUser.email) || {
                        id: 'u_' + fbUser.uid,
                        name: mapping.name,
                        email: fbUser.email,
                        role: mapping.role,
                        studentId: mapping.studentId
                    };
                }
            }
        } catch (e) { /* ignore */ }

        return true;
    };

    const seedCloud = async(data) => {
        const collections = ['users', 'students', 'subjects', 'grades', 'groups'];
        const chunks = [];
        let currentBatch = firestore.batch();
        let count = 0;

        for (const col of collections) {
            for (const item of data[col]) {
                const ref = firestore.collection(col).doc(item.id);
                const copy = cleanForFirestore(item);
                delete copy.id;
                currentBatch.set(ref, copy);
                count++;
                if (count >= 450) {
                    chunks.push(currentBatch);
                    currentBatch = firestore.batch();
                    count = 0;
                }
            }
        }
        chunks.push(currentBatch);

        for (const batch of chunks) {
            await batch.commit();
        }

        const map = getUserMap();
        for (const uid of Object.keys(map)) {
            await firestore.collection('userMap').doc(uid).set(cleanForFirestore(map[uid]));
        }
    };

    /* ============================================================
       LOCALSTORAGE FALLBACK
       ============================================================ */
    const loadFromLocal = () => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) { db = JSON.parse(raw); return db; }
        } catch (e) { console.warn('Ошибка localStorage', e); }
        db = DEMO_DATA.create();
        saveLocal();
        return db;
    };

    const saveLocal = () => {
        try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.error(e); }
    };

    const save = () => {
        saveLocal();
    };

    /* ============================================================
       ОЧИСТКА undefined ДЛЯ FIRESTORE
       Firestore не принимает undefined как значение поля.
       ============================================================ */
    const cleanForFirestore = (obj) => {
        const out = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const v = obj[key];
                if (v !== undefined) {
                    out[key] = v;
                }
            }
        }
        return out;
    };

    /* ============================================================
       СИНХРОНИЗАЦИЯ С ОБЛАКОМ
       ============================================================ */
    const cloudSet = (col, id, data) => {
        if (!useCloud) return;
        const copy = cleanForFirestore(data);
        delete copy.id;
        firestore.collection(col).doc(id).set(copy)
            .catch(e => console.error('cloudSet error', col, id, e));
    };

    const cloudDelete = (col, id) => {
        if (!useCloud) return;
        firestore.collection(col).doc(id).delete()
            .catch(e => console.error('cloudDelete error', col, id, e));
    };

    /* ============================================================
       USER MAP (Firebase uid → роль/студент)
       ============================================================ */
    const getUserMap = () => {
        try { return JSON.parse(localStorage.getItem(USER_MAP_KEY) || '{}'); } catch (e) { return {}; }
    };

    const getMapping = (uid) => getUserMap()[uid] || null;

    const setUserMapping = (uid, data) => {
        const map = getUserMap();
        map[uid] = data;
        localStorage.setItem(USER_MAP_KEY, JSON.stringify(map));
        if (useCloud) {
            firestore.collection('userMap').doc(uid).set(cleanForFirestore(data))
                .catch(e => console.error('setUserMapping error', e));
        }
    };

    const removeMapping = (uid) => {
        const map = getUserMap();
        delete map[uid];
        localStorage.setItem(USER_MAP_KEY, JSON.stringify(map));
        if (useCloud) {
            firestore.collection('userMap').doc(uid).delete().catch(console.error);
        }
    };

    /* ============================================================
       АВТОРИЗАЦИЯ (демо)
       ============================================================ */
    const login = (email, password) => {
        const u = db.users.find(x =>
            x.email.toLowerCase() === String(email).trim().toLowerCase() && x.password === password
        );
        if (!u) return null;
        currentUser = u;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id }));
        return u;
    };

    const logout = () => {
        currentUser = null;
        localStorage.removeItem(SESSION_KEY);
    };

    const restoreSession = () => {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const u = db.users.find(x => x.id === parsed.id);
            if (u) { currentUser = u; return u; }
        } catch (e) {}
        return null;
    };

    const getCurrentUser = () => currentUser;
    const getUserById = (id) => db.users.find(u => u.id === id);
    const getUsers = () => db.users;

    const updateUser = (id, patch) => {
        const u = getUserById(id);
        if (u) {
            Object.assign(u, patch);
            save();
            cloudSet('users', u.id, u);
        }
        return u;
    };

    const upsertUser = (data) => {
        let u = db.users.find(x => x.email.toLowerCase() === String(data.email).toLowerCase());
        if (u) {
            Object.assign(u, data);
        } else {
            u = Object.assign({ id: Utils.uid('u') }, data);
            db.users.push(u);
        }
        currentUser = u;
        save();
        cloudSet('users', u.id, u);
        return u;
    };

    /* ============================================================
       СТУДЕНТЫ
       ============================================================ */
    const getStudents = () => db.students;
    const getStudent = (id) => db.students.find(s => s.id === id);

    const addStudent = (data) => {
        const s = Object.assign({ id: Utils.uid('st') }, data);
        db.students.push(s);
        save();
        cloudSet('students', s.id, s);
        return s;
    };

    const updateStudent = (id, patch) => {
        const s = getStudent(id);
        if (s) {
            Object.assign(s, patch);
            save();
            cloudSet('students', s.id, s);
        }
        return s;
    };

    const deleteStudent = (id) => {
        db.students = db.students.filter(s => s.id !== id);
        db.grades = db.grades.filter(g => g.studentId !== id);
        save();
        cloudDelete('students', id);
        if (useCloud) {
            firestore.collection('grades').where('studentId', '==', id).get()
                .then(snap => {
                    const batch = firestore.batch();
                    snap.docs.forEach(d => batch.delete(d.ref));
                    return batch.commit();
                }).catch(console.error);
        }
    };

    /* ============================================================
       ПРЕДМЕТЫ
       ============================================================ */
    const getSubjects = () => db.subjects;
    const getSubject = (id) => db.subjects.find(s => s.id === id);

    const addSubject = (data) => {
        const s = Object.assign({ id: Utils.uid('sub') }, data);
        db.subjects.push(s);
        save();
        cloudSet('subjects', s.id, s);
        return s;
    };

    const updateSubject = (id, patch) => {
        const s = getSubject(id);
        if (s) {
            Object.assign(s, patch);
            save();
            cloudSet('subjects', s.id, s);
        }
        return s;
    };

    const deleteSubject = (id) => {
        db.subjects = db.subjects.filter(s => s.id !== id);
        db.grades = db.grades.filter(g => g.subjectId !== id);
        save();
        cloudDelete('subjects', id);
        if (useCloud) {
            firestore.collection('grades').where('subjectId', '==', id).get()
                .then(snap => {
                    const batch = firestore.batch();
                    snap.docs.forEach(d => batch.delete(d.ref));
                    return batch.commit();
                }).catch(console.error);
        }
    };

    /* ============================================================
       ГРУППЫ
       ============================================================ */
    const getGroups = () => db.groups;
    const getGroup = (id) => db.groups.find(g => g.id === id);
    const getGroupByName = (name) => db.groups.find(g => g.name === name);

    const addGroup = (data) => {
        const g = Object.assign({ id: Utils.uid('g') }, data);
        db.groups.push(g);
        save();
        cloudSet('groups', g.id, g);
        return g;
    };

    const updateGroup = (id, patch) => {
        const g = getGroup(id);
        if (g) {
            Object.assign(g, patch);
            save();
            cloudSet('groups', g.id, g);
        }
        return g;
    };

    const deleteGroup = (id) => {
        db.groups = db.groups.filter(g => g.id !== id);
        save();
        cloudDelete('groups', id);
    };

    /* ============================================================
       ОЦЕНКИ
       ============================================================ */
    const getGrades = () => db.grades;
    const getGrade = (id) => db.grades.find(g => g.id === id);

    const addGrade = (data) => {
        const g = Object.assign({ id: Utils.uid('gr') }, data);
        db.grades.push(g);
        save();
        cloudSet('grades', g.id, g);
        return g;
    };

    const updateGrade = (id, patch) => {
        const g = getGrade(id);
        if (g) {
            Object.assign(g, patch);
            save();
            cloudSet('grades', g.id, g);
        }
        return g;
    };

    const deleteGrade = (id) => {
        db.grades = db.grades.filter(g => g.id !== id);
        save();
        cloudDelete('grades', id);
    };

    /* ============================================================
       РОЛЕВАЯ ВИДИМОСТЬ
       ============================================================ */
    const getMyGroup = () => {
        if (!currentUser || !currentUser.studentId) return null;
        const me = db.students.find(s => s.id === currentUser.studentId);
        return me ? me.group : null;
    };

    const visibleStudents = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'student')
            return db.students.filter(s => s.id === currentUser.studentId);
        if (currentUser.role === 'starosta') {
            const g = getMyGroup();
            return g ? db.students.filter(s => s.group === g) : [];
        }
        return db.students;
    };

    const visibleGrades = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'student')
            return db.grades.filter(g => g.studentId === currentUser.studentId);
        if (currentUser.role === 'starosta') {
            const g = getMyGroup();
            if (!g) return [];
            const ids = db.students.filter(s => s.group === g).map(s => s.id);
            return db.grades.filter(gr => ids.indexOf(gr.studentId) !== -1);
        }
        return db.grades;
    };

    const visibleGroups = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'starosta') {
            const g = getMyGroup();
            return g ? db.groups.filter(gr => gr.name === g) : [];
        }
        return db.groups;
    };

    /* ============================================================
       МЕТРИКИ
       ============================================================ */
    const studentGrades = (id) => db.grades.filter(g => g.studentId === id);

    const studentAverage = (id) => {
        const g = studentGrades(id);
        return g.length ? Utils.round(Utils.avg(g.map(x => x.grade)), 2) : 0;
    };

    const studentStats = (id) => {
        const grades = studentGrades(id);
        const byGrade = { 5: 0, 4: 0, 3: 0, 2: 0 };
        grades.forEach(g => { if (byGrade[g.grade] !== undefined) byGrade[g.grade]++; });
        const average = grades.length ? Utils.round(Utils.avg(grades.map(g => g.grade)), 2) : 0;
        return {
            grades: grades,
            count: grades.length,
            byGrade: byGrade,
            average: average,
            performance: Utils.perfPercent(grades),
            status: Utils.statusOf(average)
        };
    };

    const groupStudents = (groupName) => db.students.filter(s => s.group === groupName);

    const groupAverage = (groupName) => {
        const studs = groupStudents(groupName);
        const values = studs.map(s => studentAverage(s.id)).filter(x => x > 0);
        return values.length ? Utils.round(Utils.avg(values), 2) : 0;
    };

    const groupPerformance = (groupName) => {
        const grades = db.grades.filter(g => {
            const s = getStudent(g.studentId);
            return s && s.group === groupName;
        });
        return Utils.perfPercent(grades);
    };

    const subjectGrades = (subjectId) => db.grades.filter(g => g.subjectId === subjectId);

    const subjectAverage = (subjectId) => {
        const g = subjectGrades(subjectId);
        return g.length ? Utils.round(Utils.avg(g.map(x => x.grade)), 2) : 0;
    };

    const subjectPerformance = (subjectId) => Utils.perfPercent(subjectGrades(subjectId));

    const subjectStudentsCount = (subjectId) =>
        new Set(subjectGrades(subjectId).map(g => g.studentId)).size;

    const overallAverage = () =>
        db.grades.length ? Utils.round(Utils.avg(db.grades.map(g => g.grade)), 2) : 0;

    const overallPerformance = () => Utils.perfPercent(db.grades);

    const atRiskStudents = () => {
        const base = visibleStudents();
        return base.filter(s => {
            const a = studentAverage(s.id);
            return a > 0 && a < 3.5;
        });
    };

    const subjectAverages = () =>
        db.subjects.map(s => ({
            id: s.id,
            name: s.name,
            teacher: s.teacher,
            avg: subjectAverage(s.id),
            count: subjectGrades(s.id).length,
            students: subjectStudentsCount(s.id)
        }));

    const semesterAverages = () => {
        const map = {};
        db.grades.forEach(g => {
            if (!map[g.semester]) map[g.semester] = [];
            map[g.semester].push(g.grade);
        });
        return Object.keys(map).sort((a, b) => a - b).map(sem => ({
            semester: Number(sem),
            avg: Utils.round(Utils.avg(map[sem]), 2),
            count: map[sem].length
        }));
    };

    const gradeDistribution = (grades) => {
        const src = grades || db.grades;
        const d = { 5: 0, 4: 0, 3: 0, 2: 0 };
        src.forEach(g => { if (d[g.grade] !== undefined) d[g.grade]++; });
        return d;
    };

    const rating = (students) => {
        const list = students || visibleStudents();
        return Utils.sortBy(
            list.map(s => Object.assign({}, s, {
                average: studentAverage(s.id),
                performance: Utils.perfPercent(studentGrades(s.id))
            })).filter(s => s.average > 0),
            'average', 'desc'
        );
    };

    /* ============================================================
       RESET
       ============================================================ */
    const reset = () => {
        db = DEMO_DATA.create();
        save();
    };

    /* ============================================================
       ЭКСПОРТ
       ============================================================ */
    return {
        load: load,
        save: save,
        reset: reset,

        login: login,
        logout: logout,
        restoreSession: restoreSession,

        getMapping: getMapping,
        setUserMapping: setUserMapping,
        removeMapping: removeMapping,
        upsertUser: upsertUser,

        getCurrentUser: getCurrentUser,
        getUserById: getUserById,
        getUsers: getUsers,
        updateUser: updateUser,

        getStudents: getStudents,
        getStudent: getStudent,
        addStudent: addStudent,
        updateStudent: updateStudent,
        deleteStudent: deleteStudent,

        getSubjects: getSubjects,
        getSubject: getSubject,
        addSubject: addSubject,
        updateSubject: updateSubject,
        deleteSubject: deleteSubject,

        getGroups: getGroups,
        getGroup: getGroup,
        getGroupByName: getGroupByName,
        addGroup: addGroup,
        updateGroup: updateGroup,
        deleteGroup: deleteGroup,

        getGrades: getGrades,
        getGrade: getGrade,
        addGrade: addGrade,
        updateGrade: updateGrade,
        deleteGrade: deleteGrade,

        visibleStudents: visibleStudents,
        visibleGrades: visibleGrades,
        visibleGroups: visibleGroups,
        getMyGroup: getMyGroup,

        studentGrades: studentGrades,
        studentAverage: studentAverage,
        studentStats: studentStats,
        groupStudents: groupStudents,
        groupAverage: groupAverage,
        groupPerformance: groupPerformance,
        subjectGrades: subjectGrades,
        subjectAverage: subjectAverage,
        subjectPerformance: subjectPerformance,
        subjectStudentsCount: subjectStudentsCount,
        overallAverage: overallAverage,
        overallPerformance: overallPerformance,
        atRiskStudents: atRiskStudents,
        subjectAverages: subjectAverages,
        semesterAverages: semesterAverages,
        gradeDistribution: gradeDistribution,
        rating: rating
    };
})();