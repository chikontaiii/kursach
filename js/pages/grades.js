/* ============================================================
   СТРАНИЦА: ОЦЕНКИ — таблица, добавление, редактирование, удаление
   ============================================================ */
const GradesPage = (() => {

            const render = (container) => {
                    const user = Store.getCurrentUser();
                    if (user.role === 'student') {
                        container.innerHTML = Utils.emptyState('Раздел недоступен', 'У вашей роли нет доступа к журналу оценок.', '🔒');
                        return;
                    }

                    const state = {
                        q: '',
                        subject: 'all',
                        semester: 'all',
                        sortKey: 'date',
                        sortDir: 'desc',
                        page: 1,
                        perPage: 12
                    };

                    const subjects = Store.getSubjects();
                    const semesters = [...new Set(Store.getGrades().map(g => g.semester))].sort((a, b) => a - b);

                    container.innerHTML = `
      <div class="table-wrap">
        <div class="table-toolbar">
          <input class="input" id="grSearch" placeholder="🔍 Поиск по студенту..." autocomplete="off">
          <select class="select" id="grSubject">
            <option value="all">Все предметы</option>
            ${subjects.map(s => `<option value="${s.id}">${Utils.escapeHtml(s.name)}</option>`).join('')}
          </select>
          <select class="select" id="grSemester">
            <option value="all">Все семестры</option>
            ${semesters.map(s => `<option value="${s}">${s} семестр</option>`).join('')}
          </select>
          <div class="table-toolbar__spacer"></div>
          <button class="btn btn--ghost btn--sm" id="grExport" type="button">⬇ CSV</button>
        </div>
        <div id="grTableBody"></div>
      </div>
    `;

    const body = Utils.$('#grTableBody', container);

    /* ---------------- Фильтрация ---------------- */
    const getFiltered = () => {
      let list = Store.visibleGrades().map(g => {
        const s = Store.getStudent(g.studentId);
        const subj = Store.getSubject(g.subjectId);
        const teacher = Store.getUserById(g.teacherId);
        return {
          ...g,
          studentName: s ? s.fullName : '—',
          studentGroup: s ? s.group : '',
          subjectName: subj ? subj.name : '—',
          teacherName: teacher ? teacher.name : (subj ? subj.teacher : '—')
        };
      });

      const q = state.q.trim().toLowerCase();
      if (q) {
        list = list.filter(g =>
          g.studentName.toLowerCase().includes(q) ||
          g.subjectName.toLowerCase().includes(q)
        );
      }
      if (state.subject !== 'all') list = list.filter(g => g.subjectId === state.subject);
      if (state.semester !== 'all') list = list.filter(g => String(g.semester) === String(state.semester));

      list = Utils.sortBy(list, (g) => {
        const k = state.sortKey;
        if (k === 'grade') return g.grade;
        if (k === 'semester') return g.semester;
        if (k === 'date') return new Date(g.date).getTime();
        return g[k] || '';
      }, state.sortDir);

      return list;
    };

    /* ---------------- Отрисовка ---------------- */
    const draw = () => {
      const all = getFiltered();
      const total = all.length;
      const totalPages = Math.max(1, Math.ceil(total / state.perPage));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * state.perPage;
      const pageRows = all.slice(start, start + state.perPage);

      const sortInd = (key) => state.sortKey === key ? (state.sortDir === 'asc' ? '▲' : '▼') : '';

      if (!total) {
        body.innerHTML = Utils.emptyState('Оценки не найдены', 'Измените фильтры или добавьте новую оценку.', '📝');
        return;
      }

      body.innerHTML = `
        <div class="table-scroll">
          <table class="data">
            <thead>
              <tr>
                <th style="width:50px">№</th>
                <th class="sortable" data-sort="studentName">Студент <span class="sort-ind">${sortInd('studentName')}</span></th>
                <th class="sortable" data-sort="subjectName">Предмет <span class="sort-ind">${sortInd('subjectName')}</span></th>
                <th class="sortable" data-sort="grade">Оценка <span class="sort-ind">${sortInd('grade')}</span></th>
                <th class="sortable" data-sort="semester">Семестр <span class="sort-ind">${sortInd('semester')}</span></th>
                <th class="sortable" data-sort="date">Дата <span class="sort-ind">${sortInd('date')}</span></th>
                <th>Преподаватель</th>
                <th style="text-align:right">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${pageRows.map((g, i) => `
                <tr>
                  <td class="cell-muted">${start + i + 1}</td>
                  <td class="cell-name">${Utils.escapeHtml(g.studentName)}</td>
                  <td>${Utils.escapeHtml(g.subjectName)}</td>
                  <td>${gradeBadge(g.grade)}</td>
                  <td class="cell-muted">${g.semester}</td>
                  <td class="cell-muted">${Utils.formatDate(g.date)}</td>
                  <td class="cell-muted">${Utils.escapeHtml(g.teacherName)}</td>
                  <td>
                    <div class="actions">
                      <button class="icon-btn icon-btn--sm" data-edit="${g.id}" title="Редактировать" type="button">✎</button>
                      <button class="icon-btn icon-btn--sm" data-del="${g.id}" title="Удалить" type="button">🗑</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <div class="pagination__info">Показано ${start + 1}–${Math.min(start + state.perPage, total)} из ${total}</div>
          <div class="pagination__btns">
            <button class="page-btn" data-page="prev" ${state.page === 1 ? 'disabled' : ''} type="button">‹</button>
            ${paginationButtons(state.page, totalPages)}
            <button class="page-btn" data-page="next" ${state.page === totalPages ? 'disabled' : ''} type="button">›</button>
          </div>
        </div>
      `;
    };

    const paginationButtons = (current, total) => {
      const btns = [];
      const max = 5;
      let from = Math.max(1, current - Math.floor(max / 2));
      let to = Math.min(total, from + max - 1);
      if (to - from + 1 < max) from = Math.max(1, to - max + 1);
      for (let i = from; i <= to; i++) {
        btns.push(`<button class="page-btn ${i === current ? 'page-btn--active' : ''}" data-page="${i}" type="button">${i}</button>`);
      }
      return btns.join('');
    };

    const gradeBadge = (grade) => {
      const cls = grade === 5 ? 'badge--green' : grade === 4 ? 'badge--blue' : grade === 3 ? 'badge--yellow' : 'badge--red';
      return `<span class="badge ${cls}">${grade}</span>`;
    };

    /* ---------------- Обработчики ---------------- */
    Utils.$('#grSearch', container).addEventListener('input', Utils.debounce((e) => {
      state.q = e.target.value; state.page = 1; draw();
    }, 200));

    Utils.$('#grSubject', container).addEventListener('change', (e) => {
      state.subject = e.target.value; state.page = 1; draw();
    });

    Utils.$('#grSemester', container).addEventListener('change', (e) => {
      state.semester = e.target.value; state.page = 1; draw();
    });

    Utils.$('#grExport', container).addEventListener('click', () => {
      const rows = [['Студент', 'Группа', 'Предмет', 'Оценка', 'Семестр', 'Дата', 'Преподаватель']];
      getFiltered().forEach(g => rows.push([g.studentName, g.studentGroup, g.subjectName, g.grade, g.semester, g.date, g.teacherName]));
      Utils.downloadCSV('grades.csv', rows);
      Utils.toast('Оценки экспортированы в CSV', 'success');
    });

    body.addEventListener('click', async (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const k = th.dataset.sort;
        if (state.sortKey === k) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = k; state.sortDir = 'asc'; }
        draw();
        return;
      }

      const pb = e.target.closest('[data-page]');
      if (pb && !pb.disabled) {
        const v = pb.dataset.page;
        const totalPages = Math.max(1, Math.ceil(getFiltered().length / state.perPage));
        if (v === 'prev') state.page = Math.max(1, state.page - 1);
        else if (v === 'next') state.page = Math.min(totalPages, state.page + 1);
        else state.page = Number(v);
        draw();
        return;
      }

      const edit = e.target.closest('[data-edit]');
      if (edit) { openGradeModal(edit.dataset.edit, draw); return; }

      const del = e.target.closest('[data-del]');
      if (del) {
        const g = Store.getGrade(del.dataset.del);
        if (!g) return;
        const s = Store.getStudent(g.studentId);
        const subj = Store.getSubject(g.subjectId);
        const ok = await Utils.confirmDialog({
          title: 'Удалить оценку?',
          message: `Оценка ${g.grade} по предмету «${subj ? subj.name : '—'}» у студента «${s ? s.fullName : '—'}» будет удалена.`,
          confirmText: 'Удалить'
        });
        if (!ok) return;
        Store.deleteGrade(g.id);
        Utils.toast('Оценка удалена', 'success');
        draw();
      }
    });

    // Кнопка "Добавить" в топбаре
    const actions = Utils.$('#topbarActions');
    actions.innerHTML = `<button class="btn btn--primary" id="addGradeBtn" type="button">+ Добавить оценку</button>`;
    Utils.$('#addGradeBtn').addEventListener('click', () => openGradeModal(null, draw));

    draw();
  };

  /* ---------------- Модальное окно оценки ---------------- */
  const openGradeModal = (gradeId, onSave) => {
    const isEdit = Boolean(gradeId);
    const g = isEdit ? Store.getGrade(gradeId) : null;
    const students = Store.getStudents();
    const subjects = Store.getSubjects();
    const user = Store.getCurrentUser();

    Utils.modal({
      title: isEdit ? 'Редактировать оценку' : 'Новая оценка',
      body: `
        <label class="field">
          <span class="field__label">Студент</span>
          <select class="select" id="mGrStudent">
            ${students.map(s => `<option value="${s.id}" ${g && g.studentId === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.fullName)} — ${Utils.escapeHtml(s.group)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Предмет</span>
          <select class="select" id="mGrSubject">
            ${subjects.map(s => `<option value="${s.id}" ${g && g.subjectId === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Оценка</span>
          <select class="select" id="mGrGrade">
            ${[5, 4, 3, 2].map(n => `<option value="${n}" ${g && g.grade === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Семестр</span>
          <select class="select" id="mGrSemester">
            ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${g && g.semester === n ? 'selected' : (n === 4 && !g ? 'selected' : '')}>${n}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Дата</span>
          <input class="input" id="mGrDate" type="date" value="${g ? g.date : new Date().toISOString().slice(0, 10)}">
        </label>
      `,
      footer: `
        <button class="btn btn--ghost" data-close type="button">Отмена</button>
        <button class="btn btn--primary" id="mGrSave" type="button">${isEdit ? 'Сохранить' : 'Добавить'}</button>
      `,
      onMount: (wrap, close) => {
        const save = () => {
          const studentId = wrap.querySelector('#mGrStudent').value;
          const subjectId = wrap.querySelector('#mGrSubject').value;
          const grade = Number(wrap.querySelector('#mGrGrade').value);
          const semester = Number(wrap.querySelector('#mGrSemester').value);
          const date = wrap.querySelector('#mGrDate').value;

          if (![2, 3, 4, 5].includes(grade)) {
            Utils.toast('Оценка должна быть 2, 3, 4 или 5', 'error');
            return;
          }
          if (!date) { Utils.toast('Укажите дату', 'warn'); return; }

          const data = { studentId, subjectId, grade, semester, date, teacherId: user.id };

          if (isEdit) {
            Store.updateGrade(gradeId, data);
            Utils.toast('Оценка обновлена', 'success');
          } else {
            Store.addGrade(data);
            Utils.toast('Оценка успешно добавлена', 'success');
          }
          close();
          if (onSave) onSave();
        };
        wrap.querySelector('#mGrSave').addEventListener('click', save);
      }
    });
  };

  return { render };
})();