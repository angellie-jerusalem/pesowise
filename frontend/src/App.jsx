import { useEffect, useRef, useState } from "react";
import "./style.css";

/* ===== DATA ===== */
const CATEGORIES = [
  { id: "food",      name: "Food",      color: "#D9A66B" },
  { id: "transport", name: "Transport", color: "#7F9BB3" },
  { id: "school",    name: "School",    color: "#8FAE8B" },
  { id: "fun",       name: "Fun",       color: "#C98A9B" },
  { id: "bills",     name: "Bills",     color: "#A99BC4" },
  { id: "other",     name: "Other",     color: "#B5AFA3" }
];

const EMPTY_DATA = { allowance: 0, start: "", end: "", expenses: [] };


/* ===== SERVER ===== */

// send request to api.php
async function api(action, body = {}) {
  let res, json;
  try {
    res = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action, ...body })
    });
  } catch (e) {
    throw new Error("Cannot reach the server. Check your connection.");
  }
  try {
    json = await res.json();
  } catch (e) {
    throw new Error("The server sent a bad reply.");
  }
  if (!res.ok) throw new Error(json.error || "Something went wrong.");
  return json;
}


/* ===== HELPERS ===== */

// 1500 -> "₱1,500"
function peso(n) {
  return "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 });
}

// 1500 -> "1.5k"
function shortNumber(n) {
  return n >= 1000 ? (Math.round(n / 100) / 10) + "k" : String(Math.round(n));
}

// Date object -> "2026-11-21"
function dateToText(d) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

// "2026-11-21" -> Date object
function textToDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "2026-11-21" -> "Nov 21"
function shortDate(text) {
  return textToDate(text).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function todayText() {
  return dateToText(new Date());
}

// find category (default: other)
function categoryOf(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[5];
}

// sum of amounts
function total(list) {
  return Math.round(list.reduce((sum, x) => sum + x.amount, 0) * 100) / 100;
}

// "Nov 1 – Nov 30"
function rangeText(data) {
  if (!data.start || !data.end) return "";
  return shortDate(data.start) + " – " + shortDate(data.end);
}

// expenses inside the allowance dates
function expensesInPeriod(data) {
  if (!(data.allowance > 0)) return data.expenses;
  return data.expenses.filter(x => x.date >= data.start && x.date <= data.end);
}


/* ===== ICONS ===== */
const svgProps = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };

const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" strokeWidth="1.8" {...svgProps}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14.5 7.5l3 3" />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" strokeWidth="1.8" {...svgProps}>
    <path d="M4 7h16" /><path d="M9 7V4.5h6V7" />
    <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
    <path d="M10 11v5M14 11v5" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...svgProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const EyeIcon = ({ slashed }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true" {...svgProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {slashed && <path d="M4 4l16 16" />}
  </svg>
);


/* ===== SUMMARY CARD ===== */
function Summary({ data }) {
  const isSet = data.allowance > 0;
  const list = expensesInPeriod(data);
  const spent = total(list);
  const left = isSet ? data.allowance - spent : 0;
  const today = todayText();

  // days left (including today)
  let daysLeft = 0;
  if (isSet) {
    const from = today > data.start ? today : data.start;
    daysLeft = Math.max(0, Math.round((textToDate(data.end) - textToDate(from)) / 86400000) + 1);
  }

  const perDay = left > 0 && daysLeft > 0 ? left / daysLeft : 0;
  const percent = isSet ? Math.min(100, spent / data.allowance * 100) : 0;
  const spentToday = total(list.filter(x => x.date === today));

  // message
  let message = "You’re on track.";
  if (!isSet) message = "Set your allowance to start.";
  else if (left < 0) message = "You’re over your allowance.";
  else if (today > data.end) message = "This allowance period has ended.";
  else if (percent >= 80) message = "Careful: you used " + Math.round(percent) + "% already.";

  // label
  let label = "Left";
  if (isSet) label = left < 0 ? "Over by" : "Left until " + shortDate(data.end);

  const over = left < 0 ? "over" : "";

  return (
    <section className="card" id="summary">
      <div className="sum">
        <div>
          <small>{label}</small>
          <div className={"big " + over}>{peso(Math.abs(left))}</div>
          <div className={"bar " + over}><i style={{ width: percent + "%" }}></i></div>
          <div className="under">
            <small>{peso(spent)} spent of {peso(isSet ? data.allowance : 0)}</small>
            <span className={"msg " + over}>{message}</span>
          </div>
        </div>
        <div className="stats">
          <div className="stat"><b>{peso(spentToday)}</b><small>spent today</small></div>
          <div className="stat"><b>{peso(perDay)}</b><small>can spend per day</small></div>
          <div className="stat"><b>{daysLeft}</b><small>day(s) left</small></div>
        </div>
      </div>
    </section>
  );
}


