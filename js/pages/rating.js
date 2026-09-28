/* ============================================================
   СТРАНИЦА: РЕЙТИНГ — автоматический рейтинг студентов
   ============================================================ */
const RatingPage = (() => {

            const render = (container) => {
                    const user = Store.getCurrentUser();

                    // Для студента показываем только его позицию
                    const students = user.role === 'student' ?
                        Store.visibleStudents() :
                        Store.visibleStudents();

                    const rating = Store.rating(students);

                    if (!rating.length) {
                        container.innerHTML = Utils.emptyState('Рейтинг пуст', 'Пока нет студентов с оценками.', '🏆');
                        return;
                    }

                    const top3 = rating.slice(0, 3);
                    const rest = rating.slice(3);

                    // Найти позицию текущего студента, если он студент
                    let myPlace = null;
                    if (user.role === 'student' && user.studentId) {
                        const idx = rating.findIndex(s => s.id === user.studentId);
                        if (idx >= 0) myPlace = { place: idx + 1, data: rating[idx] };
                    }

                    container.innerHTML = `
      ${myPlace ? `
        <div class="card mt-16" style="border-left:4px solid var(--accent)">
          <div class="card__head">
            <div>
              <h3 class="card__title">Ваша позиция</h3>
              <p class="card__sub">Место в общем рейтинге</p>
            </div>
            <span class="badge badge--blue" style="font-size:14px;padding:6px 12px">${myPlace.place} место</span>
          </div>
          <div class="row gap-8">
            <span class="muted">Средний балл:</span>
            <b style="font-size:20px">${myPlace.data.average.toFixed(2)}</b>
            <span class="muted">·</span>
            <span class="muted">Успеваемость:</span>
            <b>${myPlace.data.performance}%</b>
          </div>
        </div>
      ` : ''}

      <h3 class="section-title">ТОП-3 студента</h3>
      <div class="podium">
        ${podiumItem(top3[1], 2)}
        ${podiumItem(top3[0], 1)}
        ${podiumItem(top3[2], 3)}
      </div>

      <h3 class="section-title">Полный рейтинг</h3>
      <div class="table-wrap">
        <div class="table-scroll">
          <table class="data">
            <thead>
              <tr>
                <th style="width:70px">Место</th>
                <th>Студент</th>
                <th>Группа</th>
                <th>Курс</th>
                <th>Средний балл</th>
                <th>Успеваемость</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              ${rating.map((s, i) => {
                const place = i + 1;
                const status = Utils.statusOf(s.average);
                const highlight = place <= 3 ? `style="background:${place === 1 ? 'rgba(251,191,36,.10)' : place === 2 ? 'rgba(148,163,184,.08)' : 'rgba(251,146,60,.08)'}"` : '';
                return `<tr ${highlight}>
                  <td><b style="font-size:15px">${place}</b></td>
                  <td class="cell-name">${Utils.escapeHtml(s.fullName)}</td>
                  <td>${Utils.escapeHtml(s.group)}</td>
                  <td class="cell-muted">${s.course}</td>
                  <td><b>${s.average.toFixed(2)}</b></td>
                  <td>${s.performance}%</td>
                  <td><span class="badge ${status.cls}">${status.label}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="row gap-8 mt-16" style="justify-content:flex-end">
        <button class="btn btn--ghost" id="ratingExport" type="button">⬇ Экспортировать рейтинг (CSV)</button>
      </div>
    `;

    Utils.$('#ratingExport').addEventListener('click', () => {
      const rows = [['Место', 'ФИО', 'Группа', 'Курс', 'Средний балл', 'Успеваемость, %', 'Статус']];
      rating.forEach((s, i) => {
        rows.push([i + 1, s.fullName, s.group, s.course, s.average.toFixed(2), s.performance, Utils.statusOf(s.average).label]);
      });
      Utils.downloadCSV('rating.csv', rows);
      Utils.toast('Рейтинг экспортирован', 'success');
    });

    // Клик по студенту — переход в профиль (только для админа/преподавателя)
    container.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row) return;
      const nameCell = row.querySelector('.cell-name');
      if (!nameCell) return;
      const name = nameCell.textContent;
      const found = rating.find(s => s.fullName === name);
      if (found && user.role !== 'student') {
        location.hash = `#/student/${found.id}`;
      }
    });
  };

  const podiumItem = (s, place) => {
    if (!s) return `<div class="podium__item"><div class="podium__medal">—</div><div class="podium__name">—</div></div>`;
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return `
      <div class="podium__item podium__item--${place}">
        <div class="podium__medal">${medals[place]}</div>
        <div class="podium__name">${Utils.escapeHtml(s.fullName)}</div>
        <div class="podium__avg">${s.average.toFixed(2)}</div>
        <div class="podium__group">${Utils.escapeHtml(s.group)}</div>
      </div>
    `;
  };

  return { render };
})();