/* ============================================================
   DASHBOARD — главная страница с ключевыми показателями
   ============================================================ */
const DashboardPage = (() => {

            const render = (container) => {
                    const user = Store.getCurrentUser();

                    // Студент видит только свои данные
                    if (user.role === 'student') return renderStudentView(container, user);

                    const students = Store.visibleStudents();
                    const groups = Store.visibleGroups();
                    const grades = Store.visibleGrades();

                    const avg = Store.overallAverage();
                    const perf = Store.overallPerformance();
                    const risk = Store.atRiskStudents();

                    const subjectStats = Store.subjectAverages().filter(s => s.count > 0);
                    const bestSubject = [...subjectStats].sort((a, b) => b.avg - a.avg)[0];
                    const worstSubject = [...subjectStats].sort((a, b) => a.avg - b.avg)[0];
                    const semesters = Store.semesterAverages();
                    const dist = Store.gradeDistribution(grades);

                    // Последние оценки
                    const recent = Utils.sortBy(grades, 'date', 'desc').slice(0, 6);

                    container.innerHTML = `
      <div class="grid grid--stats">
        ${statCard('Всего студентов', students.length, '👨‍🎓', '', 'В базе данных')}
        ${statCard('Групп', groups.length, '👥', '', 'Активных групп')}
        ${statCard('Средний балл', avg.toFixed(2), '⭐', '', 'По всем оценкам')}
        ${statCard('Успеваемость', perf + '%', '📈', perf >= 85 ? 'green' : perf >= 70 ? 'yellow' : 'red', 'Оценки 3, 4, 5')}
        ${statCard('Группа риска', risk.length, '⚠️', risk.length ? 'red' : 'green', 'Средний балл < 3.5')}
      </div>

      <div class="grid grid--2 mt-24">
        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Средний балл по предметам</h3>
              <p class="card__sub">Сравнение успеваемости по дисциплинам</p>
            </div>
          </div>
          <div class="chart-box"><canvas id="chartSubjects"></canvas></div>
        </div>

        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Динамика по семестрам</h3>
              <p class="card__sub">Изменение среднего балла</p>
            </div>
          </div>
          <div class="chart-box"><canvas id="chartSemesters"></canvas></div>
        </div>
      </div>

      <div class="grid grid--2 mt-16">
        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Распределение оценок</h3>
              <p class="card__sub">Общее количество оценок по баллам</p>
            </div>
          </div>
          <div class="chart-box chart-box--sm"><canvas id="chartDist"></canvas></div>
        </div>

        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">ТОП-5 студентов</h3>
              <p class="card__sub">Наивысший средний балл</p>
            </div>
          </div>
          <div class="chart-box chart-box--sm"><canvas id="chartTop"></canvas></div>
        </div>
      </div>

      <div class="grid grid--2 mt-16">
        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Аналитические выводы</h3>
              <p class="card__sub">Автоматически сформировано по данным</p>
            </div>
          </div>
          <div class="insights">${renderInsights(avg, perf, risk, bestSubject, worstSubject, semesters)}</div>
        </div>

        <div class="card">
          <div class="card__head">
            <div>
              <h3 class="card__title">Последние оценки</h3>
              <p class="card__sub">Свежие записи в журнале</p>
            </div>
          </div>
          ${recent.length ? `
            <div class="table-scroll" style="margin:-6px -20px -18px">
              <table class="data" style="min-width:480px">
                <thead><tr><th>Студент</th><th>Предмет</th><th>Оценка</th><th>Дата</th></tr></thead>
                <tbody>
                  ${recent.map(g => {
                    const s = Store.getStudent(g.studentId);
                    const sub = Store.getSubject(g.subjectId);
                    return `<tr>
                      <td class="cell-name">${Utils.escapeHtml(s ? s.fullName : '—')}</td>
                      <td class="cell-muted">${Utils.escapeHtml(sub ? sub.name : '—')}</td>
                      <td>${gradeBadge(g.grade)}</td>
                      <td class="cell-muted">${Utils.formatDate(g.date)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : Utils.emptyState('Оценок пока нет', 'Добавьте первую оценку на странице «Оценки».')}
        </div>
      </div>
    `;

    /* -------- Графики -------- */
    setTimeout(() => {
      Charts.bar(
        'chartSubjects',
        subjectStats.map(s => s.name),
        subjectStats.map(s => s.avg),
        Charts.palette().accent,
        true
      );

      Charts.line(
        'chartSemesters',
        semesters.map(s => `${s.semester} семестр`),
        semesters.map(s => s.avg)
      );

      Charts.doughnut(
        'chartDist',
        ['Отлично (5)', 'Хорошо (4)', 'Удовл. (3)', 'Неуд. (2)'],
        [dist[5], dist[4], dist[3], dist[2]]
      );

      const top = Store.rating(students).slice(0, 5);
      Charts.bar(
        'chartTop',
        top.map(s => s.fullName.split(' ')[0] + ' ' + (s.fullName.split(' ')[1] || '')),
        top.map(s => s.average),
        Charts.palette().green,
        true
      );
    }, 0);
  };

  /* -------- Мини-представление для студента -------- */
  const renderStudentView = (container, user) => {
    const stats = Store.studentStats(user.studentId);
    const student = Store.getStudent(user.studentId);
    if (!student) { container.innerHTML = Utils.emptyState('Профиль не найден', 'Обратитесь к администратору.'); return; }

    const semesters = {};
    stats.grades.forEach(g => {
      if (!semesters[g.semester]) semesters[g.semester] = [];
      semesters[g.semester].push(g.grade);
    });
    const semKeys = Object.keys(semesters).sort((a, b) => a - b);
    const semAvg = semKeys.map(k => Utils.round(Utils.avg(semesters[k]), 2));

    const bySubject = {};
    stats.grades.forEach(g => {
      if (!bySubject[g.subjectId]) bySubject[g.subjectId] = [];
      bySubject[g.subjectId].push(g.grade);
    });
    const subjLabels = Object.keys(bySubject).map(id => {
      const s = Store.getSubject(id); return s ? s.name : '—';
    });
    const subjAvg = Object.keys(bySubject).map(id => Utils.round(Utils.avg(bySubject[id]), 2));

    container.innerHTML = `
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
        ${statCard('Средний балл', stats.average.toFixed(2), '⭐', '', 'По всем оценкам')}
        ${statCard('Успеваемость', stats.performance + '%', '📈', stats.performance >= 85 ? 'green' : 'yellow', 'Оценки 3, 4, 5')}
        ${statCard('Всего оценок', stats.count, '📝', '', 'Записей в журнале')}
        ${statCard('Отлично', stats.byGrade[5], '🅰️', 'green', 'Оценок «5»')}
      </div>

      <div class="grid grid--2 mt-16">
        <div class="card">
          <div class="card__head"><h3 class="card__title">Динамика по семестрам</h3></div>
          <div class="chart-box"><canvas id="stChartSem"></canvas></div>
        </div>
        <div class="card">
          <div class="card__head"><h3 class="card__title">Средний балл по предметам</h3></div>
          <div class="chart-box"><canvas id="stChartSubj"></canvas></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      Charts.line('stChartSem', semKeys.map(k => `${k} семестр`), semAvg);
      Charts.bar('stChartSubj', subjLabels, subjAvg, Charts.palette().accent, true);
    }, 0);
  };

  /* -------- Вспомогательные -------- */
  const statCard = (label, value, icon, tone = '', hint = '') => `
    <div class="stat">
      <div class="stat__top">
        <span class="stat__label">${Utils.escapeHtml(label)}</span>
        <span class="stat__icon ${tone ? 'stat__icon--' + tone : ''}">${icon}</span>
      </div>
      <div class="stat__value">${value}</div>
      ${hint ? `<div class="stat__hint">${Utils.escapeHtml(hint)}</div>` : ''}
    </div>`;

  const gradeBadge = (grade) => {
    const cls = grade === 5 ? 'badge--green' : grade === 4 ? 'badge--blue' : grade === 3 ? 'badge--yellow' : 'badge--red';
    return `<span class="badge ${cls}">${grade}</span>`;
  };

  /* -------- Автоматические выводы -------- */
  const renderInsights = (avg, perf, risk, best, worst, semesters) => {
    const items = [];

    items.push({
      icon: '📊', cls: '',
      text: `Средний балл по всем студентам составляет <b>${avg.toFixed(2)}</b>, успеваемость — <b>${perf}%</b>.`
    });

    if (best) {
      items.push({
        icon: '🏆', cls: 'insight--good',
        text: `Наиболее высокий средний результат по предмету <b>«${Utils.escapeHtml(best.name)}»</b> — ${best.avg.toFixed(2)}.`
      });
    }
    if (worst && worst.id !== (best && best.id)) {
      items.push({
        icon: '⚠️', cls: 'insight--warn',
        text: `Наименьший средний балл по предмету <b>«${Utils.escapeHtml(worst.name)}»</b> — ${worst.avg.toFixed(2)}.`
      });
    }

    if (risk.length) {
      items.push({
        icon: '🔔', cls: risk.length >= 3 ? 'insight--bad' : 'insight--warn',
        text: `<b>${risk.length}</b> ${plural(risk.length, 'студент', 'студента', 'студентов')} ${plural(risk.length, 'имеет', 'имеют', 'имеют')} средний балл ниже 3.5 — требуется внимание.`
      });
    } else {
      items.push({ icon: '✅', cls: 'insight--good', text: 'Студентов со средним баллом ниже 3.5 не обнаружено.' });
    }

    if (semesters.length >= 2) {
      const first = semesters[0].avg;
      const last = semesters[semesters.length - 1].avg;
      const diff = Utils.round(last - first, 2);
      const sign = diff > 0 ? '+' : '';
      items.push({
        icon: diff >= 0 ? '📈' : '📉',
        cls: diff >= 0 ? 'insight--good' : 'insight--warn',
        text: `По сравнению с первым семестром средний балл изменился на <b>${sign}${diff.toFixed(2)}</b>.`
      });
    }

    return items.map(i => `
      <div class="insight ${i.cls}">
        <div class="insight__icon">${i.icon}</div>
        <div>${i.text}</div>
      </div>`).join('');
  };

  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  return { render };
})();