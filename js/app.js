/* ============================================================
   APP — роутер, навигация, Google-авторизация
   ============================================================ */
(() => {

    const MENU = [
        { id: 'dashboard', path: '#/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'teacher', 'starosta', 'student'] },
        { id: 'students', path: '#/students', label: 'Студенты', icon: '👨‍🎓', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'grades', path: '#/grades', label: 'Оценки', icon: '📝', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'subjects', path: '#/subjects', label: 'Предметы', icon: '📚', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'groups', path: '#/groups', label: 'Группы', icon: '👥', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'rating', path: '#/rating', label: 'Рейтинг', icon: '🏆', roles: ['admin', 'teacher', 'starosta', 'student'] },
        { id: 'analytics', path: '#/analytics', label: 'Аналитика', icon: '📈', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'settings', path: '#/settings', label: 'Настройки', icon: '⚙️', roles: ['admin', 'teacher', 'starosta', 'student'] }
    ];

    const ROUTES = {
        dashboard: { title: 'Dashboard', subtitle: 'Обзор успеваемости', render: (c) => DashboardPage.render(c) },
        students: { title: 'Студенты', subtitle: 'Список всех студентов', render: (c) => StudentsPage.render(c) },
        student: { title: 'Профиль студента', subtitle: 'Детальная информация', render: (c, id) => StudentPage.render(c, id) },
        grades: { title: 'Оценки', subtitle: 'Журнал оценок', render: (c) => GradesPage.render(c) },
        subjects: { title: 'Предметы', subtitle: 'Статистика по дисциплинам', render: (c) => SubjectsPage.render(c) },
        groups: { title: 'Группы', subtitle: 'Учебные группы колледжа', render: (c) => GroupsPage.render(c) },
        rating: { title: 'Рейтинг', subtitle: 'Автоматический рейтинг студентов', render: (c) => RatingPage.render(c) },
        analytics: { title: 'Аналитика', subtitle: 'Гибкие срезы данных', render: (c) => AnalyticsPage.render(c) },
        settings: { title: 'Настройки', subtitle: 'Профиль и оформление', render: (c) => SettingsPage.render(c) }
    };

    const $ = Utils.$;
    const loginScreen = $('#loginScreen');
    const registerScreen = $('#registerScreen');
    const app = $('#app');
    const nav = $('#nav');
    const page = $('#page');
    const pageTitle = $('#pageTitle');
    const pageSubtitle = $('#pageSubtitle');
    const topbarActions = $('#topbarActions');
    const sidebar = $('#sidebar');
    const overlay = $('#overlay');
    const burger = $('#burger');
    const userBox = $('#userBox');

    const showLogin = () => {
        loginScreen.hidden = false;
        registerScreen.hidden = true;
        app.hidden = true;
    };
    const showRegister = () => {
        loginScreen.hidden = true;
        registerScreen.hidden = false;
        app.hidden = true;
    };
    const showApp = () => {
        loginScreen.hidden = true;
        registerScreen.hidden = true;
        app.hidden = false;
    };

    /* ---------------- Обработка Google-пользователя ---------------- */
    const handleFirebaseUser = (fbUser) => {
        if (!fbUser) {
            Store.logout();
            Charts.destroyAll();
            location.hash = '';
            showLogin();
            return;
        }

        // 1) Уже привязан — сразу входим
        const mapping = Store.getMapping(fbUser.uid);
        if (mapping) {
            const user = Store.upsertUser({
                name: mapping.name,
                email: fbUser.email,
                role: mapping.role,
                studentId: mapping.studentId
            });
            enterApp(user);
            return;
        }

        // 2) Админ/преподаватель по email — автологин
        const autoRole = FirebaseService.roleForEmail(fbUser.email);
        if (autoRole) {
            const name = fbUser.displayName || fbUser.email;
            const user = Store.upsertUser({ name: name, email: fbUser.email, role: autoRole });
            Store.setUserMapping(fbUser.uid, { name: name, role: autoRole });
            Utils.toast('Добро пожаловать, ' + name + '!', 'success');
            enterApp(user);
            return;
        }

        // 3) Первый раз — регистрация (ввод ФИО)
        openRegistration(fbUser);
    };

    /* ---------------- Регистрация ---------------- */
    const openRegistration = (fbUser) => {
        showRegister();
        $('#regEmail').textContent = fbUser.email || '';

        const input = $('#regName');
        const matchBox = $('#regMatch');
        let matchedStudent = null;

        input.value = '';
        matchBox.innerHTML = '';
        matchedStudent = null;

        // Живой поиск по мере ввода
        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            matchedStudent = null;

            if (q.length < 2) {
                matchBox.innerHTML = '';
                return;
            }

            const matches = Store.getStudents()
                .filter(s => s.fullName.toLowerCase().indexOf(q) !== -1)
                .slice(0, 5);

            if (matches.length === 0) {
                matchBox.innerHTML =
                    '<div class="insight" style="padding:10px 12px;font-size:12.5px">' +
                    '<div class="insight__icon">+</div>' +
                    '<div>Совпадений нет. Будет создан <b>новый профиль</b> в группе ПКС-7-24.</div>' +
                    '</div>';
                return;
            }

            matchBox.innerHTML =
                '<div style="font-size:12px;color:var(--text-3);margin:0 0 8px">' +
                'Найдены совпадения — нажмите, если это вы:' +
                '</div>' +
                matches.map(s =>
                    '<button type="button" class="demo-btn" data-id="' + s.id + '" style="width:100%;margin-bottom:6px">' +
                    '<span>' + Utils.escapeHtml(s.fullName) + '</span>' +
                    '<span class="demo-btn__role">' + Utils.escapeHtml(s.group) + '</span>' +
                    '</button>'
                ).join('');

            matchBox.querySelectorAll('[data-id]').forEach(btn => {
                btn.onclick = () => {
                    matchedStudent = Store.getStudent(btn.dataset.id);
                    input.value = matchedStudent.fullName;
                    matchBox.innerHTML =
                        '<div class="insight insight--good">' +
                        '<div class="insight__icon">✓</div>' +
                        '<div>Вы выбрали: <b>' + Utils.escapeHtml(matchedStudent.fullName) + '</b> (' +
                        Utils.escapeHtml(matchedStudent.group) + ')</div>' +
                        '</div>';
                };
            });
        });

        // Отмена — выходим из Firebase
        $('#regCancel').onclick = async() => {
            try { await FirebaseService.signOut(); } catch (e) {}
            showLogin();
        };

        // Подтверждение
        $('#regConfirm').onclick = () => {
            const name = input.value.trim();
            if (!name || name.length < 3) {
                Utils.toast('Введите ваше ФИО полностью', 'warn');
                return;
            }

            let student = matchedStudent;

            // Если не выбрали из подсказок — пробуем точное совпадение
            if (!student) {
                student = Store.getStudents().find(s =>
                    s.fullName.toLowerCase() === name.toLowerCase()
                );
            }

            // Если и его нет — создаём нового студента
            if (!student) {
                student = Store.addStudent({
                    fullName: name,
                    group: 'ПКС-7-24',
                    course: 2,
                    specialty: 'Техники-программисты',
                    isStarosta: false
                });
                Utils.toast('Создан новый профиль студента', 'info');
            }

            const role = student.isStarosta ? 'starosta' : 'student';

            const user = Store.upsertUser({
                name: student.fullName,
                email: fbUser.email,
                role: role,
                studentId: student.id
            });

            Store.setUserMapping(fbUser.uid, {
                name: student.fullName,
                role: role,
                studentId: student.id
            });

            const greeting = role === 'starosta' ?
                'Добро пожаловать, староста ' + student.fullName + '!' :
                'Добро пожаловать, ' + student.fullName + '!';
            Utils.toast(greeting, 'success');
            enterApp(user);
        };

        // Enter = подтвердить
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('#regConfirm').click();
        });

        setTimeout(() => input.focus(), 100);
    };

    /* ---------------- Выход ---------------- */
    $('#logoutBtn').addEventListener('click', async() => {
        const ok = await Utils.confirmDialog({
            title: 'Выйти из аккаунта?',
            message: 'Вы уверены, что хотите завершить сессию?',
            confirmText: 'Выйти',
            danger: false
        });
        if (!ok) return;

        if (FirebaseService.isConfigured()) {
            await FirebaseService.signOut();
        } else {
            Store.logout();
            Charts.destroyAll();
            location.hash = '';
            showLogin();
            Utils.toast('Вы вышли из аккаунта', 'info');
        }
    });

    /* ---------------- Навигация ---------------- */
    const buildNav = (user) => {
        const items = MENU.filter(m => m.roles.indexOf(user.role) !== -1);
        nav.innerHTML = items.map(m =>
            '<button class="nav__item" data-path="' + m.path + '" data-id="' + m.id + '" type="button">' +
            '<span class="nav__icon">' + m.icon + '</span>' +
            '<span>' + m.label + '</span>' +
            '</button>'
        ).join('');
    };

    nav.addEventListener('click', (e) => {
        const item = e.target.closest('.nav__item');
        if (!item) return;
        location.hash = item.dataset.path.slice(1);
        closeSidebar();
    });

    const setActiveNav = (id) => {
        Utils.$$('.nav__item', nav).forEach(el => {
            el.classList.toggle('nav__item--active', el.dataset.id === id);
        });
    };

    const openSidebar = () => { sidebar.classList.add('sidebar--open');
        overlay.classList.add('overlay--on'); };
    const closeSidebar = () => { sidebar.classList.remove('sidebar--open');
        overlay.classList.remove('overlay--on'); };
    burger.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);
    window.addEventListener('resize', () => { if (window.innerWidth > 860) closeSidebar(); });

    const renderUserBox = (user) => {
        const roleLabels = {
            admin: 'Администратор',
            teacher: 'Преподаватель',
            starosta: 'Староста',
            student: 'Студент'
        };
        userBox.innerHTML =
            '<div class="user-box__avatar">' + Utils.initials(user.name) + '</div>' +
            '<div class="user-box__info">' +
            '<div class="user-box__name">' + Utils.escapeHtml(user.name) + '</div>' +
            '<div class="user-box__role">' + (roleLabels[user.role] || user.role) + '</div>' +
            '</div>';
    };

    /* ---------------- Роутер ---------------- */
    const parseHash = () => {
        const raw = (location.hash || '#/dashboard').slice(2);
        const parts = raw.split('/').filter(Boolean);
        return { route: parts[0] || 'dashboard', param: parts[1] || null };
    };

    const renderRoute = () => {
        const user = Store.getCurrentUser();
        if (!user) return;

        const parsed = parseHash();
        const route = parsed.route;
        const param = parsed.param;
        const config = ROUTES[route];

        if (!config) {
            page.innerHTML = Utils.emptyState('Страница не найдена', 'Проверьте адрес в строке браузера.', '🚫');
            return;
        }

        const menuItem = MENU.find(m => m.id === route);
        if (menuItem && menuItem.roles.indexOf(user.role) === -1) {
            page.innerHTML = Utils.emptyState('Доступ запрещён', 'У вашей роли нет прав для этого раздела.', '🔒');
            return;
        }

        topbarActions.innerHTML = '';
        Charts.destroyAll();
        pageTitle.textContent = config.title;
        pageSubtitle.textContent = config.subtitle;
        setActiveNav(menuItem ? menuItem.id : 'dashboard');

        try {
            config.render(page, param);
        } catch (err) {
            console.error(err);
            page.innerHTML = Utils.emptyState('Ошибка отрисовки', err.message, '⚠️');
        }
    };

    window.addEventListener('hashchange', renderRoute);

    const enterApp = (user) => {
        renderUserBox(user);
        buildNav(user);
        showApp();

        const theme = localStorage.getItem('sa_theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);

        if (!location.hash) location.hash = '#/dashboard';
        renderRoute();
    };

    /* ---------------- Инициализация ---------------- */
    const init = () => {
        Store.load();

        $('#googleLoginBtn').addEventListener('click', async() => {
            if (!FirebaseService.isConfigured()) {
                $('#loginError').textContent = 'Firebase не настроен. Проверьте js/firebase.js';
                $('#loginError').hidden = false;
                return;
            }
            try {
                await FirebaseService.signInWithGoogle();
            } catch (e) {
                console.error(e);
                Utils.toast('Ошибка входа через Google: ' + (e.message || e), 'error');
            }
        });

        const ok = FirebaseService.init();
        if (ok) {
            FirebaseService.onAuthChanged(handleFirebaseUser);
        } else {
            $('#loginError').textContent = 'Firebase не настроен. Проверьте js/firebase.js';
            $('#loginError').hidden = false;
            showLogin();
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();