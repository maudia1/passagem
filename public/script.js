(() => {
  const totalSeats = 4;
  const key = "seatStates_v2"; // v2: armazena método de pagamento
  // state[seatId] = null | 'pix' | 'dinheiro'
  const defaultState = { 1: null, 2: null, 3: null, 4: null };

  // ===== Supabase Config =====
  // Ajuste nomes de tabela/colunas caso seu schema seja diferente
  const SUPABASE_URL = 'https://ozulqzzgmglucoaqhlen.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dWxxenpnbWdsdWNvYXFobGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjk3OTksImV4cCI6MjA3NTcwNTc5OX0.CM3s9KZ7ixCbLoVEIqoKd4A1u-kqPl3OwZ1lMxYW-RM';
  const SUPABASE_TABLE = 'passagens'; // altere se o nome da sua tabela for outro
  const SEAT_COLUMN = 'assento';      // número do assento
  const PAYMENT_COLUMN = 'pagamento';  // forma de pagamento
  const TOTAL_COLUMN = 'total';        // valor total
  const SEAT_PRICE = 11;               // preço por passagem

  let sb = null;
  try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch {}

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function computeTotal(method) {
    return method === 'pix' || method === 'dinheiro' ? SEAT_PRICE : 0;
  }

  async function syncSeatToSupabase(seatId, method) {
    if (!sb) return; // SDK não carregado
    const payload = {};
    payload[SEAT_COLUMN] = Number(seatId);
    payload[PAYMENT_COLUMN] = method === 'pix' || method === 'dinheiro' ? method : null;
    payload[TOTAL_COLUMN] = computeTotal(method);
    try {
      const { error } = await sb
        .from(SUPABASE_TABLE)
        .upsert([payload], { onConflict: SEAT_COLUMN });
      if (error) {
        console.error('Falha ao inserir no Supabase:', error);
      }
    } catch (err) {
      console.error('Erro Supabase:', err);
    }
  }

  async function syncAllToSupabase(state) {
    if (!sb) return;
    try {
      const rows = Object.keys(state).map((k) => ({
        [SEAT_COLUMN]: Number(k),
        [PAYMENT_COLUMN]: state[k] === 'pix' || state[k] === 'dinheiro' ? state[k] : null,
        [TOTAL_COLUMN]: computeTotal(state[k])
      }));
      const { error } = await sb
        .from(SUPABASE_TABLE)
        .upsert(rows, { onConflict: SEAT_COLUMN });
      if (error) console.error('Falha ao sincronizar tudo no Supabase:', error);
    } catch (err) {
      console.error('Erro Supabase (bulk):', err);
    }
  }

  const seats = Array.from(document.querySelectorAll('[data-seat]'));
  const newRunBtn = document.getElementById('newRunBtn');
  const resetMonthBtn = document.getElementById('resetMonthBtn');
  const paidCountEl = document.getElementById('paidCount');
  const remainingEl = document.getElementById('remainingCount');
  const totalAmountEl = document.getElementById('totalAmount');
  // Passes summary DOM
  const runsMonthCountEl = document.getElementById('runsMonthCount');
  const runsMonthPaidEl = document.getElementById('runsMonthPaid');
  const runsMonthTotalEl = document.getElementById('runsMonthTotal');
  // Finance summary DOM
  const finRevenueEl = document.getElementById('finRevenue');
  const finFuelEl = document.getElementById('finFuel');
  const finNetEl = document.getElementById('finNet');
  // Fuel DOM
  const fuelForm = document.getElementById('fuelForm');
  const fuelDate = document.getElementById('fuelDate');
  const fuelLiters = document.getElementById('fuelLiters');
  const fuelTotal = document.getElementById('fuelTotal');
  const fuelType = document.getElementById('fuelType');
  const fuelNotes = document.getElementById('fuelNotes');
  const fuelList = document.getElementById('fuelList');
  const fuelSumMonthTotal = document.getElementById('fuelSumMonthTotal');
  const fuelSumMonthLiters = document.getElementById('fuelSumMonthLiters');
  const fuelSumMonthAvg = document.getElementById('fuelSumMonthAvg');

  // Bottom sheet elements
  const sheet = document.getElementById('paymentSheet');
  const backdrop = document.getElementById('sheetBackdrop');
  const sheetCancel = document.getElementById('sheetCancel');
  const actionButtons = Array.from(sheet.querySelectorAll('.action'));
  let currentSeatId = null;

  function load() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ...defaultState };
      const obj = JSON.parse(raw);
      // sanitize
      const out = { ...defaultState };
      for (const k of Object.keys(out)) {
        const v = obj[k];
        out[k] = v === 'pix' || v === 'dinheiro' ? v : null;
      }
      return out;
    } catch {
      return { ...defaultState };
    }
  }

  function save(state) {
    localStorage.setItem(key, JSON.stringify(state));
  }

  function countPaid(state) {
    return Object.values(state).filter((v) => v === 'pix' || v === 'dinheiro').length;
  }

  function sumTotal(state) {
    return Object.values(state).reduce((acc, v) => acc + computeTotal(v), 0);
  }

  function labelFor(method) {
    if (method === 'pix') return 'PIX';
    if (method === 'dinheiro') return 'R$';
    return '';
  }

  // Converte Date para valor compatível com input datetime-local (horário local)
  function toLocalInput(dt) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  function render(state) {
    seats.forEach((el) => {
      const id = el.getAttribute('data-seat');
      const method = state[id];
      const isPaid = method === 'pix' || method === 'dinheiro';
      el.classList.toggle('paid', isPaid);
      el.classList.toggle('unpaid', !isPaid);
      el.setAttribute('aria-pressed', String(isPaid));
      el.title = isPaid ? `Pago (${labelFor(method)})` : 'Pendente';
      if (isPaid) {
        el.setAttribute('data-label', labelFor(method));
      } else {
        el.removeAttribute('data-label');
      }
    });
    const paid = countPaid(state);
    paidCountEl.textContent = `${paid}/${totalSeats} pagas`;
    remainingEl.textContent = `Faltam ${totalSeats - paid}`;
    const total = sumTotal(state);
    if (totalAmountEl) totalAmountEl.textContent = brl.format(total);
  }

  // ===== Corridas (passagens) =====
  const RUNS_TABLE = 'corridas';
  const RUN_PAX_TABLE = 'corrida_passagens';
  const RUNS_LOCAL_KEY = 'runs_v1';

  function determinePeriod(date = new Date()) {
    const h = date.getHours();
    return h < 12 ? 'manha' : 'noite';
  }

  function loadRunsLocal() {
    try { const raw = localStorage.getItem(RUNS_LOCAL_KEY); const arr = JSON.parse(raw||'[]'); return Array.isArray(arr)?arr:[] } catch { return [] }
  }
  function saveRunsLocal(list) { localStorage.setItem(RUNS_LOCAL_KEY, JSON.stringify(list)); }

  async function insertCorridaSupabase(run) {
    if (!sb) return { ok:false };
    try {
      const { data, error } = await sb
        .from(RUNS_TABLE)
        .insert([{ quando: run.quando, periodo: run.periodo, total_assentos: run.total_assentos, ocupados: run.ocupados, total: run.total }])
        .select('id')
        .single();
      if (error) return { ok:false, error };
      return { ok:true, id: data.id };
    } catch(e){ return { ok:false, error:e } }
  }

  async function insertCorridaPassagensSupabase(corridaId, seats) {
    if (!sb) return { ok:false };
    if (!seats.length) return { ok:true };
    try {
      const rows = seats.map((s)=>({ corrida_id: corridaId, assento: Number(s.id), pagamento: s.metodo, total: computeTotal(s.metodo) }));
      const { error } = await sb.from(RUN_PAX_TABLE).insert(rows);
      if (error) return { ok:false, error };
      return { ok:true };
    } catch(e){ return { ok:false, error:e } }
  }

  async function fetchRunsOfMonth() {
    const now = new Date();
    const { start } = monthRange(now);
    if (sb) {
      try {
        const { data, error } = await sb
          .from(RUNS_TABLE)
          .select('id, quando, ocupados, total')
          .gte('quando', start)
          .order('quando', { ascending: false });
        if (!error && Array.isArray(data)) return data;
      } catch {}
    }
    // fallback local
    const local = loadRunsLocal();
    return local.filter((r)=> new Date(r.quando) >= new Date(start));
  }

  async function renderRunsSummary() {
    const runs = await fetchRunsOfMonth();
    const corridas = runs.length;
    const pagas = runs.reduce((a,r)=> a + (Number(r.ocupados)||0), 0);
    const total = runs.reduce((a,r)=> a + (Number(r.total)||0), 0);
    if (runsMonthCountEl) runsMonthCountEl.textContent = String(corridas);
    if (runsMonthPaidEl) runsMonthPaidEl.textContent = String(pagas);
    if (runsMonthTotalEl) runsMonthTotalEl.textContent = brl.format(total);
  }

  async function renderFinanceSummary() {
    // Receita (corridas do mês)
    const runs = await fetchRunsOfMonth();
    const revenue = runs.reduce((a,r)=> a + (Number(r.total)||0), 0);
    // Gasto combustível (mês)
    let fuels = null;
    if (sb) fuels = await fetchFuelFromSupabase();
    if (!fuels) {
      const { start } = monthRange(new Date());
      fuels = loadFuelLocal().filter((it)=> new Date(it.quando) >= new Date(start));
    }
    const fuelTotal = (fuels||[]).reduce((a,it)=> a + (Number(it.total)||0), 0);
    const net = revenue - fuelTotal;
    if (finRevenueEl) finRevenueEl.textContent = brl.format(revenue);
    if (finFuelEl) finFuelEl.textContent = brl.format(fuelTotal);
    if (finNetEl) {
      finNetEl.textContent = brl.format(net);
      finNetEl.classList.remove('positive','negative');
      finNetEl.classList.add(net >= 0 ? 'positive' : 'negative');
      finNetEl.classList.add('net');
    }
  }

  // ===== Abastecimento =====
  const FUEL_KEY = 'fuelEntries_v1';
  const FUEL_TABLE = 'abastecimentos';

  function loadFuelLocal() {
    try {
      const raw = localStorage.getItem(FUEL_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveFuelLocal(list) {
    localStorage.setItem(FUEL_KEY, JSON.stringify(list));
  }

  function renderFuelList(items) {
    if (!fuelList) return;
    fuelList.innerHTML = '';
    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'Nenhum registro ainda.';
      fuelList.appendChild(li);
      return;
    }
    const dtf = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    items.forEach((it) => {
      const li = document.createElement('li');
      li.dataset.id = String(it.id || '');
      const left = document.createElement('div');
      left.className = 'fuel-item-left';
      const right = document.createElement('div');
      right.className = 'fuel-item-right';
      const when = new Date(it.quando);
      const pricePerL = it.litros > 0 ? (it.total / it.litros) : 0;
      left.innerHTML = `
        <strong>${brl.format(it.total)}</strong>
        <span class="muted">${dtf.format(when)}</span>
      `;
      right.innerHTML = `
        <span class="tag">${it.litros.toFixed(2)} L</span>
        <span class="tag">${brl.format(pricePerL)}/L</span>
        ${it.tipo ? `<span class="tag">${it.tipo === 'etanol' ? 'Etanol' : 'Gasolina'}</span>` : ''}
        <button class="btn-text" data-action="edit">Editar</button>
        <button class="btn-text" data-action="delete">Excluir</button>
      `;
      li.appendChild(left);
      li.appendChild(right);
      fuelList.appendChild(li);
    });
  }

  function monthRange(date = new Date()) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
    const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
    return { start: start.toISOString(), end: nextMonth.toISOString() };
  }

  function renderFuelSummary(items) {
    if (!items || items.length === 0) {
      if (fuelSumMonthTotal) fuelSumMonthTotal.textContent = brl.format(0);
      if (fuelSumMonthLiters) fuelSumMonthLiters.textContent = '0,00 L';
      if (fuelSumMonthAvg) fuelSumMonthAvg.textContent = brl.format(0) + '/L';
      return;
    }
    const now = new Date();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    const inMonth = items.filter((it) => {
      const d = new Date(it.quando);
      return d.getUTCFullYear() === year && d.getUTCMonth() === month;
    });
    const total = inMonth.reduce((a, it) => a + (Number(it.total) || 0), 0);
    const litros = inMonth.reduce((a, it) => a + (Number(it.litros) || 0), 0);
    const avg = litros > 0 ? total / litros : 0;
    if (fuelSumMonthTotal) fuelSumMonthTotal.textContent = brl.format(total);
    if (fuelSumMonthLiters) fuelSumMonthLiters.textContent = `${litros.toFixed(2)} L`;
    if (fuelSumMonthAvg) fuelSumMonthAvg.textContent = `${brl.format(avg)}/L`;
  }

  async function fetchFuelFromSupabase() {
    if (!sb) return null;
    try {
      const { start } = monthRange();
      const { data, error } = await sb
        .from(FUEL_TABLE)
        .select('id, quando, litros, total, tipo, obs')
        .gte('quando', start)
        .order('quando', { ascending: false });
      if (error) { console.error('Erro ao listar abastecimentos:', error); return null; }
      return data || [];
    } catch (e) { console.error('Erro fetch abastecimentos:', e); return null; }
  }

  async function insertFuelSupabase(entry) {
    if (!sb) return { ok: false };
    try {
      const payload = {
        quando: entry.quando,
        litros: entry.litros,
        total: entry.total,
        tipo: entry.tipo || null,
        obs: entry.obs || null,
        preco_litro: entry.litros > 0 ? entry.total / entry.litros : null,
      };
      const { data, error } = await sb.from(FUEL_TABLE).insert([payload]).select('id').single();
      if (error) { console.error('Erro ao inserir abastecimento:', error); return { ok: false, error }; }
      return { ok: true, id: data?.id };
    } catch (e) { console.error('Erro inserir abastecimento:', e); return { ok: false, error: e }; }
  }

  async function updateFuelSupabase(id, updates) {
    if (!sb) return { ok: false };
    try {
      const { error } = await sb.from(FUEL_TABLE).update(updates).eq('id', id);
      if (error) { console.error('Erro ao atualizar abastecimento:', error); return { ok: false, error }; }
      return { ok: true };
    } catch (e) { console.error('Erro update abastecimento:', e); return { ok: false, error: e }; }
  }

  async function deleteFuelSupabase(id) {
    if (!sb) return { ok: false };
    try {
      const { error } = await sb.from(FUEL_TABLE).delete().eq('id', id);
      if (error) { console.error('Erro ao excluir abastecimento:', error); return { ok: false, error }; }
      return { ok: true };
    } catch (e) { console.error('Erro delete abastecimento:', e); return { ok: false, error: e }; }
  }

  function openSheet(forSeatId) {
    currentSeatId = forSeatId;
    sheet.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    // trigger transitions
    requestAnimationFrame(() => {
      sheet.classList.add('open');
      backdrop.classList.add('open');
      // Evita scroll do conteúdo ao abrir o sheet (mobile)
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    });
  }

  function closeSheet() {
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    // espera a transição e então esconde
    setTimeout(() => {
      sheet.classList.add('hidden');
      backdrop.classList.add('hidden');
      currentSeatId = null;
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }, 200);
  }

  let state = load();
  render(state);

  // Hidrata do Supabase (se disponível) sem bloquear a UI
  async function hydrateFromSupabase() {
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from(SUPABASE_TABLE)
        .select(`${SEAT_COLUMN}, ${PAYMENT_COLUMN}`);
      if (error) {
        console.error('Falha ao buscar estado no Supabase:', error);
        return;
      }
      if (Array.isArray(data)) {
        const next = { ...state };
        for (const row of data) {
          const id = String(row[SEAT_COLUMN]);
          const method = row[PAYMENT_COLUMN];
          next[id] = method === 'pix' || method === 'dinheiro' ? method : null;
        }
        state = next;
        save(state);
        render(state);
      }
    } catch (err) {
      console.error('Erro ao hidratar do Supabase:', err);
    }
  }
  hydrateFromSupabase();
  // Resumo do mês (passagens)
  renderRunsSummary();
  // Resumo financeiro do mês
  renderFinanceSummary();

  seats.forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-seat');
      openSheet(id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });

  actionButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!currentSeatId) return;
      const method = btn.getAttribute('data-method');
      if (method === 'pix') state[currentSeatId] = 'pix';
      else if (method === 'dinheiro') state[currentSeatId] = 'dinheiro';
      else state[currentSeatId] = null; // pendente
      save(state);
      render(state);
      // Envia registro para Supabase
      await syncSeatToSupabase(currentSeatId, state[currentSeatId]);
      closeSheet();
    });
  });

  sheetCancel.addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
  });

  newRunBtn.addEventListener('click', async () => {
    const quando = new Date();
    const periodo = determinePeriod(quando);
    const seatsPaid = Object.keys(state)
      .map((id)=>({ id, metodo: state[id] }))
      .filter((s)=> s.metodo === 'pix' || s.metodo === 'dinheiro');
    const ocupados = seatsPaid.length;
    const total = ocupados * SEAT_PRICE;

    if (ocupados === 0) {
      const proceed = confirm('Nenhum assento pago. Iniciar nova corrida mesmo assim?');
      if (!proceed) return;
    }

    // Tenta registrar corrida e passagens no Supabase
    let ok = false;
    let corridaId = null;
    if (sb) {
      const res = await insertCorridaSupabase({ quando: quando.toISOString(), periodo, total_assentos: totalSeats, ocupados, total });
      ok = !!res.ok; corridaId = res.id;
      if (ok && ocupados > 0) {
        const res2 = await insertCorridaPassagensSupabase(corridaId, seatsPaid);
        ok = ok && !!res2.ok;
      }
    }
    if (!ok) {
      // fallback local
      const list = loadRunsLocal();
      list.unshift({ id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`, quando: quando.toISOString(), periodo, total_assentos: totalSeats, ocupados, total });
      saveRunsLocal(list);
    }

    // Limpa estado para a próxima corrida e sincroniza snapshot de passagens
    state = { ...defaultState };
    save(state);
    render(state);
    await syncAllToSupabase(state);
      await renderRunsSummary();
      await renderFinanceSummary();
  });

  // Formulário de abastecimento
  if (fuelForm) {
    if (fuelDate && !fuelDate.value) {
      fuelDate.value = toLocalInput(new Date());
    }
    fuelForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const quando = fuelDate && fuelDate.value ? new Date(fuelDate.value).toISOString() : new Date().toISOString();
      const litros = parseFloat(fuelLiters.value);
      const total = parseFloat(fuelTotal.value);
      const tipo = (fuelType && fuelType.value) ? fuelType.value : null;
      const obs = fuelNotes.value?.trim();

      if (!(litros > 0) || !(total > 0)) {
        alert('Informe litros e valor total maiores que zero.');
        return;
      }

      const entry = { quando, litros, total, tipo, obs };

      let ok = false;
      if (sb) {
        const res = await insertFuelSupabase(entry);
        ok = !!res.ok;
      }
      if (!ok) {
        // salva localmente
        const list = loadFuelLocal();
        const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        list.unshift({ id, ...entry });
        saveFuelLocal(list);
      }

      // Atualiza a lista (prefere Supabase se disponível)
      let items = null;
      if (sb) items = await fetchFuelFromSupabase();
      if (!items) items = loadFuelLocal();
      renderFuelList(items);
      renderFuelSummary(items);
      await renderFinanceSummary();

      // Limpa o formulário
      fuelForm.reset();
      if (fuelDate) fuelDate.value = toLocalInput(new Date());
      });

    // Render inicial da lista
    (async () => {
      let items = null;
      if (sb) items = await fetchFuelFromSupabase();
      if (!items) items = loadFuelLocal();
      renderFuelList(items);
      renderFuelSummary(items);
    })();

    // Delegação de eventos para editar/excluir
    fuelList.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const li = btn.closest('li');
      if (!li || !li.dataset.id) return;
      const id = li.dataset.id;
      const action = btn.getAttribute('data-action');
      if (action === 'delete') {
        if (!confirm('Excluir este abastecimento?')) return;
        let ok = false;
        if (sb) { const res = await deleteFuelSupabase(id); ok = !!res.ok; }
        if (!ok) {
          const list = loadFuelLocal().filter((it) => String(it.id) !== String(id));
          saveFuelLocal(list);
        }
        let items = null; if (sb) items = await fetchFuelFromSupabase(); if (!items) items = loadFuelLocal();
        renderFuelList(items); renderFuelSummary(items); await renderFinanceSummary();
      }
      if (action === 'edit') {
        // Renderiza modo edição inline
        const nowItems = fuelList.querySelectorAll('li');
        // encontra item atual (supabase/local)
        let current = null;
        let source = [];
        if (sb) { const fetched = await fetchFuelFromSupabase(); if (fetched) source = fetched; }
        if (!source.length) source = loadFuelLocal();
        current = source.find((x) => String(x.id) === String(id));
        if (!current) return;
        const d = new Date(current.quando);
        li.innerHTML = `
          <div class="fuel-edit">
            <input type="datetime-local" class="e-when" value="${toLocalInput(d)}" />
            <input type="number" step="0.01" min="0" class="e-litros" value="${Number(current.litros)}" />
            <input type="number" step="0.01" min="0" class="e-total" value="${Number(current.total)}" />
            <select class="e-tipo">
              <option value="gasolina" ${current.tipo === 'gasolina' ? 'selected' : ''}>Gasolina</option>
              <option value="etanol" ${current.tipo === 'etanol' ? 'selected' : ''}>Etanol</option>
            </select>
            <div class="row2">
              <input type="text" class="e-obs" placeholder="Observação" value="${current.obs || ''}" />
            </div>
            <div class="actions">
              <button class="btn-text e-cancel">Cancelar</button>
              <button class="btn-text e-save">Salvar</button>
            </div>
          </div>
        `;
        li.querySelector('.e-cancel').addEventListener('click', async () => {
          let items = null; if (sb) items = await fetchFuelFromSupabase(); if (!items) items = loadFuelLocal();
          renderFuelList(items); renderFuelSummary(items); await renderFinanceSummary();
        });
        li.querySelector('.e-save').addEventListener('click', async () => {
          const q = li.querySelector('.e-when').value;
          const litros = parseFloat(li.querySelector('.e-litros').value);
          const total = parseFloat(li.querySelector('.e-total').value);
          const tipo = li.querySelector('.e-tipo').value;
          const obs = li.querySelector('.e-obs').value.trim();
          if (!(litros > 0) || !(total > 0)) { alert('Litros e total devem ser > 0'); return; }
          let ok = false;
          if (sb) {
            const res = await updateFuelSupabase(id, { quando: new Date(q).toISOString(), litros, total, tipo: tipo||null, obs: obs||null, preco_litro: litros>0? total/litros : null });
            ok = !!res.ok;
          }
          if (!ok) {
            const list = loadFuelLocal().map((it) => String(it.id) === String(id) ? { ...it, quando: new Date(q).toISOString(), litros, total, tipo, obs } : it);
            saveFuelLocal(list);
          }
          let items = null; if (sb) items = await fetchFuelFromSupabase(); if (!items) items = loadFuelLocal();
          renderFuelList(items); renderFuelSummary(items);
        });
      }
    });
    }

    // ===== Zerar mês atual (corridas + abastecimentos + assentos) =====
    async function resetCurrentMonth() {
      const { start } = monthRange(new Date());
      // Supabase: deleta corridas do mês (cascata apaga corrida_passagens) e abastecimentos do mês
      if (sb) {
        try { await sb.from('corridas').delete().gte('quando', start); } catch{}
        try { await sb.from('abastecimentos').delete().gte('quando', start); } catch{}
      }
      // Local: remove itens do mês
      try {
        const runs = loadRunsLocal().filter((r)=> new Date(r.quando) < new Date(start));
        saveRunsLocal(runs);
        const fuels = loadFuelLocal().filter((f)=> new Date(f.quando) < new Date(start));
        saveFuelLocal(fuels);
      } catch {}
      // Assentos: limpa
      state = { ...defaultState };
      save(state);
      render(state);
      await syncAllToSupabase(state);
      // Atualiza listas e resumos
      let items = null; if (sb) items = await fetchFuelFromSupabase(); if (!items) items = loadFuelLocal();
      renderFuelList(items); renderFuelSummary(items);
      await renderRunsSummary();
      await renderFinanceSummary();
    }

    if (resetMonthBtn) {
      resetMonthBtn.addEventListener('click', async () => {
        const ok = confirm('Isso vai apagar as corridas e abastecimentos do mês atual. Confirmar?');
        if (!ok) return;
        await resetCurrentMonth();
        alert('Dados do mês atual zerados. Pronto para recomeçar.');
      });
    }
  })();

