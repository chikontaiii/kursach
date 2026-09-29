/* ============================================================
   СТРАНИЦА: НАСТРОЙКИ
   ============================================================ */
const SettingsPage = (() => {
    const render = (container) => {
        const user = Store.getCurrentUser();
        if (!user) return;
        const theme = localStorage.getItem('sa_theme') || 'light';

        container.innerHTML =
            '<div class="grid grid--2">' +
            '<div class="card">' +
            '<div class="card__head"><div><h3 class="card__title">' + I18n.t('settings.profile') + '</h3><p class="card__sub">' + I18n.t('settings.profile.sub') + '</p></div></div>' +
            '<div class="detail-head" style="padding:0;border:0;box-shadow:none;margin-bottom:16px">' +
            '<div class="avatar">' + Utils.initials(user.name) + '</div>' +
            '<div class="detail-head__info"><h3 class="detail-head__name">' + Utils.escapeHtml(user.name) + '</h3>' +
            '<div class="detail-head__meta"><span class="badge badge--blue">' + I18n.t('common.' + user.role) + '</span></div>' +
            '</div>' +
            '</div>' +
            '<label class="field"><span class="field__label">' + I18n.t('settings.name') + '</span><input class="input" id="setName" type="text" value="' + Utils.escapeHtml(user.name) + '"></label>' +
            '<label class="field mt-16"><span class="field__label">' + I18n.t('settings.email') + '</span><input class="input" id="setEmail" type="email" value="' + Utils.escapeHtml(user.email) + '"></label>' +
            '<label class="field mt-16"><span class="field__label">' + I18n.t('settings.role') + '</span><input class="input" type="text" value="' + I18n.t('common.' + user.role) + '" disabled></label>' +
            '<button class="btn btn--primary mt-16" id="setSave" type="button">' + I18n.t('settings.save') + '</button>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card__head"><div><h3 class="card__title">' + I18n.t('settings.appearance') + '</h3><p class="card__sub">' + I18n.t('settings.appearance.sub') + '</p></div></div>' +
            '<div class="row gap-8" style="gap:12px">' +
            '<button class="btn ' + (theme === 'light' ? 'btn--primary' : 'btn--ghost') + '" id="themeLight" type="button">' + I18n.t('settings.theme.light') + '</button>' +
            '<button class="btn ' + (theme === 'dark' ? 'btn--primary' : 'btn--ghost') + '" id="themeDark" type="button">' + I18n.t('settings.theme.dark') + '</button>' +
            '</div>' +
            '<h4 class="section-title" style="margin-top:24px">' + I18n.t('settings.data') + '</h4>' +
            '<p class="muted" style="margin-top:0">' + I18n.t('settings.data.sub') + '</p>' +
            '<div class="row gap-8 mt-16">' +
            '<button class="btn btn--ghost btn--sm" id="exportAll" type="button">' + I18n.t('settings.export') + '</button>' +
            '<button class="btn btn--danger btn--sm" id="resetData" type="button">' + I18n.t('settings.reset') + '</button>' +
            '</div>' +
            '<h4 class="section-title" style="margin-top:24px">' + I18n.t('settings.account') + '</h4>' +
            '<button class="btn btn--ghost" id="logoutSettings" type="button">' + I18n.t('settings.logout') + '</button>' +
            '</div>' +
            '</div>';

        Utils.$('#setSave', container).addEventListener('click', () => {
            const name = Utils.$('#setName', container).value.trim();
            const email = Utils.$('#setEmail', container).value.trim();
            if (!name) { Utils.toast(I18n.t('settings.nameRequired'), 'warn'); return; }
            if (!email || email.indexOf('@') === -1) { Utils.toast(I18n.t('settings.emailInvalid'), 'warn'); return; }
            Store.updateUser(user.id, { name, email });
            Utils.toast(I18n.t('settings.saved'), 'success');
            Utils.$('#userBox').querySelector('.user-box__name').textContent = name;
        });

        const applyTheme = (t) => {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('sa_theme', t);
            Utils.toast(I18n.format('settings.themeChanged', { theme: I18n.t(t === 'dark' ? 'settings.theme.darkShort' : 'settings.theme.lightShort') }), 'info');
            setTimeout(() => {
                location.hash = '#/settings';
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }, 200);
        };
        Utils.$('#themeLight', container).addEventListener('click', () => applyTheme('light'));
        Utils.$('#themeDark', container).addEventListener('click', () => applyTheme('dark'));

        Utils.$('#exportAll', container).addEventListener('click', () => {
            const db = { users: Store.getUsers(), students: Store.getStudents(), subjects: Store.getSubjects(), grades: Store.getGrades(), groups: Store.getGroups() };
            const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'college_analytics_data.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            Utils.toast(I18n.t('settings.exported'), 'success');
        });

        Utils.$('#resetData', container).addEventListener('click', async() => {
            const ok = await Utils.confirmDialog({
                title: I18n.t('settings.reset.title'),
                message: I18n.t('settings.reset.message'),
                confirmText: I18n.t('settings.reset.confirm')
            });
            if (!ok) return;
            Store.reset();
            Utils.toast(I18n.t('settings.reset.done'), 'success');
            location.hash = '#/dashboard';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        Utils.$('#logoutSettings', container).addEventListener('click', async() => {
            const ok = await Utils.confirmDialog({
                title: I18n.t('settings.logout.title'),
                message: I18n.t('settings.logout.message'),
                confirmText: I18n.t('settings.logout.confirm'),
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