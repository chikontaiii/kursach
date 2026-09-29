/* ============================================================
   СТРАНИЦА: ОЦЕНКИ
   ============================================================ */
const GradesPage = (() => {
    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') {
            container.innerHTML = Utils.emptyState('Раздел недоступен', 'У вашей роли нет доступа.', '🔒');
            return;
        }

        const state = { q: '', subject: 'all', semester: 'all', sortKey: 'date', sortDir: 'desc', page: 1, perPage: 12 };
        const subjects = Store.getSubjects();
        const semesters = [].concat.apply([], Store.getVisible ? [] : []).concat(
            [].concat.apply([], Store.getGrades().map(g => g.semester))
            .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)
        );

        container.innerHTML =
            '<div class="table-wrap">' +
            '<div class="table-toolbar">' +
            '<input class="input" id="grSearch" placeholder="🔍 ' + I18n.t('grades.search') + '" autocomplete="off">' +
            '<select class="select" id="grSubject"><option value="all">' + I18n.t('grades.allSubjects') + '</option>' +
            subjects.map(s => '<option value="' + s.id + '">' + Utils.escapeHtml(s.name) + '</option>').join('') +
            '</select>' +
            '<select class="select" id="grSemester"><option value="all">' + I18n.t('grades.allSemesters') + '</option>' +
            semesters.map(s => '<option value="' + s + '">' + s + ' ' + I18n.t('common.semester').toLowerCase() + '</option>').join('') +
            '</select>' +
            '<div class="table-toolbar__spacer"></div>' +
            '<button class="btn btn--ghost btn--sm" id="grExport" type="button">' + I18n.t('grades.export') + '</button>' +
            '</div>' +
            '<div id="grTableBody"></div>' +
            '</div>';

        const body = Utils.$('#grTableBody', container);

        const getFiltered = () => {
            let list = Store.visibleGrades().map(g => {
                const s = Store.getStudent(g.studentId);
                const subj = Store.getSubject(g.subjectId);
                const teacher = Store.getUserById(g.teacherId);
                return Object.assign({}, g, {
                    studentName: s ? s.fullName : '—',
                    studentGroup: s ? s.group : '',
                    subjectName: subj ? subj.name : '—',
                    teacherName: teacher ? teacher.name : (subj ? subj.teacher : '—')
                });
            });
            const q = state.q.trim().toLowerCase();
            if (q) list = list.filter(g => g.studentName.toLowerCase().indexOf(q) !== -1 || g.subjectName.toLowerCase().indexOf(q) !== -1);
            if (state.subject !== 'all') list = list.filter(g => g.subjectId === state.subject);
            if (state.semester !== 'all') list = list.filter(g => String(g.semester) === String(state.semester));
            return Utils.sortBy(list, (g) => {
                const k = state.sortKey;
                if (k === 'grade') return g.grade;
                if (k === 'semester') return g.semester;
                if (k === 'date') return new Date(g.date).getTime();
                return g[k] || '';
            }, state.sortDir);
        };

        const gradeBadge = (grade) => {
            const cls = grade === 5 ? 'badge--green' : grade === 4 ? 'badge--blue' : grade === 3 ? 'badge--yellow' : 'badge--red';
            return '<span class="badge ' + cls + '">' + grade + '</span>';
        };

        const draw = () => {
            const all = getFiltered();
            const total = all.length;
            const totalPages = Math.max(1, Math.ceil(total / state.perPage));
            if (state.page > totalPages) state.page = totalPages;
            const start = (state.page - 1) * state.perPage;
            const rows = all.slice(start, start + state.perPage);
            const sInd = (k) => state.sortKey === k ? (state.sortDir === 'asc' ? '▲' : '▼') : '';

            if (!total) {
                body.innerHTML = Utils.emptyState(I18n.t('grades.empty.title'), I18n.t('grades.empty.text'), '📝');
                return;
            }

            body.innerHTML =
                '<div class="table-scroll"><table class="data"><thead><tr>' +
                '<th style="width:50px">' + I18n.t('common.number') + '</th>' +
                '<th class="sortable" data-sort="studentName">' + I18n.t('grades.table.student') + ' <span class="sort-ind">' + sInd('studentName') + '</span></th>' +
                '<th class="sortable" data-sort="subjectName">' + I18n.t('grades.table.subject') + ' <span class="sort-ind">' + sInd('subjectName') + '</span></th>' +
                '<th class="sortable" data-sort="grade">' + I18n.t('grades.table.grade') + ' <span class="sort-ind">' + sInd('grade') + '</span></th>' +
                '<th class="sortable" data-sort="semester">' + I18n.t('grades.table.semester') + ' <span class="sort-ind">' + sInd('semester') + '</span></th>' +
                '<th class="sortable" data-sort="date">' + I18n.t('grades.table.date') + ' <span class="sort-ind">' + sInd('date') + '</span></th>' +
                '<th>' + I18n.t('grades.table.teacher') + '</th>' +
                '<th style="text-align:right">' + I18n.t('common.actions') + '</th>' +
                '</tr></thead><tbody>' +
                rows.map((g, i) =>
                    '<tr>' +
                    '<td class="cell-muted">' + (start + i + 1) + '</td>' +
                    '<td class="cell-name">' + Utils.escapeHtml(g.studentName) + '</td>' +
                    '<td>' + Utils.escapeHtml(g.subjectName) + '</td>' +
                    '<td>' + gradeBadge(g.grade) + '</td>' +
                    '<td class="cell-muted">' + g.semester + '</td>' +
                    '<td class="cell-muted">' + Utils.formatDate(g.date) + '</td>' +
                    '<td class="cell-muted">' + Utils.escapeHtml(g.teacherName) + '</td>' +
                    '<td><div class="actions">' +
                    '<button class="icon-btn icon-btn--sm" data-edit="' + g.id + '" title="' + I18n.t('common.edit') + '" type="button">✎</button>' +
                    '<button class="icon-btn icon-btn--sm" data-del="' + g.id + '" title="' + I18n.t('common.delete') + '" type="button">🗑</button>' +
                    '</div></td>' +
                    '</tr>'
                ).join('') +
                '</tbody></table></div>' +
                '<div class="pagination">' +
                '<div class="pagination__info">' + I18n.t('students.showing') + ' ' + (start + 1) + '–' + Math.min(start + state.perPage, total) + ' ' + I18n.t('students.of') + ' ' + total + '</div>' +
                '<div class="pagination__btns">' +
                '<button class="page-btn" data-page="prev" ' + (state.page === 1 ? 'disabled' : '') + ' type="button">‹</button>' +
                pageBtns(state.page, totalPages) +
                '<button class="page-btn" data-page="next" ' + (state.page === totalPages ? 'disabled' : '') + ' type="button">›</button>' +
                '</div>' +
                '</div>';
        };

        const pageBtns = (current, total) => {
            const btns = [];
            const max = 5;
            let from = Math.max(1, current - Math.floor(max / 2));
            let to = Math.min(total, from + max - 1);
            if (to - from + 1 < max) from = Math.max(1, to - max + 1);
            for (let i = from; i <= to; i++) btns.push('<button class="page-btn ' + (i === current ? 'page-btn--active' : '') + '" data-page="' + i + '" type="button">' + i + '</button>');
            return btns.join('');
        };

        Utils.$('#grSearch', container).addEventListener('input', Utils.debounce((e) => { state.q = e.target.value;
            state.page = 1;
            draw(); }, 200));
        Utils.$('#grSubject', container).addEventListener('change', (e) => { state.subject = e.target.value;
            state.page = 1;
            draw(); });
        Utils.$('#grSemester', container).addEventListener('change', (e) => { state.semester = e.target.value;
            state.page = 1;
            draw(); });

        Utils.$('#grExport', container).addEventListener('click', () => {
            const rows = [
                [I18n.t('grades.table.student'), I18n.t('common.group'), I18n.t('grades.table.subject'), I18n.t('grades.table.grade'), I18n.t('grades.table.semester'), I18n.t('grades.table.date'), I18n.t('grades.table.teacher')]
            ];
            getFiltered().forEach(g => rows.push([g.studentName, g.studentGroup, g.subjectName, g.grade, g.semester, g.date, g.teacherName]));
            Utils.downloadCSV('grades.csv', rows);
            Utils.toast(I18n.t('grades.exportToast'), 'success');
        });

        body.addEventListener('click', async(e) => {
            const th = e.target.closest('th[data-sort]');
            if (th) {
                const k = th.dataset.sort;
                if (state.sortKey === k) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
                else { state.sortKey = k;
                    state.sortDir = 'asc'; }
                draw();
                return;
            }
            const pb = e.target.closest('[data-page]');
            if (pb && !pb.disabled) {
                const v = pb.dataset.page;
                const tp = Math.max(1, Math.ceil(getFiltered().length / state.perPage));
                if (v === 'prev') state.page = Math.max(1, state.page - 1);
                else if (v === 'next') state.page = Math.min(tp, state.page + 1);
                else state.page = Number(v);
                draw();
                return;
            }
            const ed = e.target.closest('[data-edit]');
            if (ed) { openModal(ed.dataset.edit, draw); return; }
            const dl = e.target.closest('[data-del]');
            if (dl) {
                const g = Store.getGrade(dl.dataset.del);
                if (!g) return;
                const s = Store.getStudent(g.studentId);
                const subj = Store.getSubject(g.subjectId);
                const ok = await Utils.confirmDialog({
                    title: I18n.t('grades.delete.title'),
                    message: I18n.format('grades.delete.message', { grade: g.grade, subject: subj ? subj.name : '—', student: s ? s.fullName : '—' }),
                    confirmText: I18n.t('common.delete')
                });
                if (!ok) return;
                Store.deleteGrade(g.id);
                Utils.toast(I18n.t('grades.deleted'), 'success');
                draw();
            }
        });

        Utils.$('#topbarActions').innerHTML = '<button class="btn btn--primary" id="addGradeBtn" type="button">' + I18n.t('grades.add') + '</button>';
        Utils.$('#addGradeBtn').addEventListener('click', () => openModal(null, draw));
        draw();
    };

    const openModal = (gradeId, onSave) => {
        const isEdit = Boolean(gradeId);
        const g = isEdit ? Store.getGrade(gradeId) : null;
        const students = Store.getStudents();
        const subjects = Store.getSubjects();
        const user = Store.getCurrentUser();

        Utils.modal({
            title: isEdit ? I18n.t('grades.modal.edit') : I18n.t('grades.modal.new'),
            body: '<label class="field"><span class="field__label">' + I18n.t('grades.modal.student') + '</span>' +
                '<select class="select" id="mGrStudent">' + students.map(s => '<option value="' + s.id + '" ' + (g && g.studentId === s.id ? 'selected' : '') + '>' + Utils.escapeHtml(s.fullName) + ' — ' + Utils.escapeHtml(s.group) + '</option>').join('') + '</select></label>' +
                '<label class="field"><span class="field__label">' + I18n.t('grades.modal.subject') + '</span>' +
                '<select class="select" id="mGrSubject">' + subjects.map(s => '<option value="' + s.id + '" ' + (g && g.subjectId === s.id ? 'selected' : '') + '>' + Utils.escapeHtml(s.name) + '</option>').join('') + '</select></label>' +
                '<label class="field"><span class="field__label">' + I18n.t('grades.modal.grade') + '</span>' +
                '<select class="select" id="mGrGrade">' + [5, 4, 3, 2].map(n => '<option value="' + n + '" ' + (g && g.grade === n ? 'selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
                '<label class="field"><span class="field__label">' + I18n.t('grades.modal.semester') + '</span>' +
                '<select class="select" id="mGrSemester">' + [1, 2, 3, 4, 5, 6].map(n => '<option value="' + n + '" ' + (g && g.semester === n ? 'selected' : (!g && n === 4 ? 'selected' : '')) + '>' + n + '</option>').join('') + '</select></label>' +
                '<label class="field"><span class="field__label">' + I18n.t('grades.modal.date') + '</span>' +
                '<input class="input" id="mGrDate" type="date" value="' + (g ? g.date : new Date().toISOString().slice(0, 10)) + '"></label>',
            footer: '<button class="btn btn--ghost" data-close type="button">' + I18n.t('common.cancel') + '</button>' +
                '<button class="btn btn--primary" id="mGrSave" type="button">' + (isEdit ? I18n.t('common.save') : I18n.t('common.add')) + '</button>',
            onMount: (wrap, close) => {
                wrap.querySelector('#mGrSave').addEventListener('click', () => {
                    const studentId = wrap.querySelector('#mGrStudent').value;
                    const subjectId = wrap.querySelector('#mGrSubject').value;
                    const grade = Number(wrap.querySelector('#mGrGrade').value);
                    const semester = Number(wrap.querySelector('#mGrSemester').value);
                    const date = wrap.querySelector('#mGrDate').value;
                    if ([2, 3, 4, 5].indexOf(grade) === -1) { Utils.toast(I18n.t('grades.invalidGrade'), 'error'); return; }
                    if (!date) { Utils.toast(I18n.t('grades.dateRequired'), 'warn'); return; }
                    const data = { studentId, subjectId, grade, semester, date, teacherId: user.id };
                    if (isEdit) { Store.updateGrade(gradeId, data);
                        Utils.toast(I18n.t('grades.updated'), 'success'); } else { Store.addGrade(data);
                        Utils.toast(I18n.t('grades.added'), 'success'); }
                    close();
                    if (onSave) onSave();
                });
            }
        });
    };

    return { render };
})();