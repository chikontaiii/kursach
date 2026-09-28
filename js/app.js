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

    const handleFirebaseUser = (fbUser) => {
        if (!fbUser) {
            Store.logout();
            Charts.destroyAll();
            location.hash = '';
            showLogin();
            return;
        }

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

        const autoRole = FirebaseService.roleForEmail(fbUser.email);
        if (autoRole) {
            const name = fbUser.displayName || fbUser.email;
            const user = Store.upsertUser({ name: name, email: fbUser.email, role: autoRole });
            Store.setUserMapping(fbUser.uid, { name: name, role: autoRole });
            Utils.toast('Добро пожаловать, ' + name + '!', 'success');
            enterApp(user);
            return;
        }

        openRegistration(fbUser);
    };

    const openRegistration = (fbUser) => {
        showRegister();
        $('#regEmail').textContent = fbUser.email || '';

        const select = $('#regStudentSelect');
        const students = Store.getStudents();
        select.innerHTML = '<option value="">— выберите себя —</option>' +
            students.map(s =>
                '<option value="' + s.id + '">' + Utils.escapeHtml(s.fullName) + ' (' + Utils.escapeHtml(s.group) + ')</option>'
            ).join('');

        $('#regCancel').onclick = async() => {
            try { await FirebaseService.signOut(); } catch (e) {}
            showLogin();
        };

        $('#regConfirm').onclick = () => {
            const studentId = select.value;
            if (!studentId) { Utils.toast('Выберите себя из списка', 'warn'); return; }
            const student = Store.getStudent(studentId);
            if (!student) { Utils.toast('Студент не найден', 'error'); return; }

            // ★ Если студент — староста, даём ему роль starosta
            const role = student.isStarosta ? 'starosta' : 'student';

            const user = Store.upsertUser({
                name: student.fullName,
                email: fbUser.email,
                role: role,
                studentId: studentId
            });

            Store.setUserMapping(fbUser.uid, {
                name: student.fullName,
                role: role,
                studentId: studentId
            });

            const greeting = role === 'starosta' ?
                'Добро пожаловать, староста ' + student.fullName + '!' :
                'Добро пожаловать, ' + student.fullName + '!';
            Utils.toast(greeting, 'success');
            enterApp(user);
        };
    };

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

    const openSidebar = () => {
        sidebar.classList.add('sidebar--open');
        overlay.classList.add('overlay--on');
    };
    const closeSidebar = () => {
        sidebar.classList.remove('sidebar--open');
        overlay.classList.remove('overlay--on');
    };
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