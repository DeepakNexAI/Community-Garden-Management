/* Community Garden Management System - vanilla JS, LocalStorage demo (not production-secure) */
(() => {
  "use strict";
  const $ = (s, e = document) => e.querySelector(s),
    K = "cgms_data",
    SK = "cgms_user";
  const nid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
  const EM = /^\S+@\S+\.\S+$/;

  /* ---------- data ---------- */
  const seed = () => ({
    users: [
      {
        id: "u1",
        role: "admin",
        name: "Garden Admin",
        email: "sample@example.com",
        password: "Project@005",
        phone: "",
        status: "Active",
        joined: "2026-01-05",
      },
      {
        id: "u2",
        role: "member",
        name: "Demo Member",
        email: "member@example.com",
        password: "Member@005",
        phone: "9876500001",
        status: "Active",
        joined: "2026-02-10",
      },
      {
        id: "u3",
        role: "member",
        name: "Deepak Verma",
        email: "deepak@example.com",
        password: "Deepak@12345",
        phone: "9876500002",
        status: "Active",
        joined: "2026-03-02",
      },
    ],
    plots: [
      {
        id: "p1",
        name: "Plot A1",
        size: 100,
        crop: "Tomato",
        status: "Assigned",
        owner: "u2",
      },
      {
        id: "p2",
        name: "Plot A2",
        size: 80,
        crop: "Spinach",
        status: "Assigned",
        owner: "u3",
      },
      {
        id: "p3",
        name: "Plot B1",
        size: 120,
        crop: "",
        status: "Available",
        owner: "",
      },
      {
        id: "p4",
        name: "Plot B2",
        size: 90,
        crop: "Marigold",
        status: "Maintenance",
        owner: "",
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Water tomato beds",
        plot: "p1",
        assignee: "u2",
        due: "2026-11-23",
        priority: "High",
        status: "Pending",
      },
      {
        id: "t2",
        title: "Turn the compost",
        plot: "p3",
        assignee: "u3",
        due: "2026-11-25",
        priority: "Medium",
        status: "In Progress",
      },
      {
        id: "t3",
        title: "Repair B2 fence",
        plot: "p4",
        assignee: "",
        due: "2026-11-28",
        priority: "Low",
        status: "Pending",
      },
    ],
    logs: [
      {
        id: "l1",
        type: "Watering",
        plot: "p1",
        date: "2026-11-19",
        notes: "Morning drip watering, 20 minutes.",
        uid: "u2",
      },
      {
        id: "l2",
        type: "Weeding",
        plot: "p2",
        date: "2026-11-18",
        notes: "Cleared weeds around the spinach.",
        uid: "u3",
      },
    ],
    harvest: [
      {
        id: "h1",
        crop: "Tomato",
        plot: "p1",
        qty: 12.5,
        date: "2026-11-15",
        notes: "First picking.",
        uid: "u2",
      },
      {
        id: "h2",
        crop: "Spinach",
        plot: "p2",
        qty: 6,
        date: "2026-11-16",
        notes: "",
        uid: "u3",
      },
    ],
    notices: [
      {
        id: "n1",
        title: "Weekend planting day",
        category: "Event",
        message: "Join us Saturday at 8 AM at the main gate. Bring gloves.",
        date: "2026-11-20",
      },
      {
        id: "n2",
        title: "Water tank cleaning",
        category: "Urgent",
        message: "The tank is cleaned on Monday. Store water in advance.",
        date: "2026-11-19",
      },
    ],
    hours: [
      {
        id: "v1",
        date: "2026-11-17",
        hours: 3,
        activity: "Soil preparation",
        status: "Approved",
        uid: "u2",
      },
      {
        id: "v2",
        date: "2026-11-20",
        hours: 2,
        activity: "Compost duty",
        status: "Pending",
        uid: "u2",
      },
    ],
  });
  let D;
  try {
    D = JSON.parse(localStorage.getItem(K));
  } catch (e) {}
  D = D || seed();
  const save = () => localStorage.setItem(K, JSON.stringify(D));
  let me = null,
    cur = "",
    role = "admin";
  const VS = {};

  /* ---------- module config ----------
 field = [key,label,type,required,options,adminOnly]
 w: 'a' = admin writes, 'o' = admin + members (own rows) ; own: members see only own rows */
  const tone = {
    Available: "ok",
    Active: "ok",
    Done: "ok",
    Approved: "ok",
    Low: "ok",
    Assigned: "info",
    "In Progress": "info",
    General: "info",
    Event: "info",
    Pending: "warn",
    Medium: "warn",
    Maintenance: "warn",
    Inactive: "bad",
    Rejected: "bad",
    High: "bad",
    Urgent: "bad",
  };
  const MOD = {
    plots: {
      t: "Plots",
      s: "plot",
      i: "🌱",
      w: "a",
      flt: "status",
      cols: ["name", "size", "crop", "status", "owner"],
      f: [
        ["name", "Plot name", "text", 1],
        ["size", "Size (sq ft)", "number", 1],
        ["crop", "Current crop", "text"],
        [
          "status",
          "Status",
          "select",
          1,
          ["Available", "Assigned", "Maintenance"],
        ],
        ["owner", "Assigned member", "member"],
      ],
    },
    members: {
      t: "Members",
      s: "member",
      i: "👥",
      w: "a",
      d: "users",
      base: (r) => r.role === "member",
      flt: "status",
      cols: ["name", "email", "phone", "status", "joined"],
      f: [
        ["name", "Full name", "text", 1],
        ["email", "Email", "email", 1],
        ["phone", "Phone", "tel"],
        ["password", "Password", "text", 1],
        ["status", "Status", "select", 1, ["Active", "Inactive"], 1],
        ["joined", "Joined on", "date", 0, 0, 1],
      ],
    },
    tasks: {
      t: "Tasks",
      s: "task",
      i: "📅",
      w: "a",
      flt: "status",
      cols: ["title", "plot", "assignee", "due", "priority", "status"],
      f: [
        ["title", "Task", "text", 1],
        ["plot", "Plot", "plot"],
        ["assignee", "Assigned to", "member"],
        ["due", "Due date", "date", 1],
        ["priority", "Priority", "select", 1, ["Low", "Medium", "High"]],
        ["status", "Status", "select", 1, ["Pending", "In Progress", "Done"]],
      ],
    },
    logs: {
      t: "Care logs",
      s: "log",
      i: "💧",
      w: "o",
      flt: "type",
      cols: ["date", "type", "plot", "uid", "notes"],
      f: [
        [
          "type",
          "Activity",
          "select",
          1,
          ["Watering", "Maintenance", "Weeding", "Composting", "Pest control"],
        ],
        ["plot", "Plot", "plot", 1],
        ["date", "Date", "date", 1],
        ["notes", "Notes", "textarea"],
        ["uid", "Member", "member", 0, 0, 1],
      ],
    },
    harvest: {
      t: "Harvest",
      s: "harvest",
      i: "🥕",
      w: "o",
      flt: "plot",
      cols: ["date", "crop", "plot", "qty", "uid"],
      f: [
        ["crop", "Crop", "text", 1],
        ["plot", "Plot", "plot", 1],
        ["qty", "Quantity (kg)", "number", 1],
        ["date", "Date", "date", 1],
        ["notes", "Notes", "textarea"],
        ["uid", "Member", "member", 0, 0, 1],
      ],
    },
    notices: {
      t: "Announcements",
      s: "announcement",
      i: "📢",
      w: "a",
      flt: "category",
      cols: ["date", "title", "category", "message"],
      f: [
        ["title", "Title", "text", 1],
        ["category", "Category", "select", 1, ["General", "Event", "Urgent"]],
        ["message", "Message", "textarea", 1],
        ["date", "Date", "date", 1],
      ],
    },
    hours: {
      t: "Volunteer hours",
      s: "entry",
      i: "⏱️",
      w: "o",
      own: 1,
      flt: "status",
      cols: ["date", "uid", "activity", "hours", "status"],
      f: [
        ["date", "Date", "date", 1],
        ["activity", "Activity", "text", 1],
        ["hours", "Hours", "number", 1],
        [
          "status",
          "Status",
          "select",
          1,
          ["Pending", "Approved", "Rejected"],
          1,
        ],
        ["uid", "Member", "member", 0, 0, 1],
      ],
    },
  };
  const fd = (m, k) => MOD[m].f.find((f) => f[0] === k);
  const nm = (i) =>
    i
      ? (D.users.find((u) => u.id === i) || { name: "Former member" }).name
      : "—";
  const pn = (i) =>
    i
      ? (D.plots.find((p) => p.id === i) || { name: "Removed plot" }).name
      : "—";
  const opts = (f) =>
    f[2] === "member"
      ? (f[0] === "uid"
          ? D.users
          : D.users.filter((u) => u.role === "member")
        ).map((u) => [u.id, u.name])
      : f[2] === "plot"
        ? D.plots.map((p) => [p.id, p.name])
        : (f[4] || []).map((x) => [x, x]);
  const txt = (f, v) =>
    f[2] === "member"
      ? nm(v)
      : f[2] === "plot"
        ? pn(v)
        : v === "" || v == null
          ? "—"
          : v;
  const cell = (m, r, k, p) => {
    const f = fd(m, k),
      v = r[k],
      t = txt(f, v);
    return p
      ? String(t)
      : f[2] === "select"
        ? `<span class="b ${tone[v] || ""}">${esc(t)}</span>`
        : esc(t);
  };
  const canAdd = (m) => me.role === "admin" || MOD[m].w === "o";
  const canEdit = (m, r) =>
    me.role === "admin" ||
    (m === "members"
      ? r.id === me.id
      : MOD[m].w === "o" &&
        r.uid === me.id &&
        (m !== "hours" || r.status === "Pending"));
  const canDel = (m, r) =>
    m === "members" ? me.role === "admin" : canEdit(m, r);

  /* ---------- ui helpers ---------- */
  const toast = (t) => {
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = t;
    $("#toasts").append(d);
    setTimeout(() => d.remove(), 3000);
  };
  const say = (el, t) => {
    el.textContent = t;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  };
  const close = () => {
    $("#modal").hidden = true;
  };
  const modal = (h) => {
    $("#dlg").innerHTML = h;
    $("#modal").hidden = false;
    const f = $("#dlg input,#dlg select,#dlg textarea");
    if (f) f.focus();
    const x = $("#cx");
    if (x) x.onclick = close;
  };
  $("#modal").onclick = (e) => {
    if (e.target.id === "modal") close();
  };
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  $("#burger").onclick = () => document.body.classList.toggle("nav");

  /* ---------- authentication ---------- */
  const show = (w) => {
    $("#loginForm").hidden = w !== "login";
    $("#regForm").hidden = w !== "reg";
  };
  $("#roleTabs").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    role = b.dataset.role;
    [...$("#roleTabs").children].forEach((x) =>
      x.classList.toggle("on", x === b),
    );
    $("#loginTitle").textContent =
      (role === "admin" ? "Admin" : "Member") + " login";
    $("#regLink").hidden = role !== "member";
    $("#lErr").textContent = "";
    show("login");
  };
  $("#showReg").onclick = (e) => {
    e.preventDefault();
    show("reg");
  };
  $("#showLogin").onclick = (e) => {
    e.preventDefault();
    show("login");
  };
  $("#fill").onclick = (e) => {
    e.preventDefault();
    $("#lEmail").value =
      role === "admin" ? "sample@example.com" : "member@example.com";
    $("#lPass").value = role === "admin" ? "Project@005" : "Member@005";
  };
  $("#loginForm").onsubmit = (e) => {
    e.preventDefault();
    const em = $("#lEmail").value.trim().toLowerCase(),
      pw = $("#lPass").value,
      er = $("#lErr");
    if (!em) return say(er, "Enter your email address.");
    if (!EM.test(em)) return say(er, "Enter a valid email address.");
    if (!pw) return say(er, "Enter your password.");
    const u = D.users.find(
      (x) =>
        x.email.toLowerCase() === em && x.password === pw && x.role === role,
    );
    if (!u) return say(er, `Wrong email or password for the ${role} login.`);
    if (u.status === "Inactive")
      return say(er, "This account is inactive. Please contact the admin.");
    er.textContent = "";
    enter(u);
  };
  $("#regForm").onsubmit = (e) => {
    e.preventDefault();
    const n = $("#rName").value.trim(),
      em = $("#rEmail").value.trim().toLowerCase(),
      ph = $("#rPhone").value.trim(),
      pw = $("#rPass").value,
      er = $("#rErr");
    if (n.length < 2) return say(er, "Enter your full name.");
    if (!EM.test(em)) return say(er, "Enter a valid email address.");
    if (ph && !/^\d{10}$/.test(ph))
      return say(er, "Phone number must be 10 digits.");
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw))
      return say(er, "Password needs 8+ characters with letters and a number.");
    if (D.users.some((u) => u.email.toLowerCase() === em))
      return say(er, "This email is already registered.");
    const u = {
      id: nid(),
      role: "member",
      name: n,
      email: em,
      phone: ph,
      password: pw,
      status: "Active",
      joined: today(),
    };
    D.users.push(u);
    save();
    toast("Welcome to the garden, " + n.split(" ")[0] + "!");
    enter(u);
  };
  function enter(u, keep) {
    me = u;
    localStorage.setItem(SK, u.id);
    $("#auth").hidden = true;
    $("#app").hidden = false;
    $("#reset").hidden = u.role !== "admin";
    cur = "";
    if (!keep) location.hash = "#/dash";
    route();
  }
  $("#logout").onclick = () => {
    localStorage.removeItem(SK);
    me = null;
    location.hash = "";
    $("#app").hidden = true;
    $("#auth").hidden = false;
    $("#lPass").value = "";
    document.body.classList.remove("nav");
  };
  $("#reset").onclick = () => {
    modal(
      '<h3>Reset demo data?</h3><p>All records go back to the sample data.</p><div class="act"><button class="btn ghost" id="cx">Cancel</button><button class="btn bad" id="ok">Reset</button></div>',
    );
    $("#ok").onclick = () => {
      D = seed();
      save();
      me = D.users[0];
      close();
      toast("Demo data restored");
      route();
    };
  };

  /* ---------- routing ---------- */
  const NAV = () =>
    me.role === "admin"
      ? [
          "dash",
          "plots",
          "members",
          "tasks",
          "logs",
          "harvest",
          "notices",
          "hours",
        ]
      : [
          "dash",
          "plots",
          "tasks",
          "logs",
          "harvest",
          "notices",
          "hours",
          "profile",
        ];
  const lb = (k) =>
    k === "dash" ? "Dashboard" : k === "profile" ? "My profile" : MOD[k].t;
  const ic = (k) => (k === "dash" ? "🏡" : k === "profile" ? "🙍" : MOD[k].i);
  function route() {
    if (!me) return;
    let k = location.hash.replace("#/", "") || "dash";
    if (!NAV().includes(k)) {
      location.hash = "#/dash";
      k = "dash";
    }
    $("#nav").innerHTML = NAV()
      .map(
        (n) =>
          `<a href="#/${n}" class="${n === k ? "on" : ""}">${ic(n)} ${lb(n)}</a>`,
      )
      .join("");
    $("#pageTitle").textContent = lb(k);
    $("#who").textContent = `${me.name} (${me.role})`;
    const v = $("#view");
    if (k !== cur) {
      v.classList.remove("in");
      void v.offsetWidth;
      v.classList.add("in");
      cur = k;
    }
    k === "dash" ? dash() : k === "profile" ? prof() : mod(k);
    document.body.classList.remove("nav");
  }
  addEventListener("hashchange", route);

  /* ---------- dashboard ---------- */
  function dash() {
    const adm = me.role === "admin",
      sum = (a, k) =>
        Math.round(a.reduce((s, x) => s + (+x[k] || 0), 0) * 10) / 10;
    const H = D.harvest.filter((x) => adm || x.uid === me.id),
      V = D.hours.filter((x) => adm || x.uid === me.id);
    const T = D.tasks
      .filter((t) => t.status !== "Done" && (adm || t.assignee === me.id))
      .sort((a, b) => (a.due > b.due ? 1 : -1));
    const pend = V.filter((x) => x.status === "Pending").length + " pending",
      appr = sum(
        V.filter((x) => x.status === "Approved"),
        "hours",
      );
    const cards = adm
      ? [
          [
            "🌱",
            "Plots",
            D.plots.length,
            D.plots.filter((p) => p.status === "Available").length +
              " available",
          ],
          [
            "👥",
            "Members",
            D.users.filter((u) => u.role === "member").length,
            "registered",
          ],
          ["📅", "Open tasks", T.length, "to complete"],
          ["🥕", "Harvest (kg)", sum(H, "qty"), "recorded"],
          ["⏱️", "Approved hours", appr, pend],
        ]
      : [
          [
            "🌱",
            "My plots",
            D.plots.filter((p) => p.owner === me.id).length,
            "assigned to you",
          ],
          ["📅", "My open tasks", T.length, "to complete"],
          ["🥕", "My harvest (kg)", sum(H, "qty"), "recorded"],
          ["⏱️", "My approved hours", appr, pend],
        ];
    const g = {};
    H.forEach((h) => {
      g[h.crop] = (g[h.crop] || 0) + (+h.qty || 0);
    });
    const mx = Math.max(1, ...Object.values(g));
    const N = [...D.notices]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3);
    $("#view").innerHTML =
      `<div class="stats">${cards.map((c, n) => `<div class="stat c${n}"><span>${c[0]}</span><div><b>${c[2]}</b><p>${c[1]}</p><small>${c[3]}</small></div></div>`).join("")}</div>
<div class="grid">
<section class="panel"><h3>Garden map</h3><div class="map">${D.plots.map((p) => `<div class="tile ${p.status === "Available" ? "ok" : p.status === "Maintenance" ? "warn" : "info"}${p.owner === me.id ? " mine" : ""}"><b>${esc(p.name)}</b><small>${esc(p.crop || "Empty")}</small></div>`).join("") || '<p class="empty">No plots yet.</p>'}</div></section>
<section class="panel"><h3>${adm ? "Harvest" : "My harvest"} by crop (kg)</h3>${
        Object.keys(g).length
          ? Object.entries(g)
              .map(
                ([k, v], n) =>
                  `<div class="bar-row"><span>${esc(k)}</span><div><i style="width:${(v / mx) * 100}%;--d:${n * 80}ms"></i></div><b>${Math.round(v * 10) / 10}</b></div>`,
              )
              .join("")
          : '<p class="empty">No harvest recorded yet.</p>'
      }</section>
<section class="panel"><h3>Upcoming tasks</h3>${
        T.length
          ? `<ul class="l">${T.slice(0, 5)
              .map(
                (t) =>
                  `<li><b>${esc(t.title)} <span class="b ${tone[t.priority]}">${t.priority}</span></b><small>${esc(pn(t.plot))}, due ${t.due}</small></li>`,
              )
              .join("")}</ul>`
          : '<p class="empty">No open tasks.</p>'
      }</section>
<section class="panel"><h3>Latest announcements</h3>${N.length ? `<ul class="l">${N.map((n) => `<li><b>${esc(n.title)} <span class="b ${tone[n.category]}">${n.category}</span></b><small>${esc(n.message)}</small></li>`).join("")}</ul>` : '<p class="empty">No announcements.</p>'}</section>
</div>`;
  }

  /* ---------- profile (member) ---------- */
  function prof() {
    $("#view").innerHTML =
      `<section class="panel prof"><h3>${esc(me.name)}</h3><p>${esc(me.email)}</p><p>${esc(me.phone || "No phone number added")}</p><p>Member since ${esc(me.joined)}</p><button class="btn" id="ep">Edit profile</button></section>`;
    $("#ep").onclick = () => form("members", me.id);
  }

  /* ---------- generic module view (search, filter, table, CRUD) ---------- */
  function mod(m) {
    const c = MOD[m],
      s = VS[m] || (VS[m] = { q: "", f: "" }),
      f = c.flt && fd(m, c.flt);
    $("#view").innerHTML =
      `<div class="bar"><input id="q" type="search" placeholder="Search ${c.t.toLowerCase()}…" value="${esc(s.q)}" aria-label="Search ${c.t}">${
        f
          ? `<select id="flt" aria-label="Filter by ${f[1]}"><option value="">All ${f[1].toLowerCase()}</option>${opts(
              f,
            )
              .map(
                (o) =>
                  `<option value="${esc(o[0])}"${o[0] === s.f ? " selected" : ""}>${esc(o[1])}</option>`,
              )
              .join("")}</select>`
          : ""
      }${canAdd(m) ? `<button class="btn" id="add">+ Add ${c.s}</button>` : ""}</div><div class="tw" id="tbl"></div>`;
    $("#q").oninput = (e) => {
      s.q = e.target.value;
      tbl(m);
    };
    if (f)
      $("#flt").onchange = (e) => {
        s.f = e.target.value;
        tbl(m);
      };
    if (canAdd(m)) $("#add").onclick = () => form(m);
    $("#tbl").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const r = D[c.d || m].find((x) => x.id === b.dataset.i),
        a = b.dataset.a;
      if (a === "edit") form(m, r.id);
      else if (a === "del") del(m, r);
      else {
        r.status = a === "done" ? "Done" : a;
        save();
        toast("Status updated");
        tbl(m);
      }
    };
    tbl(m);
  }
  function acts(m, r) {
    const b = (a, t, cl) =>
      `<button class="sm ${cl || ""}" data-a="${a}" data-i="${r.id}">${t}</button>`;
    let h = "";
    if (m === "tasks" && r.assignee === me.id && r.status !== "Done")
      h += b("done", "Mark done", "ok");
    if (m === "hours" && me.role === "admin" && r.status === "Pending")
      h += b("Approved", "Approve", "ok") + b("Rejected", "Reject", "bad");
    if (canEdit(m, r)) h += b("edit", "Edit");
    if (canDel(m, r)) h += b("del", "Delete", "bad");
    return h || "—";
  }
  function tbl(m) {
    const c = MOD[m],
      s = VS[m],
      adm = me.role === "admin",
      q = s.q.toLowerCase();
    const rows = D[c.d || m].filter(
      (r) =>
        (!c.base || c.base(r)) &&
        (adm || !c.own || r.uid === me.id) &&
        (!s.f || r[c.flt] === s.f) &&
        c.cols
          .map((k) => cell(m, r, k, 1))
          .join(" ")
          .toLowerCase()
          .includes(q),
    );
    $("#tbl").innerHTML = rows.length
      ? `<table><thead><tr>${c.cols.map((k) => `<th>${fd(m, k)[1]}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${rows.map((r) => `<tr>${c.cols.map((k) => `<td data-l="${fd(m, k)[1]}">${cell(m, r, k)}</td>`).join("")}<td class="ac">${acts(m, r)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="empty">No ${c.t.toLowerCase()} found.${canAdd(m) ? " Use the add button to create one." : ""}</p>`;
  }
  function del(m, r) {
    const c = MOD[m],
      k = c.d || m;
    modal(
      `<h3>Delete this ${c.s}?</h3><p>This cannot be undone.</p><div class="act"><button class="btn ghost" id="cx">Cancel</button><button class="btn bad" id="ok">Delete</button></div>`,
    );
    $("#ok").onclick = () => {
      D[k] = D[k].filter((x) => x.id !== r.id);
      if (m === "members") {
        D.plots.forEach((p) => {
          if (p.owner === r.id) p.owner = "";
        });
        D.tasks.forEach((t) => {
          if (t.assignee === r.id) t.assignee = "";
        });
      }
      save();
      close();
      toast("Deleted");
      route();
    };
  }
  function form(m, i) {
    const c = MOD[m],
      adm = me.role === "admin",
      k = c.d || m,
      r = i ? D[k].find((x) => x.id === i) : {};
    const fs = c.f.filter((f) => adm || !f[5]);
    const inp = (f) => {
      const n = f[0],
        v = r[n] ?? (f[2] === "date" && !i ? today() : "");
      if (f[2] === "textarea")
        return `<textarea name="${n}" rows="3">${esc(v)}</textarea>`;
      if (["select", "member", "plot"].includes(f[2]))
        return `<select name="${n}">${f[2] === "select" && f[3] ? "" : `<option value="">${f[3] ? "Choose…" : "None"}</option>`}${opts(
          f,
        )
          .map(
            (o) =>
              `<option value="${esc(o[0])}"${o[0] === v ? " selected" : ""}>${esc(o[1])}</option>`,
          )
          .join("")}</select>`;
      return `<input name="${n}" type="${f[2]}" value="${esc(v)}"${f[2] === "number" ? ' step="any" min="0"' : ""}>`;
    };
    modal(
      `<form id="ef" novalidate><h3>${i ? "Edit" : "Add"} ${c.s}</h3>${fs.map((f) => `<label>${f[1]}${f[3] ? " *" : ""}${inp(f)}<small class="err"></small></label>`).join("")}<div class="act"><button type="button" class="btn ghost" id="cx">Cancel</button><button class="btn">Save</button></div></form>`,
    );
    $("#ef").onsubmit = (e) => {
      e.preventDefault();
      let ok = 1;
      const o = {};
      fs.forEach((f) => {
        const el = e.target.elements.namedItem(f[0]),
          v = el.value.trim();
        let msg = "";
        if (f[3] && !v) msg = "This field is required.";
        else if (v && f[2] === "email" && !EM.test(v))
          msg = "Enter a valid email address.";
        else if (
          v &&
          f[2] === "email" &&
          D.users.some(
            (u) => u.email.toLowerCase() === v.toLowerCase() && u.id !== i,
          )
        )
          msg = "This email is already registered.";
        else if (
          v &&
          f[2] === "number" &&
          !(+v > 0 && (f[0] !== "hours" || +v <= 24))
        )
          msg =
            f[0] === "hours"
              ? "Enter hours between 0 and 24."
              : "Enter a number greater than 0.";
        else if (f[0] === "password" && v.length < 8)
          msg = "Use at least 8 characters.";
        else if (v && f[2] === "tel" && !/^\d{10}$/.test(v))
          msg = "Enter a 10-digit phone number.";
        el.parentNode.querySelector(".err").textContent = msg;
        el.classList.toggle("invalid", !!msg);
        if (msg) ok = 0;
        o[f[0]] = f[2] === "number" && v ? +v : v;
      });
      if (!ok) return;
      let t = r;
      if (!i) {
        t = { id: nid() };
        if (m === "members") {
          t.role = "member";
          t.joined = today();
        }
        if (m === "hours" && !adm) t.status = "Pending";
        D[k].unshift(t);
      }
      Object.assign(t, o);
      if (m === "members" && !t.joined) t.joined = today();
      if (c.w === "o" && !t.uid) t.uid = me.id;
      save();
      close();
      toast(i ? "Changes saved" : "Added successfully");
      route();
    };
  }

  /* ---------- start ---------- */
  let u0;
  try {
    u0 = D.users.find((x) => x.id === localStorage.getItem(SK));
  } catch (e) {}
  if (u0 && u0.status !== "Inactive") enter(u0, 1);
})();
