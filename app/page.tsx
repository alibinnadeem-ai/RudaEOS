'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── TYPES ─── */
interface Category { id: string; label: string; color: string; light: string; }
interface ClItem { id: number; text: string; checked: boolean; }
interface Task {
  id: number; cat_id: string; sub: string; name: string;
  owner: string; poc: string; deadline: string; status: string;
  checklist: ClItem[];
}
interface Toast { id: number; msg: string; type: string; out: boolean; }

const SL: Record<string, { l: string; c: string }> = {
  NS: { l: 'Not started', c: 's-NS' },
  IP: { l: 'In progress', c: 's-IP' },
  CP: { l: 'Completed', c: 's-CP' },
  BL: { l: 'Blocked', c: 's-BL' },
};

function getProgress(t: Task) {
  if (t.status === 'CP') return 100;
  const cl = t.checklist || [];
  if (!cl.length) return 0;
  return Math.round(cl.filter(c => c.checked).length / cl.length * 100);
}

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [clOpen, setClOpen] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'dashboard' | 'preview'>('dashboard');
  const [clock, setClock] = useState('--:--:--');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCat, setModalCat] = useState<string | null>(null);
  const [stMenuTarget, setStMenuTarget] = useState<number | null>(null);
  const [stMenuPos, setStMenuPos] = useState<{ top: number; left: number } | null>(null);
  const toastId = useRef(0);

  const fName = useRef<HTMLInputElement>(null);
  const fSub = useRef<HTMLInputElement>(null);
  const fCat = useRef<HTMLSelectElement>(null);
  const fStatus = useRef<HTMLSelectElement>(null);
  const fOwner = useRef<HTMLInputElement>(null);
  const fPoc = useRef<HTMLInputElement>(null);
  const fDeadline = useRef<HTMLInputElement>(null);

  /* ─── FETCH ─── */
  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setCategories(data.categories || []);
    setTasks(data.tasks || []);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── CLOCK ─── */
  useEffect(() => {
    const t = setInterval(() => { setClock(new Date().toLocaleTimeString('en-GB')); }, 1000);
    return () => clearInterval(t);
  }, []);

  /* ─── TOAST ─── */
  const toast = (msg: string, type = 'accent') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, msg, type, out: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, out: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 200);
    }, 2200);
  };

  /* ─── KPIs ─── */
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'CP').length;
  const bl = tasks.filter(t => t.status === 'BL').length;
  const ip = tasks.filter(t => t.status === 'IP').length;
  const prog = tasks.length ? Math.round(tasks.reduce((s, t) => s + getProgress(t), 0) / tasks.length) : 0;

  /* ─── FILTER ─── */
  const filteredTasks = tasks.filter(t => {
    if (activeCat !== 'all' && t.cat_id !== activeCat) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.sub.toLowerCase().includes(q) && !(t.owner || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ─── API CALLS ─── */
  const updateTask = async (id: number, fields: Record<string, string>) => {
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchAll();
    toast('Task deleted', 'red');
  };

  const toggleCheck = async (taskId: number, itemId: number, currentChecked: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t, checklist: t.checklist.map(c => c.id === itemId ? { ...c, checked: !currentChecked } : c)
    } : t));
    await fetch(`/api/checklist/${taskId}/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked: !currentChecked }) });
  };

  const addClItem = async (taskId: number, text: string) => {
    const res = await fetch(`/api/checklist/${taskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    const newItem = await res.json();
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: [...t.checklist, newItem] } : t));
    toast('Step added', 'accent');
  };

  const deleteClItem = async (taskId: number, itemId: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.filter(c => c.id !== itemId) } : t));
    await fetch(`/api/checklist/${taskId}/${itemId}`, { method: 'DELETE' });
    toast('Step removed', 'red');
  };

  const applyStatus = async (status: string) => {
    if (!stMenuTarget) return;
    setTasks(prev => prev.map(t => t.id === stMenuTarget ? {
      ...t, status, checklist: status === 'CP' ? t.checklist.map(c => ({ ...c, checked: true })) : t.checklist
    } : t));
    await updateTask(stMenuTarget, { status });
    setStMenuTarget(null);
    setStMenuPos(null);
    toast('Status updated', 'accent');
  };

  /* ─── MODAL ─── */
  const openModal = (catId: string | null) => {
    setModalCat(catId);
    setModalOpen(true);
    setTimeout(() => fName.current?.focus(), 80);
  };

  const closeModal = () => {
    setModalOpen(false);
    if (fName.current) fName.current.value = '';
    if (fSub.current) fSub.current.value = '';
    if (fOwner.current) fOwner.current.value = '';
    if (fPoc.current) fPoc.current.value = '';
    if (fDeadline.current) fDeadline.current.value = '';
    if (fStatus.current) fStatus.current.value = 'NS';
  };

  const submitModal = async () => {
    const name = fName.current?.value.trim();
    if (!name) { if (fName.current) fName.current.style.borderColor = 'var(--red)'; return; }
    if (fName.current) fName.current.style.borderColor = '';
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat_id: fCat.current?.value || 'adm',
        sub: fSub.current?.value.trim() || 'New task',
        name,
        owner: fOwner.current?.value.trim() || '',
        poc: fPoc.current?.value.trim() || '',
        deadline: fDeadline.current?.value || '',
        status: fStatus.current?.value || 'NS',
      }),
    });
    const newTask = await res.json();
    setTasks(prev => [...prev, { ...newTask, checklist: newTask.checklist || [] }]);
    closeModal();
    toast('Task created', 'accent');
  };

  /* ─── STATUS MENU ─── */
  const openStMenu = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setStMenuTarget(taskId);
    setStMenuPos({ top: rect.bottom + 4, left: rect.left });
  };

  useEffect(() => {
    const close = () => { setStMenuTarget(null); setStMenuPos(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const toggleCL = (taskId: number) => {
    setClOpen(prev => {
      const n = new Set(prev);
      n.has(taskId) ? n.delete(taskId) : n.add(taskId);
      return n;
    });
  };

  const catsToShow = activeCat === 'all' ? categories : categories.filter(c => c.id === activeCat);

  return (
    <>
      <div className="shell">
        {/* HEADER */}
        <header className="hdr">
          <div className="hdr-logo">ARD</div>
          <div>
            <div className="hdr-title">RUDA Execution OS</div>
            <div className="hdr-sub">2-Week War Room Sprint &middot; ARD Pvt Ltd</div>
          </div>
          <div className="hdr-sep" />
          <span className="hdr-pill p-live">LIVE</span>
          <span className="hdr-pill p-days">14-DAY SPRINT</span>
          <span className="hdr-pill p-ruda">RUDA COORDINATION</span>
          <span className="hdr-clock">{clock}</span>
          {view === 'dashboard' && (
            <>
              <button className="hdr-preview-btn" onClick={() => setView('preview')}>Preview</button>
              <button className="hdr-add-btn" onClick={() => openModal(null)}>+ New Task</button>
            </>
          )}
          {view === 'preview' && (
            <button className="hdr-back-btn" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
          )}
        </header>

        {/* DASHBOARD VIEW */}
        <div className={`view ${view === 'dashboard' ? 'active' : ''}`}>
          <div className="kpi-strip">
            <div className="kpi-cell kpi-accent"><div className="kpi-label">Total Tasks</div><div className="kpi-val">{total}</div><div className="kpi-sub">7 domains</div></div>
            <div className="kpi-cell kpi-amber"><div className="kpi-label">Progress</div><div className="kpi-val">{prog}%</div><div className="kpi-sub">Sprint completion</div></div>
            <div className="kpi-cell kpi-blue"><div className="kpi-label">In Progress</div><div className="kpi-val">{ip}</div><div className="kpi-sub">Active now</div></div>
            <div className="kpi-cell kpi-purple"><div className="kpi-label">Completed</div><div className="kpi-val">{done}</div><div className="kpi-sub">Closed out</div></div>
            <div className="kpi-cell kpi-red"><div className="kpi-label">Blocked</div><div className="kpi-val">{bl}</div><div className="kpi-sub">Needs attention</div></div>
          </div>

          <div className="body">
            {/* SIDEBAR */}
            <nav className="sidebar">
              <div className="sidebar-section-label">Overview</div>
              <div className={`si ${activeCat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>
                <span className="si-dot" style={{ background: 'var(--accent)' }} />
                <span className="si-name">All tasks</span>
                <span className="si-count">{tasks.length}</span>
              </div>
              <div className="sidebar-section-label">Categories</div>
              {categories.map(c => {
                const cnt = tasks.filter(t => t.cat_id === c.id).length;
                return (
                  <div key={c.id} className={`si ${activeCat === c.id ? 'active' : ''}`} onClick={() => setActiveCat(c.id)}>
                    <span className="si-dot" style={{ background: c.color }} />
                    <span className="si-name">{c.label}</span>
                    <span className="si-count">{cnt}</span>
                  </div>
                );
              })}
            </nav>

            {/* MAIN */}
            <div className="main">
              <div className="toolbar">
                <div className="tb-search">
                  <span className="tb-icon">&#x2315;</span>
                  <input type="text" placeholder="Search tasks, owners, sub-categories..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="tb-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="NS">Not started</option>
                  <option value="IP">In progress</option>
                  <option value="CP">Completed</option>
                  <option value="BL">Blocked</option>
                </select>
                <span className="tb-count">{filteredTasks.length} tasks shown</span>
              </div>

              <div className="sections-wrap">
                {catsToShow.every(cat => !filteredTasks.some(t => t.cat_id === cat.id)) ? (
                  <div className="empty-state">// No tasks match your filters.</div>
                ) : (
                  catsToShow.map((cat, ci) => {
                    const catTasks = filteredTasks.filter(t => t.cat_id === cat.id);
                    if (!catTasks.length) return null;
                    const catProg = Math.round(catTasks.reduce((s, t) => s + getProgress(t), 0) / catTasks.length);
                    const isCol = collapsed.has(cat.id);

                    return (
                      <div className="cat-block anim-slide-up" key={cat.id} style={{ animationDelay: `${ci * 0.04}s` }}>
                        <div className="cat-hdr" onClick={() => {
                          setCollapsed(prev => { const n = new Set(prev); isCol ? n.delete(cat.id) : n.add(cat.id); return n; });
                        }}>
                          <div className="cat-stripe" style={{ background: cat.color }} />
                          <div className="cat-title" style={{ color: cat.color }}>{cat.label}</div>
                          <div className="cat-meta">{catTasks.length} tasks</div>
                          <div className="cat-bar-track"><div className="cat-bar-fill" style={{ width: `${catProg}%`, background: cat.color }} /></div>
                          <div className="cat-pct" style={{ color: cat.color }}>{catProg}%</div>
                          <button className="cat-add-btn" onClick={e => { e.stopPropagation(); openModal(cat.id); }}>+ Add</button>
                          <div className={`cat-chev ${isCol ? '' : 'open'}`}>&#9654;</div>
                        </div>

                        {!isCol && (
                          <div style={{ overflowX: 'auto', animation: 'slideDown .2s cubic-bezier(.16,1,.3,1) both' }}>
                            <table className="task-tbl">
                              <thead><tr>
                                <th style={{ paddingLeft: 20, width: '34%' }}>Task</th>
                                <th style={{ width: '10%' }}>Owner</th>
                                <th style={{ width: '9%' }}>POC</th>
                                <th style={{ width: '11%' }}>Deadline</th>
                                <th style={{ width: '12%' }}>Status</th>
                                <th style={{ width: '14%' }}>Progress</th>
                                <th style={{ width: 40 }}></th>
                              </tr></thead>
                              <tbody>
                                {catTasks.map(task => {
                                  const p = getProgress(task);
                                  const isOpen = clOpen.has(task.id);
                                  return (
                                    <tr key={task.id}>
                                      <td style={{ paddingLeft: 20 }}>
                                        <div className="td-p">
                                          <input
                                            className="task-name-text"
                                            defaultValue={task.name}
                                            onBlur={e => {
                                              const v = e.target.value.trim();
                                              if (v && v !== task.name) { updateTask(task.id, { name: v }); toast('Task updated', 'accent'); }
                                              else e.target.value = task.name;
                                            }}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                            onClick={e => e.stopPropagation()}
                                          />
                                          <div className="task-sub-text">{task.sub}</div>
                                          <div className="cl-toggle" onClick={e => { e.stopPropagation(); toggleCL(task.id); }}>
                                            {isOpen ? '▾' : '▸'} {task.checklist.length} checklist item{task.checklist.length !== 1 ? 's' : ''}
                                          </div>
                                        </div>
                                        <div className={`cl-panel ${isOpen ? 'open' : ''}`}>
                                          {task.checklist.map(item => (
                                            <div className="cl-item" key={item.id} onClick={() => toggleCheck(task.id, item.id, item.checked)}>
                                              <div className={`cl-check ${item.checked ? 'checked' : ''}`}>
                                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                              </div>
                                              <span className={`cl-text ${item.checked ? 'done' : ''}`}>{item.text}</span>
                                              <button className="cl-del-item" onClick={e => { e.stopPropagation(); deleteClItem(task.id, item.id); }}>&#10005;</button>
                                            </div>
                                          ))}
                                          <div className="cl-add-wrap">
                                            <ChecklistAddInput taskId={task.id} onAdd={addClItem} />
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <input className="owner-inp" defaultValue={task.owner} placeholder="Assign..."
                                          onClick={e => e.stopPropagation()}
                                          onBlur={e => { if (e.target.value.trim() !== task.owner) { updateTask(task.id, { owner: e.target.value.trim() }); } }} />
                                      </td>
                                      <td>
                                        <div className="td-p" style={{ color: 'var(--muted)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{task.poc}</div>
                                      </td>
                                      <td>
                                        <input type="date" className="dl-inp" defaultValue={task.deadline}
                                          onClick={e => e.stopPropagation()}
                                          onChange={e => { updateTask(task.id, { deadline: e.target.value }); toast('Deadline updated', 'gold'); }} />
                                      </td>
                                      <td>
                                        <div className="td-p">
                                          <div className={`status-badge ${SL[task.status]?.c || ''}`} onClick={e => openStMenu(task.id, e)}>
                                            <span className="st-dot" />{SL[task.status]?.l || task.status}
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="td-p">
                                          <div className="prog-wrap">
                                            <div className="prog-track"><div className="prog-fill" style={{ width: `${p}%`, background: cat.color }} /></div>
                                            <span className="prog-pct">{p}%</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <button className="del-row-btn" onClick={e => { e.stopPropagation(); deleteTask(task.id); }} title="Delete task">&#128465;</button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PRINT PREVIEW VIEW */}
        <div className={`view ${view === 'preview' ? 'active' : ''}`}>
          <PrintPreview categories={categories} tasks={tasks} kpi={{ total, done, bl, ip, prog }} />
        </div>
      </div>

      {/* MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal anim-pop" onClick={e => e.stopPropagation()}>
          <div className="modal-title">New Task</div>
          <div className="modal-sub">Add a new execution item to the sprint</div>
          <div className="form-row">
            <label className="form-label">Task name</label>
            <input className="form-input" ref={fName} placeholder="Enter task name..." />
          </div>
          <div className="form-row">
            <label className="form-label">Sub-category</label>
            <input className="form-input" ref={fSub} placeholder="e.g. 1.1 Land Registry" />
          </div>
          <div className="form-row-2">
            <div>
              <label className="form-label">Category</label>
              <select className="form-select" ref={fCat} defaultValue={modalCat || 'land'}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" ref={fStatus} defaultValue="NS">
                <option value="NS">Not started</option>
                <option value="IP">In progress</option>
                <option value="CP">Completed</option>
                <option value="BL">Blocked</option>
              </select>
            </div>
          </div>
          <div className="form-row-2">
            <div><label className="form-label">Owner</label><input className="form-input" ref={fOwner} placeholder="Assign to..." /></div>
            <div><label className="form-label">POC</label><input className="form-input" ref={fPoc} placeholder="Point of contact..." /></div>
          </div>
          <div className="form-row">
            <label className="form-label">Deadline</label>
            <input className="form-input" type="date" ref={fDeadline} />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={closeModal}>Cancel</button>
            <button className="btn-submit" onClick={submitModal}>Create Task</button>
          </div>
        </div>
      </div>

      {/* STATUS MENU */}
      <div className="status-menu" style={stMenuTarget && stMenuPos ? { top: stMenuPos.top, left: stMenuPos.left, display: 'flex' } : { display: 'none' }}>
        <div className="sm-opt" onClick={() => applyStatus('NS')}><span className="st-dot" style={{ background: 'var(--slate)' }} />Not started</div>
        <div className="sm-opt" onClick={() => applyStatus('IP')}><span className="st-dot" style={{ background: '#F59E0B' }} />In progress</div>
        <div className="sm-opt" onClick={() => applyStatus('CP')}><span className="st-dot" style={{ background: 'var(--accent)' }} />Completed</div>
        <div className="sm-opt" onClick={() => applyStatus('BL')}><span className="st-dot" style={{ background: 'var(--red)' }} />Blocked</div>
      </div>

      {/* TOASTS */}
      <div className="toast-wrap">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type} ${t.out ? 'out' : ''}`}>{t.msg}</div>)}
      </div>
    </>
  );
}

/* ─── HELPER COMPONENTS ─── */

function ChecklistAddInput({ taskId, onAdd }: { taskId: number; onAdd: (taskId: number, text: string) => void }) {
  const [val, setVal] = useState('');
  const submit = () => {
    if (val.trim()) { onAdd(taskId, val.trim()); setVal(''); }
  };
  return (
    <>
      <input className="cl-add-input" placeholder="Add checklist item..." value={val} onChange={e => setVal(e.target.value)}
        onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
      <button className="cl-add-btn" onClick={e => { e.stopPropagation(); submit(); }}>Add</button>
    </>
  );
}

function PrintPreview({ categories, tasks, kpi }: { categories: Category[]; tasks: Task[]; kpi: { total: number; done: number; bl: number; ip: number; prog: number } }) {
  const { total, done, bl, ip, prog } = kpi;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="preview-view">
      <div className="preview-toolbar">
        <span className="prev-label">Print Preview &mdash; Read Only</span>
        <div className="prev-spacer" />
        <button className="prev-btn" onClick={() => window.print()}>&#9009; Print / Save PDF</button>
      </div>
      <div className="paper">
        <div className="pp-masthead">
          <div>
            <div className="pp-logo-title">RUDA Execution OS</div>
            <div className="pp-logo-sub">ARD Pvt Ltd &middot; 2-Week War Room Sprint</div>
          </div>
          <div className="pp-meta-block">
            <div className="pp-meta-line"><strong>Generated:</strong> {today}</div>
            <div className="pp-meta-line"><strong>Sprint:</strong> 14-Day Execution Window</div>
            <div className="pp-meta-line"><strong>Authority:</strong> RUDA Coordination</div>
            <div className="pp-meta-line"><strong>Classification:</strong> Internal / Confidential</div>
          </div>
        </div>
        <div className="pp-kpi-row">
          <div className="pp-kpi"><div className="pp-kpi-label">Total Tasks</div><div className="pp-kpi-val">{total}</div><div className="pp-kpi-sub">7 domains</div></div>
          <div className="pp-kpi"><div className="pp-kpi-label">Progress</div><div className="pp-kpi-val">{prog}%</div><div className="pp-kpi-sub">Sprint completion</div></div>
          <div className="pp-kpi"><div className="pp-kpi-label">In Progress</div><div className="pp-kpi-val">{ip}</div><div className="pp-kpi-sub">Active now</div></div>
          <div className="pp-kpi"><div className="pp-kpi-label">Completed</div><div className="pp-kpi-val">{done}</div><div className="pp-kpi-sub">Closed out</div></div>
          <div className="pp-kpi"><div className="pp-kpi-label">Blocked</div><div className="pp-kpi-val">{bl}</div><div className="pp-kpi-sub">Needs attention</div></div>
        </div>
        {categories.map(cat => {
          const catTasks = tasks.filter(t => t.cat_id === cat.id);
          if (!catTasks.length) return null;
          const catProg = Math.round(catTasks.reduce((s, t) => s + getProgress(t), 0) / catTasks.length);
          return (
            <div className="pp-cat" key={cat.id}>
              <div className="pp-cat-hdr">
                <div className="pp-cat-bar" style={{ background: cat.color }} />
                <div className="pp-cat-name" style={{ color: cat.color }}>{cat.label}</div>
                <div className="pp-cat-prog">{catTasks.length} tasks &middot;&nbsp;</div>
                <div className="pp-cat-pct" style={{ color: cat.color }}>{catProg}% complete</div>
              </div>
              {catTasks.map(task => {
                const p = getProgress(task);
                return (
                  <div className="pp-task" key={task.id}>
                    <div className="pp-task-left">
                      <div className="pp-task-name">{task.name}</div>
                      <div className="pp-task-sub">{task.sub}</div>
                      <div className="pp-cl">
                        {task.checklist.map(item => (
                          <div className="pp-cl-item" key={item.id}>
                            <div className={`pp-cb ${item.checked ? 'on' : ''}`}>
                              {item.checked && <svg width="8" height="6" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <span className={`pp-cl-txt ${item.checked ? 'done' : ''}`}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pp-task-right">
                      <div className="pp-mr"><span className="pp-mk">Owner</span><span className="pp-mv">{task.owner || '\u2014'}</span></div>
                      <div className="pp-mr"><span className="pp-mk">POC</span><span className="pp-mv">{task.poc || '\u2014'}</span></div>
                      <div className="pp-mr"><span className="pp-mk">Due</span><span className="pp-mv" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{task.deadline || '\u2014'}</span></div>
                      <div className="pp-mr"><span className="pp-mk">Status</span><span className="pp-mv"><span className={`pp-st ${SL[task.status]?.c || ''}`}>{SL[task.status]?.l || task.status}</span></span></div>
                      <div className="pp-mr"><span className="pp-mk">Done</span><span className="pp-mv"><div className="pp-prog-track"><div className="pp-prog-fill" style={{ width: `${p}%`, background: cat.color }} /></div>&nbsp;<span className="pp-prog-pct">{p}%</span></span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="pp-footer">
          <div className="pp-footer-l">RUDA Execution OS &mdash; ARD Pvt Ltd &mdash; Internal Document</div>
          <div className="pp-footer-r">Generated {today} &middot; Confidential</div>
        </div>
      </div>
    </div>
  );
}
