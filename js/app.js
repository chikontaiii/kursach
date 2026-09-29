/* ============================================================
   APP — роутер, навигация, Google-авторизация, языки
   ============================================================ */
(() => {

    const MENU = [
        { id: 'dashboard', path: '#/dashboard', labelKey: 'menu.dashboard', icon: '📊', roles: ['admin', 'teacher', 'starosta', 'student'] },
        { id: 'my', path: '#/my', labelKey: 'menu.my', icon: '👤', roles: ['starosta'] },
        { id: 'students', path: '#/students', labelKey: 'menu.students', icon: '👨‍🎓', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'grades', path: '#/grades', labelKey: 'menu.grades', icon: '📝', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'subjects', path: '#/subjects', labelKey: 'menu.subjects', icon: '📚', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'groups', path: '#/groups', labelKey: 'menu.groups', icon: '👥', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'rating', path: '#/rating', labelKey: 'menu.rating', icon: '🏆', roles: ['admin', 'teacher', 'starosta', 'student'] },
        { id: 'analytics', path: '#/analytics', labelKey: 'menu.analytics', icon: '📈', roles: ['admin', 'teacher', 'starosta'] },
        { id: 'settings', path: '#/settings', labelKey: 'menu.settings', icon: '⚙️', roles: ['admin', 'teacher', 'starosta', 'student'] }
    ];

    const ROUTES = {
        dashboard: { titleKey: 'page.dashboard.title', subtitleKey: 'page.dashboard.subtitle', render: (c) => DashboardPage.render(c) },
        my: { titleKey: 'page.my.title', subtitleKey: 'page.my.subtitle', render: (c) => DashboardPage.renderStudentView(c, Store.getCurrentUser()) },
        students: { titleKey: 'page.students.title', subtitleKey: 'page.students.subtitle', render: (c) => StudentsPage.render(c) },
        student: { titleKey: 'page.student.title', subtitleKey: 'page.student.subtitle', render: (c, id) => StudentPage.render(c, id) },
        grades: { titleKey: 'page.grades.title', subtitleKey: 'page.grades.subtitle', render: (c) => GradesPage.render(c) },
        subjects: { titleKey: 'page.subjects.title', subtitleKey: 'page.subjects.subtitle', render: (c) => SubjectsPage.render(c) },
        groups: { titleKey: 'page.groups.title', subtitleKey: 'page.groups.subtitle', render: (c) => GroupsPage.render(c) },
        rating: { titleKey: 'page.rating.title', subtitleKey: 'page.rating.subtitle', render: (c) => RatingPage.render(c) },
        analytics: { titleKey: 'page.analytics.title', subtitleKey: 'page.analytics.subtitle', render: (c) => AnalyticsPage.render(c) },
        settings: { titleKey: 'page.settings.title', subtitleKey: 'page.settings.subtitle', render: (c) => SettingsPage.render(c) }
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
            Utils.toast(I18n.t('common.welcome') + ', ' + name + '!', 'success');
            enterApp(user);
            return;
        }

        openRegistration(fbUser);
    };

    /* ---------------- Регистрация (ФИО + выбор группы) ---------------- */
    const openRegistration = (fbUser) => {
        showRegister();
        $('#regEmail').textContent = fbUser.email || '';

        const input = $('#regName');
        const matchBox = $('#regMatch');
        const groupWrap = $('#regGroupWrap');
        const groupSelect = $('#regGroup');
        let matchedStudent = null;

        // Заполняем группы
        const groups = Store.getGroups();
        groupSelect.innerHTML = '<option value="">— выберите группу —</option>' +
            groups.map(g =>
                '<option value="' + g.id + '">' +
                Utils.escapeHtml(g.name) + ' (' + g.course + ' курс)' +
                '</option>'
            ).join('');

        // Сброс
        input.value = '';
        matchBox.innerHTML = '';
        groupWrap.hidden = true;
        groupSelect.value = '';
        matchedStudent = null;

        input.oninput = () => {
            const q = input.value.trim().toLowerCase();
            matchedStudent = null;
            groupWrap.hidden = true;

            if (q.length < 2) {
                matchBox.innerHTML = '';
                return;
            }

            const matches = Store.getStudents()
                .filter(s => s.fullName.toLowerCase().indexOf(q) !== -1)
                .slice(0, 5);

            // Нет совпадений — предлагаем выбрать группу
            if (matches.length === 0) {
                matchBox.innerHTML =
                    '<div class="insight" style="padding:10px 12px;font-size:12.5px">' +
                    '<div class="insight__icon">+</div>' +
                    '<div>Совпадений нет. Выберите группу ниже — будет создан <b>новый профиль</b>.</div>' +
                    '</div>';
                groupWrap.hidden = false;
                return;
            }

            // Есть совпадения
            matchBox.innerHTML =
                '<div style="font-size:12px;color:var(--text-3);margin:0 0 8px">' +
                'Найдены совпадения — нажмите, если это вы:' +
                '</div>' +
                matches.map(s =>
                    '<button type="button" class="demo-btn" data-id="' + s.id + '" style="width:100%;margin-bottom:6px">' +
                    '<span>' + Utils.escapeHtml(s.fullName) + '</span>' +
                    '<span class="demo-btn__role">' + Utils.escapeHtml(s.group) + '</span>' +
                    '</button>'
                ).join('') +
                '<button type="button" class="btn btn--ghost btn--sm" id="regNewProfile" style="width:100%;margin-top:6px">' +
                '➕ Меня нет в списке — создать новый профиль' +
                '</button>';

            matchBox.querySelectorAll('[data-id]').forEach(btn => {
                btn.onclick = () => {
                    matchedStudent = Store.getStudent(btn.dataset.id);
                    input.value = matchedStudent.fullName;
                    groupWrap.hidden = true;
                    matchBox.innerHTML =
                        '<div class="insight insight--good">' +
                        '<div class="insight__icon">✓</div>' +
                        '<div>Вы выбрали: <b>' + Utils.escapeHtml(matchedStudent.fullName) + '</b> (' +
                        Utils.escapeHtml(matchedStudent.group) + ')</div>' +
                        '</div>';
                };
            });

            const newBtn = $('#regNewProfile');
            if (newBtn) {
                newBtn.onclick = () => {
                    matchedStudent = null;
                    groupWrap.hidden = false;
                    matchBox.innerHTML =
                        '<div class="insight">' +
                        '<div class="insight__icon">+</div>' +
                        '<div>Будет создан новый профиль. Выберите группу ниже.</div>' +
                        '</div>';
                };
            }
        };

        $('#regCancel').onclick = async() => {
            try { await FirebaseService.signOut(); } catch (e) {}
            showLogin();
        };

        $('#regConfirm').onclick = () => {
            const name = input.value.trim();
            if (!name || name.length < 3) {
                Utils.toast('Введите ваше ФИО полностью', 'warn');
                return;
            }

            let student = matchedStudent;

            if (!student) {
                student = Store.getStudents().find(s =>
                    s.fullName.toLowerCase() === name.toLowerCase()
                );
            }

            if (!student) {
                const groupId = groupSelect.value;
                if (!groupId) {
                    Utils.toast('Выберите группу', 'warn');
                    groupWrap.hidden = false;
                    groupSelect.focus();
                    return;
                }

                const group = Store.getGroup(groupId);
                if (!group) {
                    Utils.toast('Группа не найдена', 'error');
                    return;
                }

                student = Store.addStudent({
                    fullName: name,
                    group: group.name,
                    course: group.course,
                    specialty: group.specialty,
                    isStarosta: false
                });

                Utils.toast('Создан новый профиль в группе ' + group.name, 'info');
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
                I18n.t('common.welcome') + ', ' + student.fullName + '!';
            Utils.toast(greeting, 'success');
            enterApp(user);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') $('#regConfirm').click();
        };

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
            '<span>' + I18n.t(m.labelKey) + '</span>' +
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
        const roleKey = 'common.' + user.role;
        userBox.innerHTML =
            '<div class="user-box__avatar">' + Utils.initials(user.name) + '</div>' +
            '<div class="user-box__info">' +
            '<div class="user-box__name">' + Utils.escapeHtml(user.name) + '</div>' +
            '<div class="user-box__role">' + I18n.t(roleKey, user.role) + '</div>' +
            '</div>';
    };

    /* ---------------- Переключатель языков ---------------- */
    const buildLangSwitcher = () => {
        if (document.getElementById('langSwitcher')) return;

        const switcher = document.createElement('div');
        switcher.id = 'langSwitcher';
        switcher.className = 'lang-switcher';

        const labels = { ru: 'RU', kg: 'KG', en: 'EN' };
        const current = I18n.getLang();

        switcher.innerHTML = I18n.languages.map(lang =>
            '<button type="button" class="lang-btn' + (lang === current ? ' lang-btn--active' : '') + '" data-lang="' + lang + '">' +
            labels[lang] +
            '</button>'
        ).join('');

        switcher.addEventListener('click', (e) => {
            const btn = e.target.closest('.lang-btn');
            if (!btn) return;
            const lang = btn.dataset.lang;
            if (lang === I18n.getLang()) return;
            I18n.setLang(lang);

            switcher.querySelectorAll('.lang-btn').forEach(b => {
                b.classList.toggle('lang-btn--active', b.dataset.lang === lang);
            });
        });

        // Вставляем в топбар
        const topbarActions = document.getElementById('topbarActions');
        const topbar = document.querySelector('.topbar');
        if (topbarActions && topbarActions.parentNode) {
            topbarActions.parentNode.insertBefore(switcher, topbarActions);
        } else if (topbar) {
            topbar.appendChild(switcher);
        }
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
            page.innerHTML = Utils.emptyState('Страница не найдена', 'Проверьте адрес в браузере.', '🚫');
            return;
        }

        const menuItem = MENU.find(m => m.id === route);
        if (menuItem && menuItem.roles.indexOf(user.role) === -1) {
            page.innerHTML = Utils.emptyState('Доступ запрещён', 'У вашей роли нет прав.', '🔒');
            return;
        }

        topbarActions.innerHTML = '';
        Charts.destroyAll();
        pageTitle.textContent = I18n.t(config.titleKey);
        pageSubtitle.textContent = I18n.t(config.subtitleKey);
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
        document.documentElement.setAttribute('lang', I18n.getLang());

        if (!location.hash) location.hash = '#/dashboard';
        renderRoute();
    };

    /* ---------------- Инициализация ---------------- */
    const init = () => {
        // Переключатель языков
        buildLangSwitcher();

        // Реакция на смену языка
        window.addEventListener('langchange', () => {
            const user = Store.getCurrentUser();
            if (user) {
                buildNav(user);
                renderUserBox(user);
                renderRoute();
            }
        });

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
        if (!ok) {
            $('#loginError').textContent = 'Firebase не настроен. Проверьте js/firebase.js';
            $('#loginError').hidden = false;
            showLogin();
            return;
        }

        loginScreen.hidden = false;
        $('#loginError').textContent = I18n.t('common.loading');
        $('#loginError').hidden = false;

        Store.load().then(() => {
            $('#loginError').hidden = true;
            FirebaseService.onAuthChanged(handleFirebaseUser);
        }).catch(err => {
            console.error('Ошибка загрузки данных:', err);
            $('#loginError').textContent = 'Ошибка загрузки: ' + err.message;
            $('#loginError').hidden = false;
            FirebaseService.onAuthChanged(handleFirebaseUser);
        });
    };

    document.addEventListener('DOMContentLoaded', init);
})();