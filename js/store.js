/* ============================================================
   STORE — единая точка доступа к данным
   ============================================================ */
const Store = (() => {
    const KEY = 'sa_db_v1';
    const SESSION_KEY = 'sa_session';
    const USER_MAP_KEY = 'sa_user_map';

    let db = null;
    let currentUser = null;

    const save = () => {
        try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {
            console.error(e);
            Utils.toast('Не удалось сохранить данные', 'error');
        }
    };

    const load = () => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) { db = JSON.parse(raw); return db; }
        } catch (e) { console.warn('Ошибка чтения localStorage', e); }
        db = DEMO_DATA.create();
        save();
        return db;
    };

    const reset = () => {
        db = DEMO_DATA.create();
        save();
    };

    /* ---------------- Демо-авторизация ---------------- */
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
        }
        return u;
    };

    /* ---------------- Google uid → роль/студент ---------------- */
    const getUserMap = () => {
        try { return JSON.parse(localStorage.getItem(USER_MAP_KEY) || '{}'); } catch (e) { return {}; }
    };

    const getMapping = (uid) => getUserMap()[uid] || null;

    const setUserMapping = (uid, data) => {
        const map = getUserMap();
        map[uid] = data;
        localStorage.setItem(USER_MAP_KEY, JSON.stringify(map));
    };

    const removeMapping = (uid) => {
        const map = getUserMap();
        delete map[uid];
        localStorage.setItem(USER_MAP_KEY, JSON.stringify(map));
    };

    const upsertUser = (data) => {
        let u = db.users.find(x => x.email.toLowerCase() === String(data.email).toLowerCase());
        if (u) {
            Object.assign(u, data);
        } else {
            u = Object.assign({ id: Utils.uid('u') }, data);
            db.users.push(u);
        }
        currentUser = u; // ★ делаем текущим
        save();
        return u;
    };

    /* ---------------- Студенты ---------------- */
    const getStudents = () => db.students;
    const getStudent = (id) => db.students.find(s => s.id === id);
    const addStudent = (data) => {
        const s = Object.assign({ id: Utils.uid('st') }, data);
        db.students.push(s);
        save();
        return s;
    };
    const updateStudent = (id, patch) => {
        const s = getStudent(id);
        if (s) {
            Object.assign(s, patch);
            save();
        }
        return s;
    };
    const deleteStudent = (id) => {
        db.students = db.students.filter(s => s.id !== id);
        db.grades = db.grades.filter(g => g.studentId !== id);
        save();
    };

    /* ---------------- Предметы ---------------- */
    const getSubjects = () => db.subjects;
    const getSubject = (id) => db.subjects.find(s => s.id === id);
    const addSubject = (data) => {
        const s = Object.assign({ id: Utils.uid('sub') }, data);
        db.subjects.push(s);
        save();
        return s;
    };
    const updateSubject = (id, patch) => {
        const s = getSubject(id);
        if (s) {
            Object.assign(s, patch);
            save();
        }
        return s;
    };
    const deleteSubject = (id) => {
        db.subjects = db.subjects.filter(s => s.id !== id);
        db.grades = db.grades.filter(g => g.subjectId !== id);
        save();
    };

    /* ---------------- Группы ---------------- */
    const getGroups = () => db.groups;
    const getGroup = (id) => db.groups.find(g => g.id === id);
    const getGroupByName = (name) => db.groups.find(g => g.name === name);
    const addGroup = (data) => {
        const g = Object.assign({ id: Utils.uid('g') }, data);
        db.groups.push(g);
        save();
        return g;
    };
    const updateGroup = (id, patch) => {
        const g = getGroup(id);
        if (g) {
            Object.assign(g, patch);
            save();
        }
        return g;
    };
    const deleteGroup = (id) => {
        db.groups = db.groups.filter(g => g.id !== id);
        save();
    };

    /* ---------------- Оценки ---------------- */
    const getGrades = () => db.grades;
    const getGrade = (id) => db.grades.find(g => g.id === id);
    const addGrade = (data) => {
        const g = Object.assign({ id: Utils.uid('gr') }, data);
        db.grades.push(g);
        save();
        return g;
    };
    const updateGrade = (id, patch) => {
        const g = getGrade(id);
        if (g) {
            Object.assign(g, patch);
            save();
        }
        return g;
    };
    const deleteGrade = (id) => {
        db.grades = db.grades.filter(g => g.id !== id);
        save();
    };

    /* ---------------- Ролевая видимость ---------------- */
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

    /* ---------------- Метрики: студент ---------------- */
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

    /* ---------------- Метрики: группа ---------------- */
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

    /* ---------------- Метрики: предмет ---------------- */
    const subjectGrades = (subjectId) => db.grades.filter(g => g.subjectId === subjectId);
    const subjectAverage = (subjectId) => {
        const g = subjectGrades(subjectId);
        return g.length ? Utils.round(Utils.avg(g.map(x => x.grade)), 2) : 0;
    };
    const subjectPerformance = (subjectId) => Utils.perfPercent(subjectGrades(subjectId));
    const subjectStudentsCount = (subjectId) =>
        new Set(subjectGrades(subjectId).map(g => g.studentId)).size;

    /* ---------------- Общие метрики ---------------- */
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

    return {
        load,
        save,
        reset,
        login,
        logout,
        restoreSession,
        getMapping,
        setUserMapping,
        removeMapping,
        upsertUser,
        getCurrentUser,
        getUserById,
        getUsers,
        updateUser,
        getStudents,
        getStudent,
        addStudent,
        updateStudent,
        deleteStudent,
        getSubjects,
        getSubject,
        addSubject,
        updateSubject,
        deleteSubject,
        getGroups,
        getGroup,
        getGroupByName,
        addGroup,
        updateGroup,
        deleteGroup,
        getGrades,
        getGrade,
        addGrade,
        updateGrade,
        deleteGrade,
        visibleStudents,
        visibleGrades,
        visibleGroups,
        getMyGroup,
        studentGrades,
        studentAverage,
        studentStats,
        groupStudents,
        groupAverage,
        groupPerformance,
        subjectGrades,
        subjectAverage,
        subjectPerformance,
        subjectStudentsCount,
        overallAverage,
        overallPerformance,
        atRiskStudents,
        subjectAverages,
        semesterAverages,
        gradeDistribution,
        rating
    };
})();