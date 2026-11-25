/* Pétanque Manager – appli web (iPhone, iPad, Android, ordinateur). Tout reste dans le navigateur. */
(function () {
  "use strict";
  const M = window.Moteur;
  const VERSION = "1.4";

  // ------------------------------------------------------------------ Outils

  const $ = (s) => document.querySelector(s);
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); });
  }
  function dateFr(ms) { const d = new Date(ms); return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  function pluriel(n, mot, motP) { return n + " " + (n > 1 ? (motP || mot + "s") : mot); }
  function texteTerrain(t) { if (t === null || t === undefined) return null; return t === 0 ? "En attente d'un terrain" : "Terrain " + t; }
  function nomEquipe(e) { return e ? (M.libelle(e) + (e.club ? " (" + e.club + ")" : "")) : ""; }
  function noms(l) { return l.map((j) => j.nom).join(" + "); }
  let toastMinuteur = null;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("vu");
    clearTimeout(toastMinuteur); toastMinuteur = setTimeout(() => t.classList.remove("vu"), 3200);
  }

  // ------------------------------------------------------------------ Stockage (dans le navigateur)

  const PREF = "pm.c.", CLE_CLUBS = "pm.clubs";
  let concours = {}; // id -> concours
  let clubs = [];
  function chargerTout() {
    concours = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf(PREF) !== 0) continue;
      try { const c = M.depuisJson(localStorage.getItem(k)); concours[c.id] = c; } catch (e) { console.warn("Concours illisible", k, e); }
    }
    try { clubs = JSON.parse(localStorage.getItem(CLE_CLUBS) || "[]"); } catch (e) { clubs = []; }
    clubs.sort((a, b) => a.nom.toLowerCase().localeCompare(b.nom.toLowerCase()));
  }
  function ecrire(cle, texte) {
    try { localStorage.setItem(cle, texte); return true; }
    catch (e) { toast("Mémoire du navigateur pleine : exporte une sauvegarde et supprime d'anciens concours."); return false; }
  }
  function sauver(c) { concours[c.id] = c; return ecrire(PREF + c.id, M.versJson(c)); }
  function supprimerStock(id) { delete concours[id]; localStorage.removeItem(PREF + id); }
  function sauverClubs() { clubs.sort((a, b) => a.nom.toLowerCase().localeCompare(b.nom.toLowerCase())); ecrire(CLE_CLUBS, M.versJson(clubs)); }
  function listeConcours() { return Object.values(concours).sort((a, b) => b.creeLe - a.creeLe); }
  function clubDe(id) { return clubs.find((c) => c.id === id) || null; }

  // Historique pour « Annuler » (en mémoire, 30 étapes par concours)
  const historique = {};
  function empiler(id, json) { const p = historique[id] || (historique[id] = []); p.push(json); if (p.length > 30) p.shift(); }
  function peutAnnuler(id) { return !!(historique[id] && historique[id].length); }
  function annuler(c) {
    const json = historique[c.id] && historique[c.id].pop();
    if (!json) return;
    sauver(M.depuisJson(json));
    toast("Dernière action annulée");
    rendre();
  }

  /** Applique une action du moteur, recalcule, sauvegarde ; une erreur de règle est affichée et rien n'est changé. */
  function agir(c, action, message) {
    const avant = M.versJson(c);
    try {
      action();
      M.actualiser(c);
      M.attribuerTerrains(c);
      sauver(c);
      empiler(c.id, avant);
      if (message) toast(message);
    } catch (e) {
      sauver(M.depuisJson(avant));
      toast(e.regle ? e.message : "Erreur : " + e.message);
      if (!e.regle) console.error(e);
    }
    rendre();
  }

  // ------------------------------------------------------------------ Navigation

  let profondeur = 0;
  function aller(h) { profondeur++; location.hash = h; }
  function retour(parDefaut) { if (profondeur > 0) { profondeur--; history.back(); } else location.replace(parDefaut || "#/"); }
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [chemin, requete] = h.split("?");
    const parts = chemin.split("/").filter(Boolean);
    const q = {};
    (requete || "").split("&").forEach((kv) => { if (kv) { const [k, v] = kv.split("="); q[k] = decodeURIComponent(v || ""); } });
    return { nom: parts[0] || "", id: parts[1] ? decodeURIComponent(parts[1]) : null, q };
  }

  // Actions déclenchées par data-a="…" (délégation d'évènements)
  const actions = {};
  let registre = []; // matchs cliquables du rendu en cours
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-a]");
    if (!el || el.disabled) return;
    const f = actions[el.dataset.a];
    if (f) { ev.preventDefault(); f(el, ev); }
  });

  // ------------------------------------------------------------------ Dialogues

  let dlgBoutons = [];
  function dialogue(titre, corps, boutons, classe) {
    fermerDialogue();
    dlgBoutons = boutons || [];
    const v = document.createElement("div");
    v.id = "voile";
    v.innerHTML = '<div class="dialogue ' + (classe || "") + '" role="dialog" aria-modal="true">' + (titre ? "<h3>" + esc(titre) + "</h3>" : "") +
      '<div class="corps">' + (corps || "") + '</div><div class="actions">' +
      dlgBoutons.map((b, i) => '<button class="btn ' + (b.classe || "tonal") + ' large" data-a="dlg" data-i="' + i + '">' + esc(b.texte) + "</button>").join("") +
      "</div></div>";
    v.addEventListener("click", (e) => { if (e.target === v) fermerDialogue(); });
    document.body.appendChild(v);
    const premier = v.querySelector("input,textarea");
    if (premier) setTimeout(() => premier.focus(), 60);
    return v;
  }
  function fermerDialogue() { const v = $("#voile"); if (v) v.remove(); }
  actions.dlg = (el) => {
    const b = dlgBoutons[+el.dataset.i];
    if (!b) return;
    if (b.action) { if (b.action() === false) return; }
    fermerDialogue();
  };
  actions.fermer = fermerDialogue;
  function confirmer(titre, texte, libelle, fn, danger) {
    dialogue(titre, "<p>" + esc(texte) + "</p>", [{ texte: libelle, classe: danger ? "danger" : "plein", action: fn }, { texte: "Annuler", classe: "texte" }]);
  }
  function demanderTexte(titre, valeur, fn, aide) {
    dialogue(titre, (aide ? "<p>" + esc(aide) + "</p>" : "") + '<input class="saisie" id="dlg-texte" value="' + esc(valeur) + '">', [
      { texte: "Enregistrer", classe: "plein", action: () => fn($("#dlg-texte").value) },
      { texte: "Annuler", classe: "texte" }
    ]);
    const i = $("#dlg-texte"); i.addEventListener("keydown", (e) => { if (e.key === "Enter") { fn(i.value); fermerDialogue(); } });
  }

  // ------------------------------------------------------------------ Rendu général

  function barre(titre, sous, gauche, droite) {
    return '<header class="barre"><div class="int">' + gauche + '<div class="titres"><h1>' + esc(titre) + "</h1>" + (sous ? '<div class="sous">' + esc(sous) + "</div>" : "") +
      "</div>" + (droite || "") + "</div></header>";
  }
  const btnRetour = '<button class="icone" data-a="retour" aria-label="Retour">‹</button>';

  function rendre() {
    const r = route();
    registre = [];
    let html;
    try {
      if (r.nom === "nouveau") html = vueCreation(r);
      else if (r.nom === "c" && concours[r.id]) html = vueConcours(concours[r.id]);
      else if (r.nom === "club" && clubDe(r.id)) html = vueClub(clubDe(r.id));
      else if (r.nom === "nouveau-club") html = vueNouveauClub();
      else html = vueAccueil();
    } catch (e) {
      console.error(e);
      html = barre("Pétanque Manager", null, btnRetour) + '<main><div class="carte"><b>Un problème est survenu.</b><p class="aide">' + esc(e.message) + "</p></div></main>";
    }
    const app = $("#app");
    const memeVue = app.dataset.vue === location.hash;
    const y = window.scrollY;
    app.innerHTML = html;
    app.dataset.vue = location.hash;
    window.scrollTo(0, memeVue ? y : 0);
    apresRendu();
  }
  let apresRenduFns = [];
  function apresRendu() { const f = apresRenduFns; apresRenduFns = []; f.forEach((x) => x()); }
  actions.retour = () => {
    const r = route();
    if (r.nom === "c" && concours[r.id] && concours[r.id].clubId && clubDe(concours[r.id].clubId) && profondeur === 0) return location.replace("#/club/" + concours[r.id].clubId);
    retour("#/");
  };

  // ------------------------------------------------------------------ Accueil

  const FORMATS = [
    ["TETE_A_TETE", "1:1", "", "Un contre un, plusieurs parties"],
    ["MELEE", "🎲", "", "Équipes tirées au sort à chaque partie"],
    ["DOUBLETTE_FORMEE", "2+2", "eq", "Équipes de 2 déjà formées"],
    ["TRIPLETTE_FORMEE", "3+3", "eq", "Équipes de 3 déjà formées"],
    ["CHAMPIONNAT", "🏆", "tab", "Poules, puis Général et Consolante"],
    ["ELIMINATION_REPECHAGE", "ABC", "tab", "2 parties, puis tableaux A, B, C"],
    ["CASCADE_ABC", "A›C", "tab", "Cascade : 3 tours, puis A, B, C"]
  ];
  const estIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const estInstallee = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  function carteConcours(c) {
    const e = M.etat(c), club = c.clubId ? clubDe(c.clubId) : null;
    return '<button class="carte" data-a="ouvrir" data-id="' + esc(c.id) + '"><div class="ligne1"><span class="t">' + esc(c.nom) + '</span><span class="puce ' +
      (e === "Terminé" ? "verte" : "orange") + '">' + esc(e) + '</span></div><div class="m">' + esc(M.TYPES[c.type].libelle) + " · " + dateFr(c.creeLe) +
      (club ? " · " + esc(club.nom) : "") + "</div></button>";
  }

  function vueAccueil() {
    const tous = listeConcours();
    const enCours = tous.filter((c) => !M.estTermine(c)), finis = tous.filter((c) => M.estTermine(c));
    let h = barre("Pétanque Manager", null, '<img class="logo" src="icones/icone-192.png" alt="">', '<button class="icone" data-a="menu-accueil" aria-label="Menu">⋯</button>');
    h += "<main>";
    let masque = false; try { masque = localStorage.getItem("pm.astuceIos") === "1"; } catch (e) { /* */ }
    if (estIOS && !estInstallee && !masque) {
      h += '<div class="bandeau"><div><b>Installer sur l\'iPhone :</b> touche <b>Partager</b> <span aria-hidden="true">⬆︎</span> dans Safari, puis <b>« Sur l\'écran d\'accueil »</b>. L\'appli s\'ouvrira en plein écran, même sans réseau.</div><button class="x" data-a="masquer-ios" aria-label="Fermer">✕</button></div>';
    }
    h += '<section class="accueil-haut"><h2>Organiser un concours</h2><p>Tirage au sort, poules, tableaux, mêlée et classements, directement sur ton téléphone.</p>' +
      '<button class="btn" data-a="nouveau">＋ Nouveau concours</button></section>';
    const formatsHtml = '<details class="section"' + (tous.length ? "" : " open") + '><summary>Formats</summary><div class="formats">' + FORMATS.map((f) =>
      '<button class="format ' + f[2] + '" data-a="nouveau" data-type="' + f[0] + '"><span class="b">' + f[1] + '</span><span><span class="n">' + esc(M.TYPES[f[0]].libelle) +
      '</span><span class="d" style="display:block">' + esc(f[3]) + "</span></span></button>").join("") + "</div></details>";

    if (!tous.length) h += formatsHtml;

    h += '<details class="section" open><summary>Mes clubs <span class="nb">· ' + clubs.length + "</span></summary>";
    h += clubs.map((cl) => {
      const n = tous.filter((c) => c.clubId === cl.id).length;
      return '<button class="carte" data-a="ouvrir-club" data-id="' + esc(cl.id) + '"><div class="ligne1"><span class="t">' + esc(cl.nom) + '</span><span class="puce">' +
        pluriel(cl.joueurs.length, "joueur") + '</span></div><div class="m">' + pluriel(n, "concours", "concours") + "</div></button>";
    }).join("");
    h += '<button class="btn contour large" data-a="nouveau-club">＋ Nouveau club</button><p class="aide">Un club garde la liste de ses joueurs et calcule leur classement sur tous ses concours.</p></details>';

    h += '<h2>En cours <span class="nb">· ' + enCours.length + "</span></h2>";
    h += enCours.length ? enCours.map(carteConcours).join("") : '<div class="vide">Aucun concours en cours.<br>Choisis un format pour commencer.</div>';
    if (finis.length) h += '<details class="section"><summary>Terminés <span class="nb">· ' + finis.length + "</span></summary>" + finis.map(carteConcours).join("") + "</details>";
    if (tous.length) h += formatsHtml;
    h += '<div class="pied-page">Pétanque Manager ' + VERSION + ' · version web<br>Tes concours restent sur cet appareil. <a href="#" data-a="sauvegarde">Sauvegarde</a> · <a href="../">Site</a></div>';
    return h + "</main>";
  }
  actions["masquer-ios"] = () => { try { localStorage.setItem("pm.astuceIos", "1"); } catch (e) { /* */ } rendre(); };
  actions.ouvrir = (el) => aller("#/c/" + encodeURIComponent(el.dataset.id));
  actions["ouvrir-club"] = (el) => aller("#/club/" + encodeURIComponent(el.dataset.id));
  actions["nouveau-club"] = () => aller("#/nouveau-club");
  actions.nouveau = (el) => {
    creation = null;
    aller("#/nouveau" + (el.dataset.type ? "?type=" + el.dataset.type : "") + (el.dataset.club ? (el.dataset.type ? "&" : "?") + "club=" + el.dataset.club : ""));
  };
  actions["menu-accueil"] = () => {
    dialogue(null, '<div class="menu-liste">' +
      '<button data-a="sauvegarde">💾 Sauvegarde (exporter / importer)</button>' +
      '<button data-a="installer">📲 Installer l\'appli</button>' +
      '<button data-a="a-propos">ℹ️ À propos</button></div>', [{ texte: "Fermer", classe: "texte" }]);
  };
  actions.installer = () => {
    dialogue("Installer l'appli", estInstallee ? "<p>L'appli est déjà installée sur cet appareil.</p>" :
      "<p><b>iPhone / iPad</b> : ouvre cette page dans <b>Safari</b>, touche <b>Partager</b> (le carré avec une flèche), puis <b>« Sur l'écran d'accueil »</b>.</p>" +
      "<p><b>Android</b> : menu ⋮ de Chrome, puis <b>« Installer l'application »</b> (ou télécharge l'appli Android depuis le site).</p>" +
      "<p><b>Ordinateur</b> : icône d'installation dans la barre d'adresse de Chrome ou Edge (ou l'appli Windows depuis le site).</p>" +
      "<p>Une fois installée, elle fonctionne sans connexion.</p>", [{ texte: "OK", classe: "plein" }]);
  };
  actions["a-propos"] = () => {
    dialogue("Pétanque Manager " + VERSION, "<p>Version web de l'appli : mêmes formats et mêmes règles que les applis Android et Windows.</p>" +
      "<p>Tout est enregistré dans ce navigateur, rien n'est envoyé sur internet. Pense à exporter une sauvegarde de temps en temps : le fichier s'importe aussi dans les applis Android et Windows (et inversement).</p>" +
      '<p>Contact : <a href="mailto:petanquemanager@hotmail.com">petanquemanager@hotmail.com</a></p>', [{ texte: "Fermer", classe: "plein" }]);
  };

  // ------------------------------------------------------------------ Sauvegarde

  actions.sauvegarde = () => {
    dialogue("Sauvegarde", "<p>Exporte tous tes concours et clubs dans un fichier. Il s'importe ici, ou dans les applis Android et Windows.</p>" +
      '<input type="file" id="fichier-import" accept=".json,application/json" class="cache">', [
      { texte: "Exporter une sauvegarde", classe: "plein", action: () => { exporter(); return false; } },
      { texte: "Importer une sauvegarde", classe: "tonal", action: () => { $("#fichier-import").click(); return false; } },
      { texte: "Fermer", classe: "texte" }
    ]);
    $("#fichier-import").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importer(f); });
  };
  function partagerFichier(nom, texte) {
    const blob = new Blob([texte], { type: "application/json" });
    try {
      const f = new File([blob], nom, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [f] }) && estIOS) {
        navigator.share({ files: [f], title: nom }).catch(() => {});
        return;
      }
    } catch (e) { /* repli sur le téléchargement */ }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function exporter() {
    const texte = '{"application":"Petanque Manager","version":1,"concours":[' + listeConcours().map(M.versJson).join(",") + '],"clubs":' + M.versJson(clubs) + "}";
    const d = new Date();
    partagerFichier("petanque-sauvegarde-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json", texte);
  }
  function importer(fichier) {
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const r = JSON.parse(lecteur.result);
        if (!r || (!r.concours && !r.clubs)) throw new Error("Ce fichier n'est pas une sauvegarde Pétanque Manager");
        let nc = 0, ncl = 0;
        (r.concours || []).forEach((x) => { if (x && x.id) { sauver(M.depuisJson(JSON.stringify(x))); nc++; } });
        (r.clubs || []).forEach((x) => { if (x && x.id) { clubs = clubs.filter((c) => c.id !== x.id); clubs.push(x); ncl++; } });
        sauverClubs();
        fermerDialogue();
        toast("Sauvegarde importée : " + pluriel(nc, "concours", "concours") + ", " + pluriel(ncl, "club"));
        rendre();
      } catch (e) { toast("Import impossible : " + (e.message || "fichier invalide")); }
    };
    lecteur.readAsText(fichier);
  }

  // ------------------------------------------------------------------ Création d'un concours

  let creation = null;
  function nouvelleCreation(r) {
    const clubId = r.q.club && clubDe(r.q.club) ? r.q.club : null;
    const cl = clubDe(clubId);
    return {
      type: M.TYPES[r.q.type] ? r.q.type : "MELEE", nom: "", taille: 2, nbTours: "4", terrains: false, nbTerrains: "6", gcg: false,
      clubId: clubId, choisis: cl ? cl.joueurs.map((_, i) => i) : [], lignes: Array.from({ length: 8 }, () => ({ nom: "", club: "" })), erreur: null, cle: location.hash
    };
  }
  const DESCRIPTIONS = {
    TETE_A_TETE: "Un contre un. À chaque partie, tirage au sort sans refaire les mêmes adversaires. S'il y a un nombre impair de joueurs, l'un d'eux gagne d'office 13-7 contre un « blanc » (jamais deux fois le même).",
    MELEE: "À chaque partie, les joueurs sont tirés au sort en doublettes ou triplettes : on ne rejoue jamais avec le même partenaire. Les joueurs en trop jouent à effectif égal, et un joueur seul gagne 13-7 contre un « blanc ».",
    DOUBLETTE_FORMEE: "Les équipes sont déjà formées : chaque équipe garde ses joueurs et rencontre une autre équipe à chaque partie (sans refaire les mêmes adversaires). Écris les joueurs de chaque équipe séparés par « / ».",
    TRIPLETTE_FORMEE: "Les équipes sont déjà formées : chaque équipe garde ses joueurs et rencontre une autre équipe à chaque partie (sans refaire les mêmes adversaires). Écris les joueurs de chaque équipe séparés par « / ».",
    CHAMPIONNAT: "Poules de 4 (ou 3) équipes tirées au sort, en évitant les équipes d'un même club. 2 victoires : Général. 2 défaites : Consolante. 1-1 : barrage. Les tableaux se remplissent au fur et à mesure.",
    ELIMINATION_REPECHAGE: "Tout le monde joue 2 parties : tour 1 tiré au sort, puis les gagnants entre eux et les perdants entre eux. Ensuite, élimination directe dans 3 tableaux : A (2 victoires), B (1 victoire) et C (aucune). Il faut au moins 8 équipes.",
    CASCADE_ABC: "Tout le monde joue 2 parties. 2-0 : tableau A. 1-1 : tour 3 entre eux, gagnants au tableau B, perdants au C. 0-2 : tour 3 entre eux, perdants éliminés, gagnants au tableau C. Il faut au moins 8 équipes."
  };

  function vueCreation(r) {
    if (!creation || creation.cle !== location.hash) creation = nouvelleCreation(r);
    const s = creation, numerote = M.aEquipesNumerotees(s.type), formee = M.equipesFormees(s.type);
    const leClub = clubDe(s.clubId), duClub = !!leClub && !numerote && !formee;
    const mot = numerote || formee ? "Équipe" : duClub ? "Invité" : "Joueur";
    let h = barre("Nouveau concours", null, btnRetour);
    h += "<main>";
    h += '<label class="champ"><span>Nom du concours (facultatif)</span><input class="saisie" data-c="nom" value="' + esc(s.nom) + '" placeholder="' + esc(M.TYPES[s.type].libelle + " du " + dateFr(Date.now())) + '"></label>';
    h += '<label class="champ"><span>Format</span><select class="saisie" data-c="type">' + FORMATS.map((f) => '<option value="' + f[0] + '"' + (f[0] === s.type ? " selected" : "") + ">" + esc(M.TYPES[f[0]].libelle) + "</option>").join("") + "</select></label>";
    h += '<p class="aide">' + esc(DESCRIPTIONS[s.type]) + "</p>";
    if (s.type === "MELEE") {
      h += '<label class="champ"><span>Équipes</span></label><div class="puces">' +
        [2, 3].map((t) => '<button class="choix' + (s.taille === t ? " actif" : "") + '" data-a="cr-taille" data-v="' + t + '">' + (t === 2 ? "Doublettes" : "Triplettes") + "</button>").join("") + "</div>";
    }
    if (!numerote) h += '<label class="champ"><span>Nombre de parties</span><input class="saisie" data-c="nbTours" inputmode="numeric" pattern="[0-9]*" value="' + esc(s.nbTours) + '"></label>';
    if (clubs.length) {
      h += '<label class="champ"><span>Club</span></label><div class="puces"><button class="choix' + (!s.clubId ? " actif" : "") + '" data-a="cr-club" data-v="">Aucun</button>' +
        clubs.map((cl) => '<button class="choix' + (s.clubId === cl.id ? " actif" : "") + '" data-a="cr-club" data-v="' + esc(cl.id) + '">' + esc(cl.nom) + "</button>").join("") + "</div>";
    }
    h += '<details class="section"' + (s.terrains || s.gcg ? " open" : "") + '><summary>Options</summary>';
    h += '<label class="interrupteur"><span class="txt"><b>Numéroter les terrains automatiquement</b><small>Chaque match reçoit un numéro de terrain, et attend s\'il n\'y en a plus de libre.</small></span><input type="checkbox" data-c="terrains"' + (s.terrains ? " checked" : "") + "></label>";
    if (s.terrains) h += '<label class="champ"><span>Nombre de terrains</span><input class="saisie" data-c="nbTerrains" inputmode="numeric" pattern="[0-9]*" value="' + esc(s.nbTerrains) + '"></label>';
    if (formee) h += '<label class="interrupteur"><span class="txt"><b>Gagnant contre gagnant</b><small>' + (s.gcg ? "Après le 1er tour (tiré au sort), chaque équipe rencontre une équipe qui a autant de victoires, sans refaire le même adversaire si possible." : "Désactivé : le tirage de chaque partie se fait au hasard.") + '</small></span><input type="checkbox" data-c="gcg"' + (s.gcg ? " checked" : "") + "></label>";
    h += "</details>";

    if (duClub) {
      h += '<details class="section" open><summary>Joueurs du club présents <span class="nb">(' + s.choisis.length + "/" + leClub.joueurs.length + ")</span></summary>";
      if (!leClub.joueurs.length) h += '<p class="aide">Ce club n\'a pas encore de joueurs : ajoute-les depuis la page du club.</p>';
      else {
        h += '<div class="rangee"><button class="btn texte" data-a="cr-tous" data-v="1">Tout cocher</button><button class="btn texte" data-a="cr-tous" data-v="0">Tout décocher</button></div>';
        h += leClub.joueurs.map((n, i) => '<label class="coche"><input type="checkbox" data-c="choisi" data-i="' + i + '"' + (s.choisis.indexOf(i) >= 0 ? " checked" : "") + "><span>" + esc(n) + "</span></label>").join("");
      }
      h += "</details>";
    }
    if (leClub && (numerote || formee)) h += '<p class="aide">' + (formee ? "Les concours en équipes formées apparaissent dans le club mais ne comptent pas dans son classement général." : "Le club « " + esc(leClub.nom) + " » sera appliqué aux équipes dont le club n'est pas renseigné.") + "</p>";

    h += "<h2>" + (numerote || formee ? "Équipes inscrites" : duClub ? "Joueurs invités (facultatif)" : "Joueurs inscrits") + "</h2>";
    h += '<div class="lignes">' + s.lignes.map((l, i) =>
      '<div class="ligne-saisie"><span class="num">' + (i + 1) + '</span><input class="saisie" data-c="ligne" data-i="' + i + '" value="' + esc(l.nom) + '" placeholder="' +
      esc(formee ? (M.TYPES[s.type].formee === 3 ? "Dupont / Martin / Durand" : "Dupont / Martin") : mot + " " + (i + 1)) + '" enterkeyhint="next" autocomplete="off">' +
      (numerote ? '<input class="saisie club" data-c="ligne-club" data-i="' + i + '" value="' + esc(l.club) + '" placeholder="Club" autocomplete="off"' + (clubs.length ? ' list="liste-clubs"' : "") + ">" : "") +
      '<button class="icone" data-a="cr-retirer" data-i="' + i + '" aria-label="Retirer">✕</button></div>').join("") + "</div>";
    if (clubs.length) h += '<datalist id="liste-clubs">' + clubs.map((c) => '<option value="' + esc(c.nom) + '">').join("") + "</datalist>";
    h += '<div class="rangee" style="margin-top:10px"><button class="btn contour" data-a="cr-ajouter">＋ ' + (numerote || formee ? "Ajouter une équipe" : duClub ? "Ajouter un invité" : "Ajouter un joueur") + '</button><button class="btn texte" data-a="cr-coller">Coller une liste</button></div>';
    h += "</main>";
    h += '<div class="bas-fixe"><div class="int">' + (s.erreur ? '<div class="erreur">' + esc(s.erreur) + "</div>" : "") +
      '<button class="btn plein large" data-a="cr-creer">Créer et tirer au sort</button></div></div>';
    return h;
  }

  // Saisie du formulaire de création (sans redessiner, pour ne pas perdre le clavier)
  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!creation || !el.dataset || !el.dataset.c) return;
    const k = el.dataset.c;
    if (k === "ligne") creation.lignes[+el.dataset.i].nom = el.value;
    else if (k === "ligne-club") creation.lignes[+el.dataset.i].club = el.value;
    else if (k === "nom" || k === "nbTours" || k === "nbTerrains") creation[k] = el.value;
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!creation || !el.dataset || !el.dataset.c) return;
    const k = el.dataset.c;
    if (k === "type") { creation.type = el.value; creation.erreur = null; rendre(); }
    else if (k === "terrains") { creation.terrains = el.checked; rendre(); }
    else if (k === "gcg") { creation.gcg = el.checked; rendre(); }
    else if (k === "choisi") {
      const i = +el.dataset.i;
      creation.choisis = creation.choisis.filter((x) => x !== i);
      if (el.checked) creation.choisis.push(i);
      const s = document.querySelector("details.section summary .nb");
      if (s && clubDe(creation.clubId)) s.textContent = "(" + creation.choisis.length + "/" + clubDe(creation.clubId).joueurs.length + ")";
    }
  });
  document.addEventListener("keydown", (ev) => {
    const el = ev.target;
    if (ev.key !== "Enter" || !el.dataset || el.dataset.c !== "ligne") return;
    ev.preventDefault();
    const i = +el.dataset.i;
    if (i + 1 >= creation.lignes.length) { creation.lignes.push({ nom: "", club: "" }); rendre(); }
    const s = document.querySelector('[data-c="ligne"][data-i="' + (i + 1) + '"]'); if (s) s.focus();
  });
  actions["cr-taille"] = (el) => { creation.taille = +el.dataset.v; rendre(); };
  actions["cr-club"] = (el) => {
    creation.clubId = el.dataset.v || null;
    const cl = clubDe(creation.clubId);
    creation.choisis = cl ? cl.joueurs.map((_, i) => i) : [];
    rendre();
  };
  actions["cr-tous"] = (el) => { const cl = clubDe(creation.clubId); creation.choisis = el.dataset.v === "1" && cl ? cl.joueurs.map((_, i) => i) : []; rendre(); };
  actions["cr-retirer"] = (el) => { creation.lignes.splice(+el.dataset.i, 1); rendre(); };
  actions["cr-ajouter"] = () => {
    creation.lignes.push({ nom: "", club: "" });
    rendre();
    const s = document.querySelector('[data-c="ligne"][data-i="' + (creation.lignes.length - 1) + '"]'); if (s) { s.focus(); s.scrollIntoView({ block: "center" }); }
  };
  actions["cr-coller"] = () => {
    dialogue("Coller une liste", "<p>Un nom par ligne (ou séparés par des virgules). Pour le championnat et les tableaux A/B/C, tu peux ajouter le club après un point-virgule : « Les Boulistes ; Amiens ».</p>" +
      '<textarea class="saisie" id="dlg-liste" rows="8"></textarea>', [
      { texte: "Ajouter à la liste", classe: "plein", action: () => {
        const l = $("#dlg-liste").value.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
        creation.lignes = creation.lignes.filter((x) => x.nom.trim());
        l.forEach((x) => { const p = x.split(";"); creation.lignes.push({ nom: p[0].trim(), club: (p[1] || "").trim() }); });
        setTimeout(rendre, 0);
      } },
      { texte: "Annuler", classe: "texte" }
    ]);
  };
  actions["cr-creer"] = () => {
    const s = creation;
    try {
      const type = s.type, leClub = clubDe(s.clubId);
      const titre = s.nom.trim() || M.TYPES[type].libelle + " du " + dateFr(Date.now());
      const c = { id: uuid(), nom: titre, type: type, creeLe: Date.now(), clubId: leClub ? leClub.id : null };
      if (M.aEquipesNumerotees(type)) {
        const equipes = [];
        s.lignes.forEach((l, i) => {
          const n = l.nom.trim();
          if (!n) return;
          const club = (l.club.trim() || (leClub ? leClub.nom : "")).trim();
          const e = { id: i + 1, nom: n }; if (club) e.club = club;
          equipes.push(e);
        });
        if (type === "CHAMPIONNAT") c.championnat = M.creerChampionnat(equipes);
        else c.repechage = M.creerRepechage(equipes, type === "CASCADE_ABC");
      } else {
        const nbTours = parseInt(s.nbTours, 10);
        if (!(nbTours >= 1)) throw Object.assign(new Error("Indique le nombre de parties"), { regle: true });
        const nomsJ = [];
        if (leClub && !M.equipesFormees(type)) s.choisis.slice().sort((a, b) => a - b).forEach((i) => { if (leClub.joueurs[i]) nomsJ.push(leClub.joueurs[i]); });
        s.lignes.forEach((l) => { if (l.nom.trim()) nomsJ.push(l.nom.trim()); });
        const joueurs = nomsJ.map((n, i) => ({ id: i + 1, nom: n }));
        const formee = M.equipesFormees(type);
        const m = M.creerMelee(joueurs, type === "TETE_A_TETE" || formee ? 1 : s.taille, nbTours, s.gcg && formee);
        M.tourSuivant(m);
        c.melee = m;
      }
      if (s.terrains) {
        const n = parseInt(s.nbTerrains, 10);
        if (!(n >= 1)) throw Object.assign(new Error("Indique le nombre de terrains (1 minimum)"), { regle: true });
        c.terrains = n;
      }
      M.attribuerTerrains(c);
      if (!sauver(c)) return;
      creation = null;
      location.replace("#/c/" + encodeURIComponent(c.id));
    } catch (e) {
      s.erreur = e.regle ? e.message : "Erreur : " + e.message;
      if (!e.regle) console.error(e);
      rendre();
    }
  };

  // ------------------------------------------------------------------ Écran d'un concours

  const vues = {}; // état d'affichage par concours : onglet, recherche, éditions
  function vueDe(c) { return vues[c.id] || (vues[c.id] = { onglet: null, recherche: "", edition: {} }); }

  function vueConcours(c) {
    const v = vueDe(c), etat = M.etat(c);
    const droite = '<button class="icone" data-a="annuler" data-id="' + esc(c.id) + '"' + (peutAnnuler(c.id) ? "" : " disabled") + ' aria-label="Annuler la dernière action" title="Annuler">↶</button>' +
      '<button class="icone" data-a="menu-concours" data-id="' + esc(c.id) + '" aria-label="Menu">⋯</button>';
    let h = barre(c.nom, M.TYPES[c.type].libelle + " · " + etat, btnRetour, droite) + "<main>";
    if (c.melee) h += vueMelee(c, c.melee, v);
    else if (c.championnat) h += vueChampionnat(c, c.championnat, v);
    else if (c.repechage) h += vueRepechage(c, c.repechage, v);
    return h + "</main>";
  }
  actions.annuler = (el) => { const c = concours[el.dataset.id]; if (c) annuler(c); };
  actions["menu-concours"] = (el) => {
    const c = concours[el.dataset.id];
    dialogue(null, '<div class="menu-liste">' +
      '<button data-a="c-renommer" data-id="' + esc(c.id) + '">✎ Renommer le concours</button>' +
      '<button data-a="c-terrains" data-id="' + esc(c.id) + '">🅿︎ Terrains' + (c.terrains ? " (" + c.terrains + ")" : " (désactivé)") + "</button>" +
      '<button data-a="c-imprimer" data-id="' + esc(c.id) + '">🖨 Imprimer / PDF</button>' +
      '<button data-a="c-exporter" data-id="' + esc(c.id) + '">💾 Exporter ce concours</button>' +
      '<button class="rouge" data-a="c-supprimer" data-id="' + esc(c.id) + '">🗑 Supprimer le concours</button></div>', [{ texte: "Fermer", classe: "texte" }]);
  };
  actions["c-renommer"] = (el) => {
    const c = concours[el.dataset.id];
    demanderTexte("Renommer le concours", c.nom, (n) => {
      n = n.trim();
      if (!n) { toast("Donne un nom au concours"); return false; }
      agir(c, () => { c.nom = n; });
    });
  };
  actions["c-terrains"] = (el) => {
    const c = concours[el.dataset.id];
    dialogue("Terrains", "<p>Chaque match à jouer reçoit le premier terrain libre ; s'il n'y en a plus, il attend qu'un terrain se libère.</p>" +
      '<label class="champ"><span>Nombre de terrains (vide = désactivé)</span><input class="saisie" id="dlg-ter" inputmode="numeric" pattern="[0-9]*" value="' + esc(c.terrains || "") + '"></label>', [
      { texte: "Enregistrer", classe: "plein", action: () => {
        const t = $("#dlg-ter").value.trim(), n = parseInt(t, 10);
        if (t && !(n >= 1)) { toast("Indique un nombre de terrains (1 minimum)"); return false; }
        agir(c, () => { c.terrains = t ? n : null; });
      } },
      { texte: "Annuler", classe: "texte" }
    ]);
  };
  actions["c-exporter"] = (el) => {
    const c = concours[el.dataset.id];
    partagerFichier(c.nom.replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/\s+/g, "-") + ".json",
      '{"application":"Petanque Manager","version":1,"concours":[' + M.versJson(c) + '],"clubs":[]}');
  };
  actions["c-supprimer"] = (el) => {
    const c = concours[el.dataset.id];
    confirmer("Supprimer « " + c.nom + " » ?", "Le concours sera effacé de cet appareil. Cette action est définitive.", "Supprimer", () => {
      supprimerStock(c.id);
      toast("Concours supprimé");
      setTimeout(() => location.replace(c.clubId && clubDe(c.clubId) ? "#/club/" + c.clubId : "#/"), 0);
    }, true);
  };

  // Carte de match avec saisie du score (mêlée, tête-à-tête, équipes formées)
  function carteScore(c, v, cle, nomA, nomB, p, etiquette) {
    const fini = M.partieTerminee(p), edition = !!v.edition[cle];
    const ga = fini && p.scoreA > p.scoreB, gb = fini && p.scoreB > p.scoreA;
    const t = texteTerrain(p.terrain);
    let h = '<div class="match' + (!fini ? " a-jouer" : "") + '"><div class="tete"><span>' + esc(etiquette) + "</span>" + (t ? '<span class="ter">' + esc(t) + "</span>" : "") + "</div>";
    const idx = registre.push({ c: c, p: p, cle: cle }) - 1;
    if (!fini || edition) {
      h += '<div class="eq"><span class="nom">' + esc(nomA) + '</span><input class="saisie" id="sa-' + idx + '" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="' + (edition ? p.scoreA : "") + '" aria-label="Score de ' + esc(nomA) + '"></div>';
      h += '<div class="eq"><span class="nom">' + esc(nomB) + '</span><input class="saisie" id="sb-' + idx + '" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="' + (edition ? p.scoreB : "") + '" aria-label="Score de ' + esc(nomB) + '"></div>';
      h += '<div class="valider rangee"><button class="btn plein" data-a="score" data-m="' + idx + '">' + (edition ? "Enregistrer la correction" : "Valider le score") + "</button>" +
        (edition ? '<button class="btn texte" data-a="score-annuler" data-m="' + idx + '">Annuler</button>' : "") + "</div>";
      h += '<div class="astuce">Astuce : tape seulement le score du perdant, le gagnant aura 13.</div>';
    } else {
      h += '<div class="eq' + (ga ? " gagne" : " perd") + '"><span class="nom">' + esc(nomA) + '</span><span class="sc">' + p.scoreA + "</span></div>";
      h += '<div class="eq' + (gb ? " gagne" : " perd") + '"><span class="nom">' + esc(nomB) + '</span><span class="sc">' + p.scoreB + "</span></div>";
      h += '<div class="valider"><button class="btn texte" data-a="score-modifier" data-m="' + idx + '">✎ Modifier le score</button></div>';
    }
    return h + "</div>";
  }
  actions.score = (el) => {
    const r = registre[+el.dataset.m]; if (!r) return;
    const ta = $("#sa-" + el.dataset.m).value.trim(), tb = $("#sb-" + el.dataset.m).value.trim();
    let a = ta === "" ? null : parseInt(ta, 10), b = tb === "" ? null : parseInt(tb, 10);
    if (a === null && b !== null && b < 13) a = 13;
    else if (b === null && a !== null && a < 13) b = 13;
    if (a === null || b === null || isNaN(a) || isNaN(b) || !M.scoreValide(a, b)) { toast("Score invalide : le vainqueur a 13, l'autre entre 0 et 12"); return; }
    const v = vueDe(r.c);
    delete v.edition[r.cle];
    agir(r.c, () => M.enregistrerPartie(r.p, a, b));
  };
  actions["score-modifier"] = (el) => { const r = registre[+el.dataset.m]; vueDe(r.c).edition[r.cle] = true; rendre(); };
  actions["score-annuler"] = (el) => { const r = registre[+el.dataset.m]; delete vueDe(r.c).edition[r.cle]; rendre(); };

  function tableauClassement(stats, colonne, final) {
    let h = '<table class="classement"><thead><tr><th>#</th><th>' + colonne + "</th><th>V</th><th>+/−</th><th>Pts</th></tr></thead><tbody>";
    let rang = 0;
    stats.forEach((s, i) => {
      const p = stats[i - 1];
      if (!p || p.victoires !== s.victoires || p.difference !== s.difference || p.pointsPour !== s.pointsPour) rang = i + 1;
      h += '<tr class="' + (final && rang === 1 ? "p1" : "") + '"><td>' + rang + "</td><td>" + esc(s.joueur.nom) + (s.blancs ? ' <span class="puce">blanc</span>' : "") + "</td><td>" + s.victoires + "</td><td>" + (s.difference > 0 ? "+" : "") + s.difference + "</td><td>" + s.pointsPour + "</td></tr>";
    });
    return h + "</tbody></table>";
  }

  function vueMelee(c, m, v) {
    const tour = m.tours[m.tours.length - 1], fini = M.meleeTermine(m), col = M.equipesFormees(c.type) ? "Équipe" : "Joueur";
    let h = '<div class="etat-concours"><span class="gros">' + (fini ? "Concours terminé" : "Partie " + m.tours.length + " sur " + m.nbTours) + "</span>" +
      (m.gagnantContreGagnant ? '<span class="puce or">Gagnant contre gagnant</span>' : "") + (c.terrains ? '<span class="puce">' + pluriel(c.terrains, "terrain") + "</span>" : "") + "</div>";
    if (fini) {
      const cl = M.classementMelee(m);
      h += '<div class="podium">' + [1, 0, 2].map((i) => cl[i] ? "<div><span class=\"med\">" + ["🥇", "🥈", "🥉"][i] + "</span>" + esc(cl[i].joueur.nom) + "</div>" : "<div style=\"visibility:hidden\"></div>").join("") + "</div>";
      h += "<h2>Classement général</h2>" + tableauClassement(cl, col, true);
      h += '<div style="margin-top:12px"><button class="btn tonal large" data-a="c-imprimer" data-id="' + esc(c.id) + '">🖨 Imprimer / PDF du classement</button></div>';
    }
    if (tour) {
      if (fini) h += "<h2>Dernière partie</h2>";
      tour.parties.forEach((p, i) => { h += carteScore(c, v, tour.numero + "-" + i, noms(p.equipeA), noms(p.equipeB), p, "Match " + (i + 1)); });
      if (tour.joueurBlanc) h += '<div class="blanc-ligne"><b>' + esc(tour.joueurBlanc.nom) + "</b> : blanc, gagne d'office 13-7</div>";
      if (!fini && tour.parties.every(M.partieTerminee) && m.tours.length < m.nbTours) {
        h += '<button class="btn plein large" data-a="tour-suivant" data-id="' + esc(c.id) + '">' + (m.gagnantContreGagnant ? "Partie suivante (gagnants contre gagnants)" : "Partie suivante (tirage au sort)") + "</button>";
      }
    }
    if (!fini) h += "<h2>Classement provisoire</h2>" + tableauClassement(M.classementMelee(m), col, false);
    if (m.tours.length > 1) {
      h += '<details class="section"><summary>Parties précédentes</summary>';
      m.tours.slice(0, -1).reverse().forEach((t) => {
        h += "<h3>Partie " + t.numero + "</h3>";
        t.parties.forEach((p) => {
          h += '<div class="match"><div class="eq' + (p.scoreA > p.scoreB ? " gagne" : " perd") + '"><span class="nom">' + esc(noms(p.equipeA)) + '</span><span class="sc">' + p.scoreA + '</span></div><div class="eq' +
            (p.scoreB > p.scoreA ? " gagne" : " perd") + '"><span class="nom">' + esc(noms(p.equipeB)) + '</span><span class="sc">' + p.scoreB + "</span></div></div>";
        });
        if (t.joueurBlanc) h += '<div class="blanc-ligne">' + esc(t.joueurBlanc.nom) + " : blanc (13-7)</div>";
      });
      h += "</details>";
    }
    return h;
  }
  actions["tour-suivant"] = (el) => { const c = concours[el.dataset.id]; agir(c, () => M.tourSuivant(c.melee)); window.scrollTo(0, 0); };

  // Match « qui a gagné ? » (championnat, repêchage, tableaux)
  function carteGagnant(c, ref, etiquette, surligne) {
    const m = ref.m, tab = ref.type === "tab";
    const a = m.a, b = m.b;
    const v = tab ? M.mtVainqueur(m) : M.vainqueur(m);
    const jouable = tab ? M.mtJouable(m) : (a && b && !M.estBlanc(a) && !M.estBlanc(b));
    const t = jouable && !v ? texteTerrain(m.terrain) : null;
    const idx = registre.push(Object.assign({ c: c }, ref)) - 1;
    function ligne(e, attente, sc) {
      if (!e) return '<div class="eq"><span class="nom attente">' + esc(attente || "À venir") + "</span></div>";
      const g = v && v.id === e.id && jouable, p = v && v.id !== e.id && jouable;
      return '<div class="eq' + (g ? " gagne" : p ? " perd" : "") + '"><span class="nom">' + esc(M.estBlanc(e) ? "Blanc" : nomEquipe(e)) + "</span>" + (sc !== null && sc !== undefined && jouable ? '<span class="sc">' + sc + "</span>" : "") + "</div>";
    }
    let pied;
    if (tab && m.estExempt) pied = (a || b) ? "Qualifiée d'office (exempt)" : "Place vide";
    else if (!tab && (M.estBlanc(a) || M.estBlanc(b))) pied = "Contre un blanc : gagné d'office 13-7";
    else if (!jouable) pied = "En attente des résultats précédents";
    else if (v) pied = "✎ Modifier le résultat";
    else pied = "Toucher pour indiquer le gagnant";
    const surl = surligne && ((a && surligne.has(a.id)) || (b && surligne.has(b.id)));
    const cls = "match" + (jouable && !v ? " a-jouer" : "") + (surl ? " surligne" : "");
    const debut = jouable ? '<button class="' + cls + '" data-a="gagnant" data-m="' + idx + '">' : '<div class="' + cls + '">';
    let h = debut + '<div class="tete"><span>' + esc(etiquette) + "</span>" + (t ? '<span class="ter">' + esc(t) + "</span>" : "") + "</div>";
    if (tab && m.estExempt) h += ligne(a || b, "—");
    else {
      h += ligne(a, tab && !a && m.cleA !== undefined && m.cleA !== null ? M.libelleProvenance(m.cleA) : null, m.scoreA);
      h += ligne(b, tab && !b && m.cleB !== undefined && m.cleB !== null ? M.libelleProvenance(m.cleB) : null, m.scoreB);
    }
    h += '<div class="pied' + (jouable && !v ? " action" : "") + '">' + esc(pied) + "</div>";
    return h + (jouable ? "</button>" : "</div>");
  }
  actions.gagnant = (el) => {
    const r = registre[+el.dataset.m]; if (!r) return;
    const m = r.m, fait = r.type === "tab" ? !!M.mtVainqueur(m) : M.termine(m);
    const choisir = (g) => {
      agir(r.c, () => {
        if (r.type === "tab") M.tableauEnregistrerVictoire(r.t, r.r, r.i, g);
        else if (r.poule) M.pouleEnregistrerVictoire(r.poule, m, g);
        else M.enregistrerVictoire(m, g);
      });
    };
    dialogue(fait ? "Modifier le résultat" : "Qui a gagné ?",
      fait ? "<p>Si le gagnant change, les matchs suivants concernés sont remis à zéro et les équipes déplacées dans les tableaux.</p>" : "",
      [{ texte: nomEquipe(m.a), classe: "tonal gagnant-btn", action: () => choisir(true) },
        { texte: nomEquipe(m.b), classe: "tonal gagnant-btn", action: () => choisir(false) },
        { texte: "Annuler", classe: "texte" }]);
  };

  function nomTour(nbMatchs) { return nbMatchs === 1 ? "Finale" : nbMatchs === 2 ? "Demi-finales" : nbMatchs === 4 ? "Quarts de finale" : "1/" + nbMatchs + " de finale"; }
  function vueTableau(c, t, surligne, sousTitre) {
    let h = "";
    const ch = M.champion(t);
    if (ch) h += '<div class="champion"><span>🏆</span><div>Vainqueur ' + (t.nom.length === 1 ? "du tableau " + esc(t.nom) : "du " + esc(t.nom)) + "<br>" + esc(nomEquipe(ch)) + "</div></div>";
    if (sousTitre) h += '<p class="aide">' + esc(sousTitre) + "</p>";
    t.tours.forEach((tr, r) => {
      const n = tr.length;
      const vis = tr.map((m, i) => ({ m, i })).filter((x) => !(x.m.estExempt && !x.m.a && !x.m.b));
      if (!vis.length) return;
      h += "<h3>" + nomTour(n) + "</h3>";
      vis.forEach((x) => { h += carteGagnant(c, { type: "tab", m: x.m, t: t, r: r, i: x.i }, "Match " + (x.i + 1), surligne); });
    });
    return h;
  }

  // Recherche d'une équipe (championnat, repêchage, cascade)
  function champRecherche(c, v) {
    return '<div class="recherche"><input class="saisie" type="search" id="recherche" data-id="' + esc(c.id) + '" value="' + esc(v.recherche) + '" placeholder="Chercher une équipe (n° ou nom)" autocomplete="off"></div>';
  }
  let minuteurRecherche = null;
  document.addEventListener("input", (ev) => {
    if (ev.target.id !== "recherche") return;
    const c = concours[ev.target.dataset.id]; if (!c) return;
    vueDe(c).recherche = ev.target.value;
    clearTimeout(minuteurRecherche);
    minuteurRecherche = setTimeout(() => {
      rendre();
      const i = $("#recherche"); if (i) { i.focus(); const l = i.value.length; try { i.setSelectionRange(l, l); } catch (e) { /* */ } }
    }, 250);
  });
  function equipesTrouvees(equipes, q) {
    q = q.trim().toLowerCase().replace(/^n°\s*/, "");
    if (!q) return [];
    return equipes.filter((e) => String(e.id) === q || e.nom.toLowerCase().indexOf(q) >= 0 || (e.club || "").toLowerCase().indexOf(q) >= 0).slice(0, 6);
  }
  function concerne(m, e) { return (m.a && m.a.id === e.id) || (m.b && m.b.id === e.id); }
  function etatPour(m, e, tab) {
    const adv = m.a && m.a.id === e.id ? m.b : m.a;
    const v = tab ? M.mtVainqueur(m) : M.vainqueur(m);
    if (tab && m.estExempt) return "qualifiée d'office (exempt)";
    if (!adv) return "attend son adversaire";
    if (M.estBlanc(adv)) return "blanc (gagné d'office)";
    if (v) return (v.id === e.id ? "gagné contre n°" : "perdu contre n°") + adv.id;
    const t = texteTerrain(m.terrain);
    return "contre n°" + adv.id + (t ? " · " + t : "") + " (à jouer)";
  }

  function ongletsHtml(c, v, liste) {
    if (!v.onglet || !liste.some((o) => o[0] === v.onglet)) v.onglet = liste[0][0];
    return '<div class="onglets" role="tablist">' + liste.map((o) => '<button class="' + (o[0] === v.onglet ? "actif" : "") + '" data-a="onglet" data-id="' + esc(c.id) + '" data-v="' + o[0] + '">' + esc(o[1]) + "</button>").join("") + "</div>";
  }
  actions.onglet = (el) => { vueDe(concours[el.dataset.id]).onglet = el.dataset.v; rendre(); window.scrollTo(0, 0); };

  // --- Championnat
  function vueChampionnat(c, ch, v) {
    const toutes = [];
    ch.poules.forEach((p) => p.equipes.forEach((e) => toutes.push(e)));
    toutes.sort((a, b) => a.id - b.id);
    const forfaits = M.forfaitsDe(ch);
    const poulesFinies = ch.poules.filter(M.pouleTermine).length;
    let h = '<div class="etat-concours"><span class="gros">' + esc(M.etat(c)) + '</span><span class="puce">' + pluriel(toutes.length, "équipe") + '</span><span class="puce">' + poulesFinies + "/" + ch.poules.length + " poules finies</span></div>";
    h += champRecherche(c, v);
    const trouvees = equipesTrouvees(toutes, v.recherche);
    const surligne = trouvees.length ? new Set(trouvees.map((e) => e.id)) : null;
    if (v.recherche.trim()) {
      if (!trouvees.length) h += '<div class="fiche">Aucune équipe trouvée.</div>';
      trouvees.forEach((e) => {
        const p = ch.poules.find((x) => x.equipes.some((y) => y.id === e.id));
        h += '<div class="fiche"><b>' + esc(nomEquipe(e)) + (forfaits.indexOf(e.id) >= 0 ? " · forfait" : "") + "</b>";
        if (p) M.pouleMatchs(p).forEach((m, i) => { if (concerne(m, e)) h += "<div>Poule " + p.numero + " · " + ["Tour 1", "Tour 1", "Gagnants", "Perdants", "Barrage"][i] + " : " + esc(etatPour(m, e, false)) + "</div>"; });
        [ch.general, ch.consolante].filter(Boolean).forEach((t) => t.tours.forEach((tr) => tr.forEach((m) => { if (concerne(m, e)) h += "<div>" + esc(t.nom) + " · " + nomTour(tr.length) + " : " + esc(etatPour(m, e, true)) + "</div>"; })));
        h += "</div>";
      });
    }
    h += ongletsHtml(c, v, [["poules", "Poules"], ["general", "Général"]].concat(ch.consolante ? [["consolante", "Consolante"]] : []).concat([["equipes", "Équipes"]]));
    if (v.onglet === "poules") {
      h += '<div class="grille-poules">';
      ch.poules.forEach((p) => {
        const fin = M.pouleTermine(p);
        h += '<div class="poule"><div class="ent"><b>Poule ' + p.numero + '</b><span class="puce ' + (fin ? "verte" : "orange") + '">' + (fin ? "Terminée" : "En cours") + "</span></div>";
        const etiq = ["Tour 1", "Tour 1", "Gagnants", "Perdants", "Barrage"];
        [p.tour1[0], p.tour1[1], p.matchGagnants, p.matchPerdants, p.barrage].forEach((m, i) => {
          if (m) h += carteGagnant(c, { type: "simple", m: m, poule: p }, etiq[i], surligne);
          else if (i >= 2) h += '<div class="match"><div class="tete"><span>' + etiq[i] + '</span></div><div class="pied">Après ' + (i === 4 ? "les matchs gagnants et perdants" : "le tour 1") + "</div></div>";
        });
        const g = [M.qualifieDirect(p), p.barrage ? M.vainqueur(p.barrage) : null].filter(Boolean);
        const co = [p.barrage ? M.perdant(p.barrage) : null, M.elimineDirect(p)].filter(Boolean);
        if (g.length || co.length) h += '<div class="sorties">' + (g.length ? "Général : " + g.map((e) => "n°" + e.id).join(", ") : "") + (g.length && co.length ? " · " : "") + (co.length ? "Consolante : " + co.map((e) => "n°" + e.id).join(", ") : "") + "</div>";
        h += "</div>";
      });
      h += "</div>";
    } else if (v.onglet === "general") h += vueTableau(c, ch.general, surligne, "Les équipes prennent leur place dès qu'elles sortent de leur poule.");
    else if (v.onglet === "consolante") h += vueTableau(c, ch.consolante, surligne, "Équipes battues au barrage et équipes 0-2.");
    else h += vueEquipes(c, toutes, forfaits);
    if (M.champTermine(ch)) h += '<div style="margin-top:14px"><button class="btn tonal large" data-a="c-imprimer" data-id="' + esc(c.id) + '">🖨 Imprimer / PDF des résultats</button></div>';
    return h;
  }

  // --- Repêchage / cascade
  function libelleGroupe(nom, cascade) {
    if (nom === "A") return "2 victoires";
    if (cascade) return nom === "B" ? "1-1, gagnants du tour 3" : "0-2 gagnants + 1-1 perdants du tour 3";
    return nom === "B" ? "1 victoire" : "aucune victoire";
  }
  function vueRepechage(c, r, v) {
    const forfaits = M.forfaitsDe(r), toutes = r.equipes.slice().sort((a, b) => a.id - b.id);
    let h = '<div class="etat-concours"><span class="gros">' + esc(M.repPhase(r)) + '</span><span class="puce">' + pluriel(r.equipes.length, "équipe") + "</span></div>";
    h += champRecherche(c, v);
    const trouvees = equipesTrouvees(toutes, v.recherche);
    const surligne = trouvees.length ? new Set(trouvees.map((e) => e.id)) : null;
    const tours = [["Tour 1", r.tour1], ["Tour 2", r.tour2], ["Tour 3", r.tour3B.concat(r.tour3C)]];
    if (v.recherche.trim()) {
      if (!trouvees.length) h += '<div class="fiche">Aucune équipe trouvée.</div>';
      trouvees.forEach((e) => {
        h += '<div class="fiche"><b>' + esc(nomEquipe(e)) + (forfaits.indexOf(e.id) >= 0 ? " · forfait" : "") + "</b>";
        tours.forEach((x) => x[1].forEach((m) => { if (concerne(m, e)) h += "<div>" + x[0] + " : " + esc(etatPour(m, e, false)) + "</div>"; }));
        M.repTableaux(r).forEach((t) => {
          let dedans = false;
          t.tours.forEach((tr) => tr.forEach((m) => { if (concerne(m, e)) { dedans = true; h += "<div>Tableau " + t.nom + " · " + nomTour(tr.length) + " : " + esc(etatPour(m, e, true)) + "</div>"; } }));
          if (!dedans && t.tours[0].some((m) => concerne(m, e))) h += "<div>Tableau " + t.nom + "</div>";
        });
        h += "</div>";
      });
    }
    const ong = [["parties", "Parties"]];
    M.repTableaux(r).forEach((t) => ong.push([t.nom, "Tableau " + t.nom]));
    ong.push(["equipes", "Équipes"]);
    h += ongletsHtml(c, v, ong);
    if (v.onglet === "parties") {
      h += '<p class="aide">' + (r.cascade ? "Cascade : tour 1, puis les gagnants entre eux et les perdants entre eux. 2-0 : tableau A. 1-1 : tour 3 entre eux (gagnants au B, perdants au C). 0-2 : tour 3 entre eux (perdants éliminés, gagnants au C)."
        : "Tour 1 au hasard, puis les gagnants entre eux et les perdants entre eux. Ensuite : 2 victoires = tableau A, 1 victoire = tableau B, aucune victoire = tableau C.") + "</p>";
      h += "<h2>Tour 1 <span class=\"nb\">· " + r.tour1.filter(M.termine).length + "/" + r.tour1.length + " joués</span></h2>";
      r.tour1.forEach((m, i) => { h += carteGagnant(c, { type: "simple", m: m }, "Match " + (i + 1), surligne); });
      h += "<h2>Tour 2 <span class=\"nb\">" + (r.tour2.length ? "· " + r.tour2.filter(M.termine).length + "/" + r.tour2.length + " joués" : "(après le tour 1)") + "</span></h2>";
      if (!r.tour2.length) h += '<p class="aide">Les matchs du tour 2 apparaissent dès que deux équipes ont gagné (ou perdu) leur match du tour 1 : pas besoin d\'attendre les autres.</p>';
      r.tour2.forEach((m, i) => { h += carteGagnant(c, { type: "simple", m: m }, "Match " + (i + 1), surligne); });
      const att2 = M.enAttenteTour2(r);
      if (att2.length && r.tour2.length) h += '<p class="aide" style="color:var(--sec)">En attente d\'un adversaire : ' + att2.map((e) => "n°" + e.id).join(", ") + "</p>";
      if (r.cascade) {
        const n3 = r.tour3B.length + r.tour3C.length;
        h += "<h2>Tour 3 <span class=\"nb\">" + (n3 ? "· " + r.tour3B.concat(r.tour3C).filter(M.termine).length + "/" + n3 + " joués" : "(après le tour 2)") + "</span></h2>";
        if (!n3) h += '<p class="aide">Les matchs du tour 3 apparaissent dès que deux équipes 1-1 (ou deux équipes 0-2) ont fini leur tour 2.</p>';
        if (r.tour3B.length) { h += "<h3>Équipes 1-1 : le gagnant va au tableau B, le perdant au C</h3>"; r.tour3B.forEach((m, i) => { h += carteGagnant(c, { type: "simple", m: m }, "Match " + (i + 1), surligne); }); }
        if (r.tour3C.length) { h += "<h3>Équipes 0-2 : le perdant est éliminé, le gagnant va au C</h3>"; r.tour3C.forEach((m, i) => { h += carteGagnant(c, { type: "simple", m: m }, "Match " + (r.tour3B.length + i + 1), surligne); }); }
        const att3 = M.enAttenteTour3(r);
        if (att3.length && n3) h += '<p class="aide" style="color:var(--sec)">En attente d\'un adversaire : ' + att3.map((e) => "n°" + e.id).join(", ") + "</p>";
      }
      if (M.tour2Termine(r)) h += '<p class="aide">Tableau A : ' + M.repGroupe(r, 2).length + " équipes · Tableau B : " + M.repGroupe(r, 1).length + " · Tableau C : " + M.repGroupe(r, 0).length + "</p>";
    } else if (v.onglet === "equipes") h += vueEquipes(c, toutes, forfaits);
    else {
      const t = M.repTableaux(r).find((x) => x.nom === v.onglet);
      if (t) h += vueTableau(c, t, surligne, "Tableau " + t.nom + " : " + libelleGroupe(t.nom, r.cascade) + ". Les équipes prennent leur place au fur et à mesure.");
    }
    if (M.repTermine(r)) h += '<div style="margin-top:14px"><button class="btn tonal large" data-a="c-imprimer" data-id="' + esc(c.id) + '">🖨 Imprimer / PDF des résultats</button></div>';
    return h;
  }

  // --- Gestion des équipes : modifier, forfait
  function vueEquipes(c, toutes, forfaits) {
    let h = '<p class="aide">Touche ✎ pour corriger le numéro, le nom ou le club d\'une équipe. Une équipe forfait perd d\'office ses matchs à venir (↶ pour annuler).</p>';
    toutes.forEach((e) => {
      const f = forfaits.indexOf(e.id) >= 0;
      h += '<div class="equipe-l' + (f ? " forfait" : "") + '"><span class="nom"><b>n°' + e.id + "</b> " + esc(e.nom) + (e.club ? "<small>" + esc(e.club) + "</small>" : "") + "</span>" +
        (f ? '<span class="puce orange">Forfait</span>' : '<button class="btn texte" style="color:var(--sec)" data-a="forfait" data-id="' + esc(c.id) + '" data-e="' + e.id + '">Forfait</button>') +
        '<button class="icone" data-a="modif-equipe" data-id="' + esc(c.id) + '" data-e="' + e.id + '" aria-label="Modifier">✎</button></div>';
    });
    return h;
  }
  function trouverEquipe(c, id) {
    const l = c.championnat ? [].concat.apply([], c.championnat.poules.map((p) => p.equipes)) : c.repechage.equipes;
    return l.find((e) => e.id === id);
  }
  actions.forfait = (el) => {
    const c = concours[el.dataset.id], e = trouverEquipe(c, +el.dataset.e);
    confirmer("Forfait de n°" + e.id + " ?", nomEquipe(e) + " perdra d'office tous ses matchs à venir.", "Déclarer forfait", () => {
      agir(c, () => { if (c.championnat) M.champDeclarerForfait(c.championnat, e.id); else M.repDeclarerForfait(c.repechage, e.id); }, "n°" + e.id + " déclarée forfait");
    }, true);
  };
  actions["modif-equipe"] = (el) => {
    const c = concours[el.dataset.id], e = trouverEquipe(c, +el.dataset.e);
    dialogue("Modifier l'équipe n°" + e.id,
      '<label class="champ"><span>Numéro (s\'il est déjà pris, les deux équipes échangent)</span><input class="saisie" id="me-num" inputmode="numeric" pattern="[0-9]*" value="' + e.id + '"></label>' +
      '<label class="champ"><span>Nom</span><input class="saisie" id="me-nom" value="' + esc(e.nom) + '"></label>' +
      '<label class="champ"><span>Club</span><input class="saisie" id="me-club" value="' + esc(e.club || "") + '"></label>', [
        { texte: "Enregistrer", classe: "plein", action: () => {
          const n = parseInt($("#me-num").value, 10), nom = $("#me-nom").value.trim(), club = $("#me-club").value.trim();
          if (!(n >= 1)) { toast("Le numéro doit être supérieur à 0"); return false; }
          const avant = M.versJson(c);
          try {
            const neuf = M.modifierEquipe(c, e.id, n, nom, club || null);
            M.attribuerTerrains(neuf);
            sauver(neuf); empiler(c.id, avant);
            toast("Équipe modifiée");
          } catch (x) { toast(x.message); }
          setTimeout(rendre, 0);
        } },
        { texte: "Annuler", classe: "texte" }
      ]);
  };

  // ------------------------------------------------------------------ Impression / PDF

  actions["c-imprimer"] = (el) => {
    fermerDialogue();
    const c = concours[el.dataset.id];
    const club = c.clubId ? clubDe(c.clubId) : null;
    let h = "<h1>" + esc(c.nom) + '</h1><div class="meta">' + esc(M.TYPES[c.type].libelle) + " · " + dateFr(c.creeLe) + (club ? " · " + esc(club.nom) : "") + " · " + esc(M.etat(c)) + "</div>";
    const td = (x, g) => "<td" + (g ? ' class="g"' : "") + ">" + esc(x) + "</td>";
    if (c.melee) {
      const m = c.melee, col = M.equipesFormees(c.type) ? "Équipe" : "Joueur";
      h += "<h2>Classement" + (M.meleeTermine(m) ? "" : " provisoire") + "</h2><table><tr><th>#</th><th>" + col + "</th><th>Parties</th><th>Victoires</th><th>+/−</th><th>Points</th></tr>";
      let rang = 0;
      const cl = M.classementMelee(m);
      cl.forEach((s, i) => {
        const p = cl[i - 1];
        if (!p || p.victoires !== s.victoires || p.difference !== s.difference || p.pointsPour !== s.pointsPour) rang = i + 1;
        h += "<tr>" + td(rang) + td(s.joueur.nom, rang === 1) + td(s.parties) + td(s.victoires) + td((s.difference > 0 ? "+" : "") + s.difference) + td(s.pointsPour) + "</tr>";
      });
      h += "</table>";
      m.tours.forEach((t) => {
        h += "<h2>Partie " + t.numero + "</h2><table>";
        t.parties.forEach((p) => { h += "<tr>" + td(noms(p.equipeA), p.scoreA > p.scoreB) + td(M.partieTerminee(p) ? p.scoreA + " - " + p.scoreB : "à jouer") + td(noms(p.equipeB), p.scoreB > p.scoreA) + "</tr>"; });
        if (t.joueurBlanc) h += "<tr>" + td(t.joueurBlanc.nom, true) + td("13 - 7") + td("Blanc") + "</tr>";
        h += "</table>";
      });
    } else {
      const ligneMatch = (m, tab) => {
        const v = tab ? M.mtVainqueur(m) : M.vainqueur(m);
        const nomOu = (e, cle) => e ? (M.estBlanc(e) ? "Blanc" : nomEquipe(e)) : (cle !== undefined && cle !== null ? M.libelleProvenance(cle) : "—");
        if (tab && m.estExempt) return "<tr>" + td(nomOu(m.a || m.b), true) + td("exempt") + td("") + "</tr>";
        return "<tr>" + td(nomOu(m.a, m.cleA), v && m.a && v.id === m.a.id) + td(v ? (m.scoreA != null ? m.scoreA + " - " + m.scoreB : "gagné par n°" + v.id) : "à jouer") + td(nomOu(m.b, m.cleB), v && m.b && v.id === m.b.id) + "</tr>";
      };
      const tableau = (t) => {
        if (!t) return "";
        const ch = M.champion(t);
        let x = "<h2>Tableau " + esc(t.nom) + (ch ? " · vainqueur : " + esc(nomEquipe(ch)) : "") + "</h2>";
        t.tours.forEach((tr) => {
          const vis = tr.filter((m) => !(m.estExempt && !m.a && !m.b));
          if (!vis.length) return;
          x += "<table><tr><th colspan=3>" + nomTour(tr.length) + "</th></tr>" + vis.map((m) => ligneMatch(m, true)).join("") + "</table>";
        });
        return x;
      };
      if (c.championnat) {
        c.championnat.poules.forEach((p) => {
          h += "<h2>Poule " + p.numero + "</h2><table>" + M.pouleMatchs(p).map((m) => ligneMatch(m, false)).join("") + "</table>";
        });
        h += tableau(c.championnat.general) + tableau(c.championnat.consolante);
      } else {
        const r = c.repechage;
        [["Tour 1", r.tour1], ["Tour 2", r.tour2], ["Tour 3", r.tour3B.concat(r.tour3C)]].forEach((x) => {
          if (x[1].length) h += "<h2>" + x[0] + "</h2><table>" + x[1].map((m) => ligneMatch(m, false)).join("") + "</table>";
        });
        M.repTableaux(r).forEach((t) => { h += tableau(t); });
      }
    }
    h += '<div class="meta" style="margin-top:12pt">Pétanque Manager · ' + new Date().toLocaleString("fr-FR") + "</div>";
    $("#impression").innerHTML = h;
    setTimeout(() => window.print(), 50);
  };

  // ------------------------------------------------------------------ Clubs

  function vueNouveauClub() {
    let h = barre("Nouveau club", null, btnRetour) + "<main>";
    h += '<label class="champ"><span>Nom du club</span><input class="saisie" id="nc-nom" placeholder="Pétanque Club" autocomplete="off"></label>';
    h += '<label class="champ"><span>Joueurs (un par ligne, facultatif)</span><textarea class="saisie" id="nc-joueurs" rows="8"></textarea></label>';
    h += '<button class="btn plein large" data-a="nc-creer">Créer le club</button></main>';
    apresRenduFns.push(() => { const i = $("#nc-nom"); if (i) i.focus(); });
    return h;
  }
  actions["nc-creer"] = () => {
    const nom = $("#nc-nom").value.trim();
    if (!nom) { toast("Donne un nom au club"); return; }
    const joueurs = $("#nc-joueurs").value.split(/\n|,|;/).map((x) => x.trim()).filter(Boolean);
    const cl = { id: uuid(), nom: nom, joueurs: joueurs, creeLe: Date.now() };
    clubs.push(cl); sauverClubs();
    location.replace("#/club/" + cl.id);
  };

  function vueClub(cl) {
    const tous = listeConcours().filter((c) => c.clubId === cl.id);
    const pts = cl.pointsParticipation === undefined || cl.pointsParticipation === null ? 5 : cl.pointsParticipation;
    let h = barre(cl.nom, pluriel(cl.joueurs.length, "joueur") + " · " + pluriel(tous.length, "concours", "concours"), btnRetour,
      '<button class="icone" data-a="menu-club" data-id="' + esc(cl.id) + '" aria-label="Menu">⋯</button>') + "<main>";
    h += '<button class="btn plein large" data-a="nouveau" data-club="' + esc(cl.id) + '">＋ Nouveau concours du club</button>';
    const cc = M.classementClub(cl, tous);
    h += '<h2>Classement général <span class="nb">· ' + pluriel(cc.concours.length, "concours terminé", "concours terminés") + "</span></h2>";
    if (!cc.stats.length) h += '<div class="vide">Le classement se remplit avec les concours terminés du club<br>(tête-à-tête et mêlée).</div>';
    else {
      h += '<table class="classement"><thead><tr><th>#</th><th>Joueur</th><th>Conc.</th><th>V</th><th>+/−</th><th>Pts</th></tr></thead><tbody>' +
        cc.stats.map((s) => '<tr class="' + (s.rang === 1 ? "p1" : "") + '"><td>' + s.rang + "</td><td>" + esc(s.nom) + "</td><td>" + s.concours + "</td><td>" + s.victoires + "</td><td>" + (s.difference > 0 ? "+" : "") + s.difference + "</td><td>" + s.pointsPour + "</td></tr>").join("") + "</tbody></table>";
      h += '<p class="aide">Ordre : victoires, puis différence de points (participation comprise), puis points marqués.</p>';
    }
    h += '<label class="interrupteur"><span class="txt"><b>Points de participation</b><small>Ajoutés à la différence de chaque joueur, par concours joué.</small></span><input class="saisie" style="width:80px;text-align:center" id="club-pts" data-id="' + esc(cl.id) + '" inputmode="numeric" pattern="[0-9]*" value="' + pts + '"></label>';
    h += '<details class="section"><summary>Joueurs <span class="nb">· ' + cl.joueurs.length + "</span></summary>";
    h += '<textarea class="saisie" id="club-ajout" rows="3" placeholder="Ajouter des joueurs (un par ligne)"></textarea><div style="margin:8px 0 12px"><button class="btn tonal large" data-a="club-ajouter" data-id="' + esc(cl.id) + '">Ajouter</button></div>';
    cl.joueurs.forEach((j, i) => {
      h += '<div class="equipe-l"><span class="nom">' + esc(j) + '</span><button class="icone" data-a="club-renommer" data-id="' + esc(cl.id) + '" data-i="' + i + '" aria-label="Renommer">✎</button><button class="icone" data-a="club-retirer" data-id="' + esc(cl.id) + '" data-i="' + i + '" aria-label="Retirer">✕</button></div>';
    });
    h += "</details>";
    h += '<h2>Concours du club <span class="nb">· ' + tous.length + "</span></h2>" + (tous.length ? tous.map(carteConcours).join("") : '<div class="vide">Aucun concours pour l\'instant.</div>');
    return h + "</main>";
  }
  document.addEventListener("change", (ev) => {
    if (ev.target.id !== "club-pts") return;
    const cl = clubDe(ev.target.dataset.id), n = parseInt(ev.target.value, 10);
    if (!cl) return;
    cl.pointsParticipation = isNaN(n) ? 5 : Math.max(0, Math.min(99, n));
    sauverClubs(); rendre();
  });
  actions["club-ajouter"] = (el) => {
    const cl = clubDe(el.dataset.id);
    const l = $("#club-ajout").value.split(/\n|,|;/).map((x) => x.trim()).filter(Boolean);
    if (!l.length) return;
    cl.joueurs = cl.joueurs.concat(l); sauverClubs(); toast(pluriel(l.length, "joueur ajouté", "joueurs ajoutés")); rendre();
    const d = document.querySelector("details.section"); if (d) d.open = true;
  };
  actions["club-renommer"] = (el) => {
    const cl = clubDe(el.dataset.id), i = +el.dataset.i;
    demanderTexte("Renommer le joueur", cl.joueurs[i], (n) => {
      n = n.trim(); if (!n) return false;
      cl.joueurs[i] = n; sauverClubs(); setTimeout(() => { rendre(); const d = document.querySelector("details.section"); if (d) d.open = true; }, 0);
    }, "Les concours déjà créés gardent le nom qu'ils avaient.");
  };
  actions["club-retirer"] = (el) => {
    const cl = clubDe(el.dataset.id), i = +el.dataset.i;
    confirmer("Retirer " + cl.joueurs[i] + " ?", "Le joueur est retiré de la liste du club.", "Retirer", () => {
      cl.joueurs.splice(i, 1); sauverClubs(); setTimeout(() => { rendre(); const d = document.querySelector("details.section"); if (d) d.open = true; }, 0);
    }, true);
  };
  actions["menu-club"] = (el) => {
    const cl = clubDe(el.dataset.id);
    dialogue(null, '<div class="menu-liste"><button data-a="club-nom" data-id="' + esc(cl.id) + '">✎ Renommer le club</button><button class="rouge" data-a="club-suppr" data-id="' + esc(cl.id) + '">🗑 Supprimer le club</button></div>', [{ texte: "Fermer", classe: "texte" }]);
  };
  actions["club-nom"] = (el) => {
    const cl = clubDe(el.dataset.id);
    demanderTexte("Renommer le club", cl.nom, (n) => { n = n.trim(); if (!n) { toast("Donne un nom au club"); return false; } cl.nom = n; sauverClubs(); setTimeout(rendre, 0); });
  };
  actions["club-suppr"] = (el) => {
    const cl = clubDe(el.dataset.id);
    confirmer("Supprimer le club « " + cl.nom + " » ?", "La liste des joueurs et le classement du club sont effacés ; ses concours sont conservés.", "Supprimer", () => {
      clubs = clubs.filter((x) => x.id !== cl.id); sauverClubs(); setTimeout(() => location.replace("#/"), 0);
    }, true);
  };

  // ------------------------------------------------------------------ Démarrage

  window.addEventListener("hashchange", () => { fermerDialogue(); rendre(); });
  window.addEventListener("storage", (e) => { if (e.key && (e.key.indexOf(PREF) === 0 || e.key === CLE_CLUBS)) { chargerTout(); rendre(); } });
  window.addEventListener("error", (e) => { if (e.message) toast("Erreur : " + e.message); });
  try { chargerTout(); } catch (e) { console.error(e); }
  rendre();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  window.PM = { concours: () => concours, clubs: () => clubs }; // pour les tests
})();