/* ===== EXPENSE FORM ===== */
function ExpenseForm({ editing, onSave }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(todayText());
  const formRef = useRef(null);
  const amountRef = useRef(null);

  // fill the form when editing, reset when done
  useEffect(() => {
    if (editing) {
      setAmount(editing.amount);
      setNote(editing.note);
      setCategory(editing.category);
      setDate(editing.date);
      formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      amountRef.current.focus({ preventScroll: true });
    } else {
      setAmount("");
      setNote("");
      setDate(todayText());
    }
  }, [editing]);

  async function submit(event) {
    event.preventDefault();
    const value = parseFloat(amount);
    if (!(value > 0)) return;

    const saved = await onSave({
      amount: Math.round(value * 100) / 100,
      note: note.trim(),
      category,
      date: date || todayText()
    });
    if (!saved) return;

    setAmount("");
    setNote("");
    amountRef.current.focus();
  }

  return (
    <section className="card add">
      <h2>{editing ? "Edit expense" : "Add expense"}</h2>
      <form ref={formRef} onSubmit={submit}>
        <label>Amount (₱)
          <input ref={amountRef} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" required
            value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label>What was it for?
          <input type="text" maxLength="40" placeholder="e.g. Lunch, jeep fare"
            value={note} onChange={e => setNote(e.target.value)} />
        </label>
        <div className="two">
          <label>Category
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
        </div>
        <button className="primary">{editing ? "Update expense" : "Save expense"}</button>
      </form>
    </section>
  );
}


/* ===== CHART, CATEGORIES, LIST ===== */

