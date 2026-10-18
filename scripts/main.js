/**
 * Messages secrets — magisterphamtom — MIT
 * Messages privés entre joueurs et Gardien / MJ, sans commande à taper :
 * un bouton, des destinataires à cocher, et une carte bien visible à la réception.
 * Chaque message est aussi un vrai chuchotement du chat (historique conservé).
 * Habillages : générique, Outreterre (drow), New York 1933 / 2026, Antarctique 1933 / 2026.
 */

const ID = "messages-secrets";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const active = (id) => !!game.modules.get(id)?.active;

/* ================================================================== */
/*  Habillages                                                         */
/* ================================================================== */

export const THEMES = {
  generique: { label: "Générique (verre sombre et doré)", gm: "Meneur", title: "Message privé", icon: "fa-solid fa-envelope", send: "Envoyer", toGm: "Message au meneur", sound: "sounds/notify.wav" },
  drow: { label: "Outreterre (drow)", gm: "Maître du jeu", title: "Murmure de l'Outreterre", icon: "fa-solid fa-spider", send: "Murmurer", toGm: "Murmurer au MJ", sound: "sounds/notify.wav" },
  ny1933: { label: "New York 1933 (télégramme)", gm: "Gardien", title: "Télégramme", icon: "fa-solid fa-envelope-open-text", send: "Télégraphier", toGm: "Télégramme au Gardien", sound: "sounds/notify.wav" },
  ant1933: { label: "Antarctique 1933 (message radio)", gm: "Gardien", title: "Message radio", icon: "fa-solid fa-tower-broadcast", send: "Transmettre", toGm: "Message radio au Gardien", sound: "sounds/notify.wav" },
  ny2026: { label: "New York 2026 (SMS)", gm: "Gardien", title: "Message", icon: "fa-solid fa-comment-sms", send: "Envoyer", toGm: "SMS au Gardien", sound: "sounds/notify.wav" },
  ant2026: { label: "Antarctique 2026 (liaison satellite)", gm: "Gardien", title: "Liaison satellite", icon: "fa-solid fa-satellite-dish", send: "Transmettre", toGm: "Liaison avec le Gardien", sound: "sounds/notify.wav" }
};

/** Thème en vigueur : choix du MJ, ou automatique (Bascule d'époque + lieu). */
export function currentTheme() {
  const t = game.settings.get(ID, "theme");
  if (t !== "auto") return THEMES[t] ? t : "generique";
  let era = "1933";
  if (active("coc7-bascule-epoque")) {
    try { if (game.settings.get("coc7-bascule-epoque", "currentEra") === "modern") era = "2026"; } catch { /* réglage absent */ }
  }
  const place = game.settings.get(ID, "place") === "antarctique" ? "ant" : "ny";
  return `${place}${era}`;
}

/* ================================================================== */
/*  Réglages, raccourci, API                                           */
/* ================================================================== */

