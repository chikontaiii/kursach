/* ============================================================
   i18n — переключение языков RU / KG / EN
   ============================================================ */
const I18n = (() => {
    const KEY = 'sa_lang';
    let current = localStorage.getItem(KEY) || 'ru';

    const translations = {
        ru: {
            // Меню
            'menu.dashboard': 'Доска',
            'menu.my': 'Мой профиль',
            'menu.students': 'Студенты',
            'menu.grades': 'Оценки',
            'menu.subjects': 'Предметы',
            'menu.groups': 'Группы',
            'menu.rating': 'Рейтинг',
            'menu.analytics': 'Аналитика',
            'menu.settings': 'Настройки',

            // Заголовки страниц
            'page.dashboard.title': 'Dashboard',
            'page.dashboard.subtitle': 'Обзор успеваемости группы',
            'page.my.title': 'Мой профиль',
            'page.my.subtitle': 'Личные показатели успеваемости',
            'page.students.title': 'Студенты',
            'page.students.subtitle': 'Список всех студентов',
            'page.student.title': 'Профиль студента',
            'page.student.subtitle': 'Детальная информация',
            'page.grades.title': 'Оценки',
            'page.grades.subtitle': 'Журнал оценок',
            'page.subjects.title': 'Предметы',
            'page.subjects.subtitle': 'Статистика по дисциплинам',
            'page.groups.title': 'Группы',
            'page.groups.subtitle': 'Учебные группы колледжа',
            'page.rating.title': 'Рейтинг',
            'page.rating.subtitle': 'Автоматический рейтинг студентов',
            'page.analytics.title': 'Аналитика',
            'page.analytics.subtitle': 'Гибкие срезы данных',
            'page.settings.title': 'Настройки',
            'page.settings.subtitle': 'Профиль и оформление',

            // Общее
            'common.logout': 'Выйти',
            'common.admin': 'Администратор',
            'common.teacher': 'Преподаватель',
            'common.starosta': 'Староста',
            'common.student': 'Студент',
            'common.loading': 'Загрузка данных из облака…',
            'common.welcome': 'Добро пожаловать',
            'common.good': 'Отлично',
            'common.warning': 'Требует внимания',
            'common.low': 'Низкая успеваемость',
            'common.high': 'Высокая успеваемость'
        },

        kg: {
            // Меню
            'menu.dashboard': 'Башкы бет',
            'menu.my': 'Менин профилим',
            'menu.students': 'Студенттер',
            'menu.grades': 'Баалар',
            'menu.subjects': 'Предметтер',
            'menu.groups': 'Топтор',
            'menu.rating': 'Рейтинг',
            'menu.analytics': 'Аналитика',
            'menu.settings': 'Жөндөөлөр',

            // Заголовки
            'page.dashboard.title': 'Башкы бет',
            'page.dashboard.subtitle': 'Топтун жетишкендигине сереп',
            'page.my.title': 'Менин профилим',
            'page.my.subtitle': 'Жеке жетишкендик көрсөткүчтөрү',
            'page.students.title': 'Студенттер',
            'page.students.subtitle': 'Бардык студенттердин тизмеси',
            'page.student.title': 'Студенттин профили',
            'page.student.subtitle': 'Кеңири маалымат',
            'page.grades.title': 'Баалар',
            'page.grades.subtitle': 'Баалар журналы',
            'page.subjects.title': 'Предметтер',
            'page.subjects.subtitle': 'Дисциплиналар боюнча статистика',
            'page.groups.title': 'Топтор',
            'page.groups.subtitle': 'Колледждин окуу топтору',
            'page.rating.title': 'Рейтинг',
            'page.rating.subtitle': 'Студенттердин автоматтык рейтинги',
            'page.analytics.title': 'Аналитика',
            'page.analytics.subtitle': 'Ийкемдүү кесилиштер',
            'page.settings.title': 'Жөндөөлөр',
            'page.settings.subtitle': 'Профиль жана жасалга',

            // Общее
            'common.logout': 'Чыгуу',
            'common.admin': 'Администратор',
            'common.teacher': 'Мугалим',
            'common.starosta': 'Староста',
            'common.student': 'Студент',
            'common.loading': 'Булуттан маалымат жүктөлүүдө…',
            'common.welcome': 'Кош келиңиз',
            'common.good': 'Жакшы',
            'common.warning': 'Көңүл буруу керек',
            'common.low': 'Төмөн жетишкендик',
            'common.high': 'Жогорку жетишкендик'
        },

        en: {
            // Меню
            'menu.dashboard': 'Dashboard',
            'menu.my': 'My Profile',
            'menu.students': 'Students',
            'menu.grades': 'Grades',
            'menu.subjects': 'Subjects',
            'menu.groups': 'Groups',
            'menu.rating': 'Rating',
            'menu.analytics': 'Analytics',
            'menu.settings': 'Settings',

            // Заголовки
            'page.dashboard.title': 'Dashboard',
            'page.dashboard.subtitle': 'Group performance overview',
            'page.my.title': 'My Profile',
            'page.my.subtitle': 'Personal performance metrics',
            'page.students.title': 'Students',
            'page.students.subtitle': 'All students list',
            'page.student.title': 'Student Profile',
            'page.student.subtitle': 'Detailed information',
            'page.grades.title': 'Grades',
            'page.grades.subtitle': 'Grade journal',
            'page.subjects.title': 'Subjects',
            'page.subjects.subtitle': 'Statistics by discipline',
            'page.groups.title': 'Groups',
            'page.groups.subtitle': 'College study groups',
            'page.rating.title': 'Rating',
            'page.rating.subtitle': 'Automatic student ranking',
            'page.analytics.title': 'Analytics',
            'page.analytics.subtitle': 'Flexible data slices',
            'page.settings.title': 'Settings',
            'page.settings.subtitle': 'Profile and appearance',

            // Общее
            'common.logout': 'Log out',
            'common.admin': 'Administrator',
            'common.teacher': 'Teacher',
            'common.starosta': 'Group leader',
            'common.student': 'Student',
            'common.loading': 'Loading data from cloud…',
            'common.welcome': 'Welcome',
            'common.good': 'Good',
            'common.warning': 'Needs attention',
            'common.low': 'Low performance',
            'common.high': 'High performance'
        }
    };

    const t = (key, fallback) => {
        const dict = translations[current] || translations.ru;
        if (dict[key] !== undefined) return dict[key];
        if (translations.ru[key] !== undefined) return translations.ru[key];
        return fallback !== undefined ? fallback : key;
    };

    const setLang = (lang) => {
        if (!translations[lang]) return;
        current = lang;
        localStorage.setItem(KEY, lang);
        document.documentElement.setAttribute('lang', lang);
        // Сообщаем приложению, что надо перерисоваться
        window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
    };

    const getLang = () => current;

    return {
        t: t,
        setLang: setLang,
        getLang: getLang,
        languages: ['ru', 'kg', 'en']
    };
})();