// last 7 days chart
function Chart({ data }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const text = dateToText(d);
    days.push({
      label: d.toLocaleDateString("en-PH", { weekday: "short" }),
      spent: total(data.expenses.filter(x => x.date === text))
    });
  }
  const biggest = Math.max(1, ...days.map(d => d.spent));

  return (
    <section className="card">
      <h2>Last 7 days <small>amounts in ₱</small></h2>
      <div className="chart">
        {days.map((d, i) => (
          <div className="barcol" key={i}>
            <span>{d.spent ? shortNumber(d.spent) : ""}</span>
            <i style={{ height: d.spent / biggest * 70 + "%" }}></i>
            <small>{d.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

// category bars
function Categories({ data }) {
  const list = expensesInPeriod(data);
  const spent = total(list);
  const rows = CATEGORIES
    .map(c => ({ ...c, amount: total(list.filter(x => x.category === c.id)) }))
    .filter(c => c.amount > 0);

  return (
    <section className="card">
      <h2>Where the money went <small>{rangeText(data)}</small></h2>
      <div>
        {rows.map(c => (
          <div className="cat" key={c.id}>
            <div><span>{c.name}</span><span>{peso(c.amount)}</span></div>
            <div className="bar"><i style={{ width: c.amount / spent * 100 + "%", background: c.color }}></i></div>
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No expenses yet.</div>}
      </div>
    </section>
  );
}

// latest 15 expenses
function ExpenseList({ data, editing, onEdit, onDelete }) {
  const newest = data.expenses
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 15);

  return (
    <section className="card">
      <h2>
        Recent expenses
        <small>{data.expenses.length ? `latest ${newest.length} of ${data.expenses.length}` : ""}</small>
      </h2>
      <div>
        {newest.map(x => {
          const c = categoryOf(x.category);
          const isEditing = editing && editing.id === x.id;
          return (
            <div className="item" key={x.id}>
              <span className="dot" style={{ background: c.color }}></span>
              <div className="text">
                <b>{x.note || c.name}</b>
                <small>{c.name} · {shortDate(x.date)}</small>
              </div>
              <span className="amt">{peso(x.amount)}</span>
              <button className={"icon" + (isEditing ? " on" : "")} aria-label="Edit expense" title="Edit"
                onClick={() => onEdit(x)}><EditIcon /></button>
              <button className="icon danger" aria-label="Delete expense" title="Delete"
                onClick={() => onDelete(x.id)}><DeleteIcon /></button>
            </div>
          );
        })}
        {newest.length === 0 && <div className="empty">No expenses yet. Add your first one.</div>}
      </div>
    </section>
  );
}


/* ===== ALLOWANCE DROPDOWN ===== */
function AllowanceBox({ data, onSave }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(data.allowance > 0 ? data.allowance : "");
  const [start, setStart] = useState(data.start);
  const [end, setEnd] = useState(data.end);

  // open dropdown: start = today
  function toggle(event) {
    const isOpen = event.currentTarget.open;
    setOpen(isOpen);
    if (!isOpen) return;
    setStart(todayText());
    if (end < todayText()) setEnd("");
  }

  async function submit(event) {
    event.preventDefault();
    const value = parseFloat(amount);
    if (!(value > 0)) return;
    if (await onSave({ allowance: value, start, end })) setOpen(false);
  }

  return (
    <details className="allow" open={open} onToggle={toggle}>
      <summary>
        <span>Allowance</span>
        <small>{data.allowance > 0 ? peso(data.allowance) + " · " + rangeText(data) : peso(0)}</small>
      </summary>
      <form onSubmit={submit}>
        <label>Allowance amount (₱)
          <input type="number" min="1" step="1" inputMode="decimal" required
            value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label>From
          <input type="date" required value={start}
            onChange={e => setStart(e.target.value)} />
        </label>
        <label>Until
          <input type="date" required value={end} min={start}
            onChange={e => setEnd(e.target.value)} />
        </label>
        <button className="primary">Save allowance</button>
      </form>
    </details>
  );
}


/* ===== PROFILE MENU ===== */
function ProfileMenu({ user, open, setOpen, onLogout }) {
  const ref = useRef(null);

  // close menu (click outside / Esc)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details className="profile" ref={ref} open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary aria-label="Account menu">
        <span className="avatar" aria-hidden="true">{String(user.name || "?").trim().charAt(0)}</span>
      </summary>
      <div className="pmenu">
        <div className="pinfo"><b>{user.name}</b><small>@{user.username}</small></div>
        <button className="logout" type="button" onClick={onLogout}><LogoutIcon />Log out</button>
      </div>
    </details>
  );
}


/* ===== LOGIN / SIGN UP ===== */
function AuthBox({ firstError, onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(firstError);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  function changeMode(newMode) {
    setMode(newMode);
    setError("");
  }

  // submit
  async function submit(event) {
    event.preventDefault();
    const user = username.trim();

    // check form
    let problem = "";
    if (!user || !password) problem = "Enter your username and password.";
    else if (!isLogin && !name.trim()) problem = "Enter your name.";
    else if (!isLogin && user.length < 3) problem = "Username must be at least 3 characters.";
    else if (!isLogin && password.length < 6) problem = "Password must be at least 6 characters.";
    if (problem) return setError(problem);

    setError("");
    setBusy(true);
    try {
      await api(mode, { name: name.trim(), username: user, password });
      await onLogin();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <section className="card" id="authBox">
      <div className="auth-logo" aria-hidden="true">₱</div>
      <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
      <p className="auth-sub">
        {isLogin ? "Log in to see your allowance and expenses." : "Free. Your data is saved to your account."}
      </p>

      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={isLogin} onClick={() => changeMode("login")}>Log in</button>
        <button type="button" role="tab" aria-selected={!isLogin} onClick={() => changeMode("register")}>Sign up</button>
      </div>

      <form onSubmit={submit} noValidate>
        {!isLogin && (
          <label>Full name
            <input type="text" maxLength="40" autoComplete="name" placeholder="e.g. Juan Dela Cruz"
              value={name} onChange={e => setName(e.target.value)} />
          </label>
        )}
        <label>Username
          <input type="text" maxLength="30" autoComplete="username" autoCapitalize="none" spellCheck="false"
            placeholder="e.g. juan123" autoFocus value={username} onChange={e => setUsername(e.target.value)} />
        </label>
        <label>Password
          <span className="pw">
            <input id="password" type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"} placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}><EyeIcon slashed={!showPassword} /></button>
          </span>
        </label>

        <p className="err" role="alert">{error}</p>
        <button className="primary" id="authSubmit" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}
        </button>
      </form>
    </section>
  );
}


/* ===== LOG OUT POPUP ===== */
function LogoutPopup({ onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">Log out?</h2>
        <p>Are you sure you want to log out?</p>
        <div className="modal-actions">
          <button type="button" className="cancel" autoFocus onClick={onCancel}>Cancel</button>
          <button type="button" className="danger" onClick={onConfirm}>Yes, log out</button>
        </div>
      </div>
    </div>
  );
}


/* ===== APP ===== */
export default function App() {
  const [ready, setReady] = useState(false);       // finished the first check
  const [user, setUser] = useState(null);          // null = logged out
  const [data, setData] = useState(EMPTY_DATA);
  const [editing, setEditing] = useState(null);    // expense being edited
  const [firstError, setFirstError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // load user and data
  async function start() {
    const me = await api("me");
    setData(await api("data"));
    setUser(me);
  }

  // logged in = show app, else login box
  useEffect(() => {
    start()
      .catch(e => { if (!e.message.includes("logged in")) setFirstError(e.message); })
      .finally(() => setReady(true));
  }, []);

  // add or update an expense
  async function saveExpense(fields) {
    try {
      if (editing) {
        await api("update_expense", { id: editing.id, ...fields });
        setData(d => ({ ...d, expenses: d.expenses.map(x => x.id === editing.id ? { ...x, ...fields } : x) }));
        setEditing(null);
      } else {
        const res = await api("add_expense", fields);
        setData(d => ({ ...d, expenses: [...d.expenses, { id: res.id, ...fields }] }));
      }
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  }

  // click again = cancel editing
  function toggleEdit(expense) {
    setEditing(editing && editing.id === expense.id ? null : expense);
  }

  async function deleteExpense(id) {
    try {
      await api("delete_expense", { id });
    } catch (e) {
      return alert(e.message);
    }
    if (editing && editing.id === id) setEditing(null);
    setData(d => ({ ...d, expenses: d.expenses.filter(x => x.id !== id) }));
  }

  async function saveAllowance(fields) {
    try {
      await api("set_budget", fields);
    } catch (e) {
      alert(e.message);
      return false;
    }
    setData(d => ({ ...d, ...fields }));
    return true;
  }

  async function logout() {
    setShowLogout(false);
    try { await api("logout"); } catch (e) {}
    setUser(null);
    setData(EMPTY_DATA);
    setEditing(null);
    setFirstError("");
    window.scrollTo(0, 0);
  }

  if (!ready) return null;

  // login box
  if (!user) {
    return <main><AuthBox firstError={firstError} onLogin={start} /></main>;
  }

  // main app
  return (
    <>
      <main>
        <header className="top">
          <div>
            <h1>PesoWise</h1>
            <p>Student Budget Tracker – helps students monitor their allowance and daily expenses.</p>
          </div>
          <div className="actions">
            <AllowanceBox data={data} onSave={saveAllowance} />
            <ProfileMenu user={user} open={menuOpen} setOpen={setMenuOpen}
              onLogout={() => { setMenuOpen(false); setShowLogout(true); }} />
          </div>
        </header>

        <div className="layout">
          <Summary data={data} />
          <ExpenseForm editing={editing} onSave={saveExpense} />
          <div className="details">
            <div className="insights">
              <Chart data={data} />
              <Categories data={data} />
            </div>
            <ExpenseList data={data} editing={editing} onEdit={toggleEdit} onDelete={deleteExpense} />
          </div>
        </div>
      </main>

      {showLogout && <LogoutPopup onCancel={() => setShowLogout(false)} onConfirm={logout} />}
    </>
  );
}
