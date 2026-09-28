/* ============================================================
   СТРАНИЦА: НАСТРОЙКИ — профиль, тема, выход
   ============================================================ */
const SettingsPage = (() => {

    const render = (container) => {
        const user = Store.getCurrentUser();
        if (!user) return;

        const roleLabels = { admin: 'Администратор', teacher: 'Преподаватель', student: 'Студент' };
        const theme = localStorage.getItem('sa_theme') || 'light';

        container.innerHTML = `
      <div class="grid grid--2">
        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Профиль пользователя</h3>
              <p class="card__sub">Основная информация</p>
            </div>
          </div>

          <div class="detail-head" style="padding:0;border:0;box-shadow:none;margin-bottom:16px">
            <div class="avatar">${Utils.initials(user.name)}</div>
            <div class="detail-head__info">
              <h3 class="detail-head__name">${Utils.escapeHtml(user.name)}</h3>
              <div class="detail-head__meta">
                <span class="badge badge--blue">${roleLabels[user.role] || user.role}</span>
              </div>
            </div>
          </div>

          <label class="field">
            <span class="field__label">Имя</span>
            <input class="input" id="setName" type="text" value="${Utils.escapeHtml(user.name)}">
          </label>
          <label class="field mt-16">
            <span class="field__label">Email</span>
            <input class="input" id="setEmail" type="email" value="${Utils.escapeHtml(user.email)}">
          </label>
          <label class="field mt-16">
            <span class="field__label">Роль</span>
            <input class="input" type="text" value="${roleLabels[user.role] || user.role}" disabled>
          </label>

          <button class="btn btn--primary mt-16" id="setSave" type="button">Сохранить изменения</button>
        </div>

        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Оформление</h3>
              <p class="card__sub">Светлая или тёмная тема</p>
            </div>
          </div>

          <div class="row gap-8" style="gap:12px">
            <button class="btn ${theme === 'light' ? 'btn--primary' : 'btn--ghost'}" id="themeLight" type="button">☀️ Светлая</button>
            <button class="btn ${theme === 'dark' ? 'btn--primary' : 'btn--ghost'}" id="themeDark" type="button">🌙 Тёмная</button>
          </div>

          <h4 class="section-title" style="margin-top:24px">Данные</h4>
          <p class="muted" style="margin-top:0">Демо-данные хранятся в localStorage браузера. Сброс вернёт исходный набор.</p>
          <div class="row gap-8 mt-16">
            <button class="btn btn--ghost btn--sm" id="exportAll" type="button">⬇ Экспорт всех данных (JSON)</button>
            <button class="btn btn--danger btn--sm" id="resetData" type="button">♻ Сбросить демо-данные</button>
          </div>

          <h4 class="section-title" style="margin-top:24px">Аккаунт</h4>
          <button class="btn btn--ghost" id="logoutSettings" type="button">Выйти из аккаунта</button>
        </div>
      </div>
    `;

        /* ---------------- Сохранение профиля ---------------- */
        Utils.$('#setSave', container).addEventListener('click', () => {
            const name = Utils.$('#setName', container).value.trim();
            const email = Utils.$('#setEmail', container).value.trim();
            if (!name) { Utils.toast('Имя не может быть пустым', 'warn'); return; }
            if (!email || !email.includes('@')) { Utils.toast('Введите корректный email', 'warn'); return; }
            Store.updateUser(user.id, { name, email });
            Utils.toast('Профиль обновлён', 'success');
            // Обновить имя в сайдбаре
            Utils.$('#userBox').querySelector('.user-box__name').textContent = name;
        });

        /* ---------------- Смена темы ---------------- */
        const applyTheme = (t) => {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('sa_theme', t);
            Utils.toast(`Тема: ${t === 'dark' ? 'тёмная' : 'светлая'}`, 'info');
            // Перерисовать страницу, чтобы графики обновили цвета
            setTimeout(() => {
                location.hash = '#/settings';
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }, 200);
        };

        Utils.$('#themeLight', container).addEventListener('click', () => applyTheme('light'));
        Utils.$('#themeDark', container).addEventListener('click', () => applyTheme('dark'));

        /* ---------------- Экспорт JSON ---------------- */
        Utils.$('#exportAll', container).addEventListener('click', () => {
            const db = {
                users: Store.getUsers(),
                students: Store.getStudents(),
                subjects: Store.getSubjects(),
                grades: Store.getGrades(),
                groups: Store.getGroups()
            };
            const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'college_analytics_data.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            Utils.toast('Данные экспортированы в JSON', 'success');
        });

        /* ---------------- Сброс данных ---------------- */
        Utils.$('#resetData', container).addEventListener('click', async() => {
            const ok = await Utils.confirmDialog({
                title: 'Сбросить демо-данные?',
                message: 'Все текущие изменения будут потеряны. Система вернётся к исходному демонстрационному набору.',
                confirmText: 'Сбросить'
            });
            if (!ok) return;
            Store.reset();
            Utils.toast('Демо-данные восстановлены', 'success');
            location.hash = '#/dashboard';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        /* ---------------- Выход ---------------- */
        Utils.$('#logoutSettings', container).addEventListener('click', async() => {
            const ok = await Utils.confirmDialog({
                title: 'Выйти из аккаунта?',
                message: 'Сессия будет завершена.',
                confirmText: 'Выйти',
                danger: false
            });
            if (!ok) return;
            Store.logout();
            Charts.destroyAll();
            location.hash = '';
            location.reload();
        });
    };

    return { render };
})();