Hooks.once("init", () => {
  game.settings.register(ID, "theme", {
    name: "Habillage",
    hint: "« Automatique » suit le module Bascule d'époque (1933 ou 2026) et le lieu choisi ci-dessous. Modifiable aussi depuis la fenêtre du Gardien.",
    scope: "world", config: true, type: String,
    choices: { auto: "Automatique (Montagnes Hallucinées)", ...Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.label])) },
    default: "generique", onChange: () => MessageApp.instance?.render()
  });
  game.settings.register(ID, "place", {
    name: "Lieu (habillage automatique)",
    hint: "Où se trouvent les investigateurs : télégramme / SMS à New York, message radio / liaison satellite en Antarctique.",
    scope: "world", config: true, type: String,
    choices: { newyork: "New York", antarctique: "Antarctique" },
    default: "newyork", onChange: () => MessageApp.instance?.render()
  });
  game.settings.register(ID, "playerToPlayer", {
    name: "Messages entre joueurs",
    hint: "Autorise les joueurs à s'écrire entre eux (le Gardien voit tout de même ces messages dans le chat, comme tout chuchotement Foundry).",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(ID, "sound", {
    name: "Son à la réception",
    hint: "Vide : aucun son.",
    scope: "world", config: true, type: String, default: "sounds/notify.wav", filePicker: "audio"
  });
  game.settings.register(ID, "stayOpen", {
    name: "Les messages reçus restent affichés",
    hint: "Sinon, ils disparaissent seuls après 20 secondes (ils restent dans le chat).",
    scope: "client", config: true, type: Boolean, default: true
  });

  game.settings.register(ID, "autoHotbar", {
    name: "Macro dans la barre des joueurs",
    hint: "Le module crée la macro « Message secret » (utilisable par tous) et la place une fois dans un emplacement libre de la barre de chaque joueur et du Gardien.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(ID, "hotbarDone", { scope: "client", config: false, type: Boolean, default: false });

  game.keybindings.register(ID, "compose", {
    name: "Écrire un message secret",
    hint: "AZERTY : la touche M est déclarée aussi.",
    editable: [{ key: "KeyM", modifiers: ["Alt"] }, { key: "Semicolon", modifiers: ["Alt"] }],
    onDown: () => { MessageApp.open(); return true; }
  });
});

Hooks.once("ready", async () => {
  const mod = game.modules.get(ID);
  if (mod) mod.api = { open: (opts) => MessageApp.open(opts), send, theme: currentTheme, addToHotbar: () => { const m = findMacro(); return m ? placeInHotbar(m, true) : ensureMacro(); } };
  try { await ensureMacro(); } catch (err) { console.error(`${ID} | macro`, err); }
});

/* ================================================================== */
/*  Macro « Message secret » partagée + placement dans la barre        */
/* ================================================================== */

const MACRO_NAME = "Message secret";
const MACRO_IMG = `modules/${ID}/icons/message-secret.svg`;
const MACRO_CMD = `game.modules.get("${ID}")?.api.open();`;

const findMacro = () => game.macros.find((m) => m.getFlag(ID, "macro") || (m.name === MACRO_NAME && m.command?.includes(ID)));

async function ensureMacro() {
  if (!game.settings.get(ID, "autoHotbar")) return;
  let macro = findMacro();
  // Le Gardien crée la macro, utilisable (Observateur) par tous les joueurs
  if (!macro && game.user.isGM) {
    macro = await Macro.create({
      name: MACRO_NAME, type: "script", img: MACRO_IMG, command: MACRO_CMD,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: { [ID]: { macro: true } }
    });
  }
  if (!macro) return; // le Gardien ne s'est pas encore connecté : ce sera fait à la prochaine connexion
  await placeInHotbar(macro);
}

/** Place la macro une seule fois dans le premier emplacement libre (1 à 50) de la barre de cet utilisateur. */
async function placeInHotbar(macro, force = false) {
  if (!force && game.settings.get(ID, "hotbarDone")) return;
  const bar = game.user.hotbar ?? {};
  if (Object.values(bar).includes(macro.id)) return game.settings.set(ID, "hotbarDone", true);
  let slot = null;
  for (let i = 1; i <= 50; i++) if (!bar[i] || !game.macros.get(bar[i])) { slot = i; break; }
  if (!slot) return;
  await game.user.assignHotbarMacro(macro, slot);
  await game.settings.set(ID, "hotbarDone", true);
}

/* Un joueur qui se connecte après la création de la macro la reçoit aussi */
Hooks.on("createMacro", (macro) => {
  if (macro.getFlag?.(ID, "macro") && !game.user.isGM && game.settings.get(ID, "autoHotbar")) placeInHotbar(macro).catch(() => {});
});

/* ================================================================== */
/*  Envoi : un chuchotement Foundry marqué par le module               */
/* ================================================================== */

export async function send({ to = [], text = "", replyTo = null } = {}) {
  text = String(text).trim();
  if (!text) { ui.notifications.warn("Le message est vide."); return false; }
  const gms = game.users.filter((u) => u.isGM).map((u) => u.id);
  let targets = [...new Set(to.flatMap((t) => (t === "gm" ? gms : [t])))].filter((id) => id !== game.user.id);
  if (!targets.length) { ui.notifications.warn("Choisissez au moins un destinataire."); return false; }
  const theme = currentTheme();
  const html = `<div class="ms-chat ms-theme-${theme}"><div class="ms-chat-head"><i class="${THEMES[theme].icon}"></i> ${esc(THEMES[theme].title)}</div><p>${esc(text).replace(/\n/g, "<br>")}</p></div>`;
  await ChatMessage.create({
    content: html,
    whisper: targets,
    speaker: { alias: game.user.name },
    flags: { [ID]: { theme, text, to: targets, replyTo } }
  });
  ui.notifications.info(`Message envoyé à ${targets.map((id) => game.users.get(id)?.name).filter(Boolean).join(", ")}.`);
  return true;
}

/* ================================================================== */
/*  Réception : la carte apparaît chez le destinataire                 */
/* ================================================================== */

Hooks.on("createChatMessage", (msg) => {
  const data = msg.getFlag?.(ID, "theme") ? msg.flags[ID] : null;
  if (!data) return;
  if (msg.author?.id === game.user.id) return;
  if (!(data.to ?? msg.whisper).includes(game.user.id)) return;
  Inbox.show(msg, data);
});

/* Habille le message dans le chat */
Hooks.on("renderChatMessageHTML", (msg, html) => {
  if (!msg.getFlag?.(ID, "theme")) return;
  html.classList.add("ms-chat-message");
});

const stamp = (d) => {
  const date = new Date(d ?? Date.now());
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

/** Texte mis en forme selon l'habillage (télégramme en capitales avec STOP, radio avec FIN). */
function styledText(theme, text) {
  const t = esc(text);
  if (theme === "ny1933") return t.toUpperCase().replace(/([.!?])(\s+|$)/g, " STOP ").replace(/\n/g, " ").replace(/\s+STOP\s*$/, " STOP");
  if (theme === "ant1933") return t.toUpperCase().replace(/\n/g, "<br>") + "<b>— FIN DE MESSAGE —</b>";
  return t.replace(/\n/g, "<br>");
}

export const Inbox = {
  root() {
    let el = document.getElementById("ms-inbox");
    if (!el) {
      el = document.createElement("div");
      el.id = "ms-inbox";
      document.body.append(el);
    }
    return el;
  },

  show(msg, data) {
    const theme = THEMES[data.theme] ? data.theme : "generique";
    const T = THEMES[theme];
    const author = msg.author;
    const name = author?.isGM ? T.gm : (author?.character?.name ?? author?.name ?? "?");
    const sub = author?.isGM ? "" : (author?.character ? author.name : "");
    const img = author?.isGM ? null : (author?.character?.img ?? author?.avatar);
    const card = document.createElement("article");
    card.className = `ms-card ms-theme-${theme}`;
    card.dataset.msg = msg.id;
    card.innerHTML = `
      ${theme === "drow" ? '<svg class="ms-web" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width=".8"><path d="M0 0L100 100M0 0L100 40M0 0L40 100M0 0L100 0M0 0L0 100"/><path d="M0 22Q14 14 22 0M0 44Q30 30 44 0M0 66Q46 46 66 0M0 88Q62 62 88 0"/></g></svg>' : ""}
      <header class="ms-head">
        ${theme === "ny2026" ? `<div class="ms-app"><i class="fa-solid fa-comment"></i> Messages <span>maintenant</span></div>` : ""}
        ${theme === "ant2026" ? `<div class="ms-app"><i class="fa-solid fa-satellite-dish"></i> LIAISON SATELLITE · CANAL CHIFFRÉ <span>${stamp()} UTC</span></div>` : ""}
        <div class="ms-kicker"><i class="${T.icon}"></i> ${esc(T.title)}</div>
        <div class="ms-from">
          ${img ? `<img class="ms-avatar" src="${esc(img)}" alt="">` : `<span class="ms-avatar ms-avatar-gm"><i class="fa-solid fa-${author?.isGM ? "eye" : "user"}"></i></span>`}
          <div><span class="ms-label">${theme === "ny1933" ? "EXPÉDITEUR" : theme === "ant1933" ? "DE" : "De"}</span> <b>${esc(name)}</b>${sub ? ` <small>(${esc(sub)})</small>` : ""}</div>
          <time>${stamp(msg.timestamp)}</time>
        </div>
      </header>
      <div class="ms-body">${styledText(theme, data.text)}</div>
      <footer class="ms-foot">
        <button type="button" data-ms="reply"><i class="fa-solid fa-reply"></i> Répondre</button>
        <button type="button" data-ms="close"><i class="fa-solid fa-check"></i> Lu</button>
      </footer>`;
    card.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-ms]");
      if (!b) return;
      if (b.dataset.ms === "reply") MessageApp.open({ to: [author?.isGM ? "gm" : author?.id], replyTo: msg.id });
      Inbox.dismiss(card);
    });
    this.root().append(card);
    requestAnimationFrame(() => card.classList.add("ms-in"));
    const sound = game.settings.get(ID, "sound");
    if (sound) foundry.audio.AudioHelper.play({ src: sound, volume: 0.7, autoplay: true, loop: false }, false);
    if (!game.settings.get(ID, "stayOpen")) setTimeout(() => Inbox.dismiss(card), 20000);
  },

  dismiss(card) {
    card.classList.add("ms-out");
    setTimeout(() => card.remove(), 350);
  }
};

