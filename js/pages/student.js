/* ============================================================
   СТРАНИЦА: ПРОФИЛЬ СТУДЕНТА
   ============================================================ */
const StudentPage = (() => {

            const render = (container, studentId) => {
                    const user = Store.getCurrentUser();
                    const student = Store.getStudent(studentId);

                    if (!student) {
                        container.innerHTML = Utils.emptyState('Студент не найден', 'Возможно, запись была удалена.', '👤');
                        return;
                    }

                    if (user.role === 'student' && user.studentId !== studentId) {
                        container.innerHTML = Utils.emptyState('Доступ запрещён', 'Вы можете просматривать только свой профиль.', '🔒');
                        return;
                    }

                    const stats = Store.studentStats(studentId);

                    const semMap = {};
                    stats.grades.forEach(g => {
                        if (!semMap[g.semester]) semMap[g.semester] = [];
                        semMap[g.semester].push(g.grade);
                    });
                    const semKeys = Object.keys(semMap).sort((a, b) => a - b);
                    const semAvg = semKeys.map(k => Utils.round(Utils.avg(semMap[k]), 2));

                    const subjMap = {};
                    stats.grades.forEach(g => {
                        if (!subjMap[g.subjectId]) subjMap[g.subjectId] = [];
                        subjMap[g.subjectId].push(g.grade);
                    });
                    const subjKeys = Object.keys(subjMap);
                    const subjLabels = subjKeys.map(id => { const s = Store.getSubject(id); return s ? s.name : '—'; });
                    const subjAvg = subjKeys.map(id => Utils.round(Utils.avg(subjMap[id]), 2));

                    const sortedGrades = Utils.sortBy(stats.grades, 'date', 'desc');

                    container.innerHTML = `
      <div class="row gap-8" style="margin-bottom:16px">
        <button class="btn btn--ghost btn--sm" onclick="history.back()" type="button">← Назад</button>
      </div>

      <div class="detail-head">
        <div class="avatar">${Utils.initials(student.fullName)}</div>
        <div class="detail-head__info">
          <h3 class="detail-head__name">${Utils.escapeHtml(student.fullName)}</h3>
          <div class="detail-head__meta">
            <span class="badge badge--gray">${Utils.escapeHtml(student.group)}</span>
            <span>${student.course} курс</span>
            <span>·</span>
            <span>${Utils.escapeHtml(student.specialty)}</span>
          </div>
        </div>
        <span class="badge ${stats.status.cls}">${stats.status.label}</span>
      </div>

      <div class="grid grid--stats mt-16">
        ${statCard('Средний балл', stats.average.toFixed(2), '⭐', '')}
        ${statCard('Успеваемость', stats.performance + '%', '📈', stats.performance >= 85 ? 'green' : stats.performance >= 70 ? 'yellow' : 'red')}
        ${statCard('Всего оценок', stats.count, '📝', '')}
        ${statCard('Пятёрок', stats.byGrade[5], '🅰️', 'green')}
        ${statCard('Четвёрок', stats.byGrade[4], '🅱️', '')}
        ${statCard('Троек', stats.byGrade[3], '🅲', 'yellow')}
        ${statCard('Двоек', stats.byGrade[2], '🅳', stats.byGrade[2] ? 'red' : '')}
      </div>

      <div class="grid grid--2 mt-24">
        <div class="card">
          <div class="card__head"><h3 class="card__title">Динамика по семестрам</h3></div>
          <div class="chart-box"><canvas id="stSemChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card__head"><h3 class="card__title">Средний балл по предметам</h3></div>
          <div class="chart-box"><canvas id="stSubjChart"></canvas></div>
        </div>
      </div>

      <h3 class="section-title">Все оценки</h3>
      <div class="table-wrap">
        ${sortedGrades.length ? `
          <div class="table-scroll">
            <table class="data">
              <thead>
                <tr>
                  <th>Предмет</th>
                  <th>Оценка</th>
                  <th>Семестр</th>
                  <th>Дата</th>
                  <th>Преподаватель</th>
                </tr>
              </thead>
              <tbody>
                ${sortedGrades.map(g => {
                  const subj = Store.getSubject(g.subjectId);
                  const teacher = Store.getUserById(g.teacherId);
                  return `<tr>
                    <td class="cell-name">${Utils.escapeHtml(subj ? subj.name : '—')}</td>
                    <td>${gradeBadge(g.grade)}</td>
                    <td class="cell-muted">${g.semester}</td>
                    <td class="cell-muted">${Utils.formatDate(g.date)}</td>
                    <td class="cell-muted">${Utils.escapeHtml(teacher ? teacher.name : (subj ? subj.teacher : '—'))}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : Utils.emptyState('Оценок пока нет', 'У этого студента ещё не выставлены оценки.')}
      </div>
    `;

    setTimeout(() => {
      if (semKeys.length) Charts.line('stSemChart', semKeys.map(k => `${k} семестр`), semAvg);
      else Charts.line('stSemChart', ['Нет данных'], [0]);
      if (subjKeys.length) Charts.bar('stSubjChart', subjLabels, subjAvg, Charts.palette().accent, true);
    }, 0);
  };

  const statCard = (label, value, icon, tone) => `
    <div class="stat">
      <div class="stat__top">
        <span class="stat__label">${Utils.escapeHtml(label)}</span>
        <span class="stat__icon ${tone ? 'stat__icon--' + tone : ''}">${icon}</span>
      </div>
      <div class="stat__value">${value}</div>
    </div>`;

  const gradeBadge = (grade) => {
    const cls = grade === 5 ? 'badge--green' : grade === 4 ? 'badge--blue' : grade === 3 ? 'badge--yellow' : 'badge--red';
    return `<span class="badge ${cls}">${grade}</span>`;
  };

  return { render };
})();