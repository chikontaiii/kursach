/* ============================================================
   СТРАНИЦА: ПРЕДМЕТЫ
   ============================================================ */
const SubjectsPage = (() => {
    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') { container.innerHTML = Utils.emptyState('—', '—', '🔒'); return; }
        const subjects = Store.getSubjects();

        const cards = subjects.map(subj => {
            const grades = Store.subjectGrades(subj.id);
            const avg = Store.subjectAverage(subj.id);
            const perf = Store.subjectPerformance(subj.id);
            const count = Store.subjectStudentsCount(subj.id);
            const status = Utils.statusOf(avg);
            return '<div class="card card--hover" style="cursor:pointer" data-subject="' + subj.id + '">' +
                '<div class="card__head"><div>' +
                '<h3 class="card__title">' + Utils.escapeHtml(subj.name) + '</h3>' +
                '<p class="card__sub">' + Utils.escapeHtml(subj.teacher) + '</p>' +
                '</div><span class="badge ' + status.cls + '">' + avg.toFixed(2) + '</span></div>' +
                '<div class="kv">' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.card.students') + '</div><div class="kv__value">' + count + '</div></div>' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.card.grades') + '</div><div class="kv__value">' + grades.length + '</div></div>' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.card.perf') + '</div><div class="kv__value">' + perf + '%</div></div>' +
                '</div></div>';
        }).join('');

        container.innerHTML = '<div class="grid grid--3">' + (cards || Utils.emptyState(I18n.t('subjects.empty'), I18n.t('subjects.empty.text'))) + '</div>';
        container.addEventListener('click', (e) => {
            const card = e.target.closest('[data-subject]');
            if (!card) return;
            openDetail(card.dataset.subject);
        });
        Utils.$('#topbarActions').innerHTML = '<button class="btn btn--primary" id="addSubjectBtn" type="button">' + I18n.t('subjects.add') + '</button>';
        Utils.$('#addSubjectBtn').addEventListener('click', () => openModal(null, () => SubjectsPage.render(container)));
    };

    const openModal = (subjectId, onSave) => {
        const isEdit = Boolean(subjectId);
        const s = isEdit ? Store.getSubject(subjectId) : null;
        Utils.modal({
            title: isEdit ? I18n.t('subjects.modal.edit') : I18n.t('subjects.modal.new'),
            body: '<label class="field"><span class="field__label">' + I18n.t('subjects.modal.name') + '</span>' +
                '<input class="input" id="mSubName" type="text" value="' + (s ? Utils.escapeHtml(s.name) : '') + '" placeholder="' + I18n.t('subjects.modal.namePlaceholder') + '"></label>' +
                '<label class="field"><span class="field__label">' + I18n.t('subjects.modal.teacher') + '</span>' +
                '<input class="input" id="mSubTeacher" type="text" value="' + (s ? Utils.escapeHtml(s.teacher) : '') + '" placeholder="' + I18n.t('subjects.modal.teacherPlaceholder') + '"></label>',
            footer: '<button class="btn btn--ghost" data-close type="button">' + I18n.t('common.cancel') + '</button>' +
                '<button class="btn btn--primary" id="mSubSave" type="button">' + (isEdit ? I18n.t('common.save') : I18n.t('common.add')) + '</button>',
            onMount: (wrap, close) => {
                wrap.querySelector('#mSubSave').addEventListener('click', () => {
                    const name = wrap.querySelector('#mSubName').value.trim();
                    const teacher = wrap.querySelector('#mSubTeacher').value.trim();
                    if (!name) { Utils.toast(I18n.t('subjects.nameRequired'), 'warn'); return; }
                    if (isEdit) { Store.updateSubject(subjectId, { name, teacher });
                        Utils.toast(I18n.t('subjects.updated'), 'success'); } else { Store.addSubject({ name, teacher });
                        Utils.toast(I18n.t('subjects.added'), 'success'); }
                    close();
                    if (onSave) onSave();
                });
            }
        });
    };

    const openDetail = (subjectId) => {
        const subj = Store.getSubject(subjectId);
        if (!subj) return;
        const grades = Store.subjectGrades(subjectId);
        const avg = Store.subjectAverage(subjectId);
        const perf = Store.subjectPerformance(subjectId);
        const dist = Store.gradeDistribution(grades);
        const studentsCount = Store.subjectStudentsCount(subjectId);

        const groupMap = {};
        grades.forEach(g => {
            const s = Store.getStudent(g.studentId);
            if (!s) return;
            if (!groupMap[s.group]) groupMap[s.group] = [];
            groupMap[s.group].push(g.grade);
        });
        const groupLabels = Object.keys(groupMap);
        const groupAvg = groupLabels.map(g => Utils.round(Utils.avg(groupMap[g]), 2));

        Utils.modal({
            title: subj.name,
            body: '<div class="kv">' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.detail.teacher') + '</div><div class="kv__value" style="font-size:14px">' + Utils.escapeHtml(subj.teacher || '—') + '</div></div>' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.detail.avg') + '</div><div class="kv__value">' + avg.toFixed(2) + '</div></div>' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.detail.perf') + '</div><div class="kv__value">' + perf + '%</div></div>' +
                '<div class="kv__item"><div class="kv__label">' + I18n.t('subjects.detail.students') + '</div><div class="kv__value">' + studentsCount + '</div></div>' +
                '</div>' +
                '<h4 class="section-title" style="margin-top:20px">' + I18n.t('subjects.detail.dist') + '</h4>' +
                '<div class="chart-box chart-box--sm"><canvas id="subjDistChart"></canvas></div>' +
                '<h4 class="section-title">' + I18n.t('subjects.detail.byGroups') + '</h4>' +
                '<div class="chart-box chart-box--sm"><canvas id="subjGroupChart"></canvas></div>' +
                '<div class="row gap-8 mt-16">' +
                '<button class="btn btn--ghost btn--sm" id="subjEdit" type="button">✎ ' + I18n.t('common.edit') + '</button>' +
                '<button class="btn btn--danger btn--sm" id="subjDelete" type="button">🗑 ' + I18n.t('common.delete') + '</button>' +
                '</div>',
            onMount: (wrap, close) => {
                setTimeout(() => {
                    Charts.doughnut('subjDistChart', [I18n.t('chart.grade5'), I18n.t('chart.grade4'), I18n.t('chart.grade3'), I18n.t('chart.grade2')], [dist[5], dist[4], dist[3], dist[2]]);
                    if (groupLabels.length) Charts.bar('subjGroupChart', groupLabels, groupAvg, Charts.palette().accent, false);
                }, 50);

                wrap.querySelector('#subjEdit').addEventListener('click', () => {
                    close();
                    setTimeout(() => openModal(subjectId, () => { location.hash = '#/subjects';
                        window.dispatchEvent(new HashChangeEvent('hashchange')); }), 220);
                });
                wrap.querySelector('#subjDelete').addEventListener('click', async() => {
                    close();
                    const ok = await Utils.confirmDialog({
                        title: I18n.t('subjects.delete.title'),
                        message: I18n.format('subjects.delete.message', { name: subj.name }),
                        confirmText: I18n.t('common.delete')
                    });
                    if (!ok) return;
                    Store.deleteSubject(subjectId);
                    Utils.toast(I18n.t('subjects.deleted'), 'success');
                    location.hash = '#/subjects';
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                });
            }
        });
    };

    return { render };
})();