/* ================================================================== */
/*  Fenêtre de rédaction                                               */
/* ================================================================== */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MessageApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance = null;
  static DEFAULT_OPTIONS = {
    id: "messages-secrets-app",
    tag: "form",
    classes: ["ms-app-window"],
    window: { title: "Message secret", icon: "fa-solid fa-user-secret", resizable: true },
    position: { width: 420, height: "auto" },
    form: { handler: MessageApp.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: { all: MessageApp.#all }
  };
  static PARTS = { form: { template: `modules/${ID}/templates/compose.hbs` } };

  constructor(opts = {}) {
    super(opts);
    this.to = opts.to ?? null;
    this.replyTo = opts.replyTo ?? null;
  }

  static open(opts = {}) {
    if (this.instance?.rendered) {
      if (opts.to) { this.instance.to = opts.to; this.instance.replyTo = opts.replyTo ?? null; this.instance.render(); }
      this.instance.bringToFront?.();
      return this.instance;
    }
    this.instance = new this(opts);
    this.instance.render(true);
    return this.instance;
  }

  async _prepareContext() {
    const theme = currentTheme();
    const T = THEMES[theme];
    const isGM = game.user.isGM;
    const p2p = game.settings.get(ID, "playerToPlayer");
    const wanted = new Set(this.to ?? (isGM ? [] : ["gm"]));
    const recipients = [];
    if (!isGM) recipients.push({ id: "gm", name: T.gm, sub: "", color: "#c9a24a", checked: wanted.has("gm"), online: game.users.some((u) => u.isGM && u.active), gm: true });
    if (isGM || p2p) {
      for (const u of game.users.filter((u) => !u.isGM && u.id !== game.user.id)) {
        recipients.push({ id: u.id, name: u.character?.name ?? u.name, sub: u.character ? u.name : "", color: u.color?.css ?? u.color ?? "#888", checked: wanted.has(u.id), online: u.active });
      }
    }
    const setting = game.settings.get(ID, "theme");
    return {
      theme, T, isGM, recipients, gmLabel: `le ${T.gm.toLowerCase()}`,
      replying: !!this.replyTo,
      themes: isGM ? [{ id: "auto", label: "Automatique (Montagnes Hallucinées)", selected: setting === "auto" }, ...Object.entries(THEMES).map(([k, v]) => ({ id: k, label: v.label, selected: setting === k }))] : null,
      place: game.settings.get(ID, "place"),
      showPlace: isGM && setting === "auto"
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;
    for (const c of [...el.classList]) if (c.startsWith("ms-theme-")) el.classList.remove(c);
    el.classList.add(`ms-theme-${context.theme}`);
    const ta = el.querySelector("textarea");
    ta?.focus();
    ta?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey) && !ev.repeat) {
        ev.preventDefault();
        if (typeof el.requestSubmit === "function") el.requestSubmit();
        else el.querySelector('button[type="submit"]')?.click();
      }
    });
    el.querySelector("[name=theme]")?.addEventListener("change", (ev) => game.settings.set(ID, "theme", ev.target.value));
    el.querySelector("[name=place]")?.addEventListener("change", (ev) => game.settings.set(ID, "place", ev.target.value));
  }

  static async #onSubmit(event, form) {
    if (this._sending) return;          // un seul envoi à la fois (double-clic, Ctrl+Entrée répété)
    this._sending = true;
    try {
    const to = [...form.querySelectorAll('input[name="to"]:checked')].map((i) => i.value);
    const text = form.querySelector("textarea")?.value ?? "";
    this.to = to;
    const ok = await send({ to, text, replyTo: this.replyTo });
    if (ok) this.close();
    } finally {
      this._sending = false;
    }
  }

  static #all(ev, target) {
    const boxes = [...this.element.querySelectorAll('input[name="to"]')];
    const on = boxes.some((b) => !b.checked);
    boxes.forEach((b) => (b.checked = on));
  }
}

/* ================================================================== */
/*  Boutons : barre de gauche + au-dessus du chat                      */
/* ================================================================== */

Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.tokens;
  if (!tokens?.tools) return;
  tokens.tools.messagesSecrets = {
    name: "messagesSecrets",
    title: "Message secret",
    icon: "fa-solid fa-user-secret",
    order: Object.keys(tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => MessageApp.open()
  };
});

/* Bouton à côté du champ de saisie du chat (le plus pratique pour les joueurs) */
function addChatButton(root) {
  const host = root?.querySelector?.("#chat-controls, .chat-controls") ?? document.querySelector("#chat-controls");
  if (!host || host.querySelector(".ms-chat-btn")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "ms-chat-btn ui-control icon";
  b.dataset.tooltip = game.user.isGM ? "Message secret à un joueur" : "Message secret au Gardien";
  b.setAttribute("aria-label", b.dataset.tooltip);
  b.innerHTML = '<i class="fa-solid fa-user-secret"></i>';
  b.addEventListener("click", () => MessageApp.open());
  host.prepend(b);
}
Hooks.on("renderChatLog", (app, html) => addChatButton(html instanceof HTMLElement ? html : html?.[0]));
Hooks.once("ready", () => addChatButton(document));
