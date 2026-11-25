/*
 * Pétanque Manager – moteur des concours (version web).
 * Portage fidèle du moteur Kotlin des applis Android et Windows : mêmes règles, et MÊME FORMAT JSON,
 * pour qu'une sauvegarde passe d'une appli à l'autre.
 * Les données sont de simples objets (pas de classes) : elles se sauvegardent telles quelles en JSON.
 */
(function (racine) {
  "use strict";

  // ------------------------------------------------------------------ Outils

  const ID_BLANC = -1;
  const POINTS_VICTOIRE = 13, BLANC_GAGNANT = 13, BLANC_PERDANT = 7;

  function erreur(msg) { const e = new Error(msg); e.regle = true; return e; }
  function exiger(cond, msg) { if (!cond) throw erreur(msg); }
  function melanger(l) {
    const a = l.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function hasard(l) { return l.length ? l[Math.floor(Math.random() * l.length)] : null; }
  function cle(a, b) { return a < b ? a + "_" + b : b + "_" + a; }
  function paquets(l, n) { const r = []; for (let i = 0; i < l.length; i += n) r.push(l.slice(i, i + n)); return r; }
  function nn(x) { return x !== null && x !== undefined; }

  function scoreValide(a, b) {
    return (a === POINTS_VICTOIRE && b >= 0 && b < POINTS_VICTOIRE) || (b === POINTS_VICTOIRE && a >= 0 && a < POINTS_VICTOIRE);
  }

  // ------------------------------------------------------------------ Équipes et matchs

  function blanc() { return { id: ID_BLANC, nom: "Blanc" }; }
  function estBlanc(e) { return !!e && e.id === ID_BLANC; }
  function libelle(e) { return estBlanc(e) ? e.nom : "n°" + e.id + " " + e.nom; }

  /** Match entre deux équipes connues ; contre un blanc, la victoire est automatique (13-7). */
  function match(a, b) {
    const m = { a: a, b: b };
    if (estBlanc(b)) { m.scoreA = BLANC_GAGNANT; m.scoreB = BLANC_PERDANT; }
    else if (estBlanc(a)) { m.scoreA = BLANC_PERDANT; m.scoreB = BLANC_GAGNANT; }
    return m;
  }
  function aGagne(m) {
    if (nn(m.victoireA)) return m.victoireA;
    if (nn(m.scoreA) && nn(m.scoreB)) return m.scoreA > m.scoreB;
    return null;
  }
  function termine(m) { return nn(m.victoireA) || (nn(m.scoreA) && nn(m.scoreB)); }
  function vainqueur(m) { const g = aGagne(m); return g === null ? null : (g ? m.a : m.b); }
  function perdant(m) { const g = aGagne(m); return g === null ? null : (g ? m.b : m.a); }
  function enregistrer(m, sa, sb) {
    exiger(scoreValide(sa, sb), "Score invalide : " + sa + "-" + sb + " (13 points pour le vainqueur)");
    m.scoreA = sa; m.scoreB = sb; m.victoireA = null;
  }
  function enregistrerVictoire(m, gagneA) {
    m.victoireA = gagneA;
    if (!estBlanc(m.a) && !estBlanc(m.b)) { m.scoreA = null; m.scoreB = null; }
  }

  // ------------------------------------------------------------------ Mêlée / tête-à-tête / équipes formées

  function creerMelee(joueurs, taille, nbTours, gcg) {
    gcg = !!gcg;
    exiger(!gcg || taille === 1, "Gagnant contre gagnant : équipes formées ou tête-à-tête seulement");
    exiger(taille >= 1 && taille <= 3, "Tête-à-tête (1), doublettes (2) ou triplettes (3)");
    exiger(joueurs.length >= 2, "Il faut au moins 2 joueurs");
    exiger(nbTours >= 1, "Au moins un tour");
    exiger(joueurs.length % 2 === 0 || nbTours <= joueurs.length,
      "Avec " + joueurs.length + " joueurs (nombre impair), " + nbTours + " parties est impossible : personne ne peut avoir le blanc deux fois (maximum " + joueurs.length + ")");
    const n = joueurs.length;
    const npp = Math.floor(n / (2 * taille));
    const cote = Math.floor((n - npp * 2 * taille) / 2);
    const nbPetites = cote > 0 ? 2 : 0;
    const tailles = [];
    for (let i = 0; i < nbPetites; i++) tailles.push(cote);
    for (let i = 0; i < 2 * npp; i++) tailles.push(taille);
    const m = {
      joueurs: joueurs, taille: taille, nbTours: nbTours, gagnantContreGagnant: gcg,
      tours: [], aVenir: [], nbPartiesPleines: npp, tailleCote: cote, unJoueurSeul: n % 2 === 1,
      nbPetites: nbPetites, taillesEquipes: tailles
    };
    if (!gcg) m.aVenir = planifier(m);
    return m;
  }

  function partieTerminee(p) { return nn(p.scoreA) && nn(p.scoreB); }
  function meleeTermine(m) {
    return m.tours.length === m.nbTours && m.tours[m.tours.length - 1].parties.every(partieTerminee);
  }

  function tourSuivant(m) {
    exiger(m.tours.length < m.nbTours, "Tous les tours ont été générés");
    exiger(m.tours.length === 0 || m.tours[m.tours.length - 1].parties.every(partieTerminee), "Le tour précédent n'est pas terminé");
    const t = m.gagnantContreGagnant ? tirerGagnantContreGagnant(m, m.tours.length + 1) : m.aVenir.shift();
    m.tours.push(t);
    return t;
  }

  function enregistrerPartie(p, a, b) {
    exiger(scoreValide(a, b), "Score invalide : " + a + "-" + b + " (13 points pour le vainqueur)");
    p.scoreA = a; p.scoreB = b;
  }

  function tirerGagnantContreGagnant(m, numero) {
    const victoires = {};
    classementMelee(m).forEach(function (s) { victoires[s.joueur.id] = s.victoires; });
    const deja = new Set(), blancs = new Set();
    m.tours.forEach(function (t) {
      t.parties.forEach(function (p) { deja.add(cle(p.equipeA[0].id, p.equipeB[0].id)); });
      if (t.joueurBlanc) blancs.add(t.joueurBlanc.id);
    });
    const ordre = melanger(m.joueurs).sort(function (x, y) {
      const vx = numero === 1 ? 0 : (victoires[x.id] || 0), vy = numero === 1 ? 0 : (victoires[y.id] || 0);
      return vy - vx;
    });

    function apparier(liste, interdire) {
      let budget = 20000;
      const res = [], pris = new Array(liste.length).fill(false);
      function rec() {
        const i = pris.indexOf(false);
        if (i < 0) return true;
        if (--budget < 0) return false;
        pris[i] = true;
        for (let j = i + 1; j < liste.length; j++) {
          if (pris[j]) continue;
          if (interdire && deja.has(cle(liste[i].id, liste[j].id))) continue;
          pris[j] = true; res.push([liste[i], liste[j]]);
          if (rec()) return true;
          res.pop(); pris[j] = false;
        }
        pris[i] = false;
        return false;
      }
      return rec() ? res : null;
    }

    let leBlanc = null, paires = null;
    if (m.unJoueurSeul) {
      let candidats = melanger(ordre).filter(function (j) { return !blancs.has(j.id); });
      if (!candidats.length) candidats = melanger(ordre);
      for (const c of candidats) {
        const p = apparier(ordre.filter(function (j) { return j !== c; }), true);
        if (p) { leBlanc = c; paires = p; break; }
      }
      if (!paires) {
        leBlanc = candidats[0];
        paires = apparier(ordre.filter(function (j) { return j !== leBlanc; }), false);
      }
    } else {
      paires = apparier(ordre, true) || apparier(ordre, false);
    }
    exiger(paires, "Tirage impossible");
    return { numero: numero, parties: paires.map(function (pr) { return { equipeA: [pr[0]], equipeB: [pr[1]] }; }), joueurBlanc: leBlanc };
  }

  function planifier(m) {
    for (let k = 0; k < 100; k++) { const r = planifierUneFois(m); if (r) return r; }
    throw erreur("Impossible de tirer " + m.nbTours + " parties avec " + m.joueurs.length + " joueurs sans qu'un joueur retrouve " +
      "un même partenaire, refasse un tête-à-tête ou ait un second blanc. Essaie avec moins de parties.");
  }

  function planifierUneFois(m) {
    const partenaires = new Set(), adversaires = new Map(), blancs = new Set(), tetes = new Set(), res = [];
    for (let numero = 1; numero <= m.nbTours; numero++) {
      const t = tirerTour(m, numero, partenaires, adversaires, blancs, tetes);
      if (!t) return null;
      res.push(t);
    }
    return res;
  }

  function pairesDe(eq) {
    const r = [];
    for (let i = 0; i < eq.length; i++) for (let j = i + 1; j < eq.length; j++) r.push(cle(eq[i].id, eq[j].id));
    return r;
  }

  function penaliteAdversaires(m, equipes, adversaires) {
    const poids = m.taille === 1 ? 10 : 1;
    let total = 0;
    paquets(equipes, 2).forEach(function (p) {
      if (p.length === 2) for (const x of p[0]) for (const y of p[1]) total += poids * (adversaires.get(cle(x.id, y.id)) || 0);
    });
    return total;
  }

  function tirerTour(m, numero, partenaires, adversaires, blancs, tetes) {
    for (let essai = 0; essai < 4; essai++) {
      let joueurBlanc = null;
      if (m.unJoueurSeul) {
        joueurBlanc = hasard(m.joueurs.filter(function (j) { return !blancs.has(j.id); }));
        if (!joueurBlanc) return null;
      }
      const actifs = m.joueurs.filter(function (j) { return j !== joueurBlanc; });
      const equipes = partitionner(m, actifs, partenaires, tetes);
      if (!equipes) continue;
      const petites = equipes.slice(0, m.nbPetites), grandes = equipes.slice(m.nbPetites);
      let meilleur = grandes, meilleurScore = penaliteAdversaires(m, grandes, adversaires);
      for (let k = 0; k < 300 && meilleurScore !== 0; k++) {
        const e = melanger(grandes), s = penaliteAdversaires(m, e, adversaires);
        if (s < meilleurScore) { meilleur = e; meilleurScore = s; }
      }
      const parties = [];
      paquets(meilleur, 2).forEach(function (p) { parties.push({ equipeA: p[0], equipeB: p[1] }); });
      if (petites.length) parties.push({ equipeA: petites[0], equipeB: petites[1] });
      parties.forEach(function (p) {
        pairesDe(p.equipeA).forEach(function (c) { partenaires.add(c); });
        pairesDe(p.equipeB).forEach(function (c) { partenaires.add(c); });
        for (const x of p.equipeA) for (const y of p.equipeB) { const c = cle(x.id, y.id); adversaires.set(c, (adversaires.get(c) || 0) + 1); }
      });
      if (m.tailleCote === 1 && m.taille !== 1) petites.forEach(function (e) { e.forEach(function (j) { tetes.add(j.id); }); });
      if (joueurBlanc) blancs.add(joueurBlanc.id);
      return { numero: numero, parties: parties, joueurBlanc: joueurBlanc };
    }
    return null;
  }

  function partitionner(m, actifs, partenaires, tetes) {
    const ordre = melanger(actifs), n = ordre.length, utilise = new Array(n).fill(false), equipes = [];
    const tailles = m.taillesEquipes;
    let budget = 5000;
    function remplir(k, courant, debut) {
      if (k === tailles.length) return true;
      if (--budget < 0) return false;
      const t = tailles[k];
      if (courant.length === t) {
        equipes.push(courant.slice());
        if (remplir(k + 1, [], 0)) return true;
        equipes.pop();
        return false;
      }
      const grande = k >= m.nbPetites;
      let ancre = false;
      for (let i = debut; i < n; i++) {
        if (utilise[i]) continue;
        if (grande && courant.length === 0) { if (ancre) break; ancre = true; }
        const j = ordre[i].id;
        if (t === 1 && m.taille !== 1 && tetes.has(j)) continue;
        if (courant.some(function (x) { return partenaires.has(cle(ordre[x].id, j)); })) continue;
        utilise[i] = true; courant.push(i);
        const ok = remplir(k, courant, i + 1);
        courant.pop(); utilise[i] = false;
        if (ok) return true;
        if (budget < 0) return false;
      }
      return false;
    }
    return remplir(0, [], 0) ? equipes.map(function (e) { return e.map(function (i) { return ordre[i]; }); }) : null;
  }

  /** Classement : victoires, puis différence, puis points marqués. Un blanc compte 13-7. */
  function classementMelee(m) {
    const parties = [];
    m.tours.forEach(function (t) { t.parties.forEach(function (p) { if (partieTerminee(p)) parties.push(p); }); });
    const stats = m.joueurs.map(function (j) {
      let nb = 0, v = 0, pour = 0, contre = 0, bl = 0;
      for (const p of parties) {
        const dansA = p.equipeA.some(function (x) { return x.id === j.id; });
        const dansB = p.equipeB.some(function (x) { return x.id === j.id; });
        if (!dansA && !dansB) continue;
        const sj = dansA ? p.scoreA : p.scoreB, sa = dansA ? p.scoreB : p.scoreA;
        nb++; pour += sj; contre += sa; if (sj > sa) v++;
      }
      m.tours.forEach(function (t) {
        if (t.joueurBlanc && t.joueurBlanc.id === j.id) { nb++; v++; bl++; pour += BLANC_GAGNANT; contre += BLANC_PERDANT; }
      });
      return { joueur: j, parties: nb, victoires: v, pointsPour: pour, pointsContre: contre, blancs: bl, difference: pour - contre };
    });
    return stats.sort(function (a, b) {
      return (b.victoires - a.victoires) || (b.difference - a.difference) || (b.pointsPour - a.pointsPour);
    });
  }

  // ------------------------------------------------------------------ Poules (championnat)

  function creerPoule(numero, equipes) {
    exiger(equipes.length >= 3 && equipes.length <= 4, "Une poule contient 3 ou 4 équipes");
    const part = equipes.length === 3 ? equipes.concat([blanc()]) : equipes.slice();
    return { numero: numero, equipes: equipes, participants: part, tour1: [match(part[0], part[1]), match(part[2], part[3])], matchGagnants: null, matchPerdants: null, barrage: null };
  }
  function pouleMatchs(p) { return [p.tour1[0], p.tour1[1], p.matchGagnants, p.matchPerdants, p.barrage].filter(nn); }
  function pouleGarde(ancien, a, b) {
    if (!a || !b) return null;
    if (ancien && ancien.a.id === a.id && ancien.b.id === b.id) return ancien;
    return match(a, b);
  }
  function pouleActualiser(p) {
    p.matchGagnants = pouleGarde(p.matchGagnants, vainqueur(p.tour1[0]), vainqueur(p.tour1[1]));
    p.matchPerdants = pouleGarde(p.matchPerdants, perdant(p.tour1[0]), perdant(p.tour1[1]));
    p.barrage = pouleGarde(p.barrage, p.matchGagnants ? perdant(p.matchGagnants) : null, p.matchPerdants ? vainqueur(p.matchPerdants) : null);
  }
  function pouleEnregistrer(p, m, sa, sb) { enregistrer(m, sa, sb); pouleActualiser(p); }
  function pouleEnregistrerVictoire(p, m, g) { enregistrerVictoire(m, g); pouleActualiser(p); }
  function pouleAppliquerForfaits(p, ids) {
    if (!ids.length) return false;
    let change = false, encore = true;
    while (encore) {
      encore = false;
      for (const m of pouleMatchs(p)) {
        if (termine(m)) continue;
        const fa = ids.indexOf(m.a.id) >= 0, fb = ids.indexOf(m.b.id) >= 0;
        if (fa || fb) { pouleEnregistrerVictoire(p, m, fb); encore = true; change = true; break; }
      }
    }
    return change;
  }
  function pouleTermine(p) { return !!p.barrage && termine(p.barrage); }
  function qualifieDirect(p) { return p.matchGagnants ? vainqueur(p.matchGagnants) : null; }
  function elimineDirect(p) { const e = p.matchPerdants ? perdant(p.matchPerdants) : null; return e && !estBlanc(e) ? e : null; }

  function taillesDePoules(n) {
    const de3 = (4 - n % 4) % 4, de4 = (n - 3 * de3) / 4;
    exiger(n >= 3 && de4 >= 0, "Impossible de former des poules de 3 ou 4 avec " + n + " équipes");
    const r = [];
    for (let i = 0; i < de4; i++) r.push(4);
    for (let i = 0; i < de3; i++) r.push(3);
    return r;
  }
  function tirerPoules(equipes) {
    const tailles = taillesDePoules(equipes.length);
    function decouper(l) { let i = 0; return tailles.map(function (t) { const g = l.slice(i, i + t); i += t; return g; }); }
    function conflits(gs) {
      let n = 0;
      gs.forEach(function (g) { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (g[i].club && g[i].club === g[j].club) n++; });
      return n;
    }
    let meilleur = decouper(melanger(equipes)), score = conflits(meilleur);
    for (let k = 0; k < 500 && score !== 0; k++) {
      const e = decouper(melanger(equipes)), s = conflits(e);
      if (s < score) { meilleur = e; score = s; }
    }
    return meilleur.map(function (g, i) { return creerPoule(i + 1, g); });
  }

  // ------------------------------------------------------------------ Tableaux à élimination directe

  function mtVainqueur(m) {
    if (m.estExempt) return m.a || m.b || null;
    if (!m.a || !m.b) return null;
    if (nn(m.victoireA)) return m.victoireA ? m.a : m.b;
    if (!nn(m.scoreA) || !nn(m.scoreB)) return null;
    return m.scoreA > m.scoreB ? m.a : m.b;
  }
  function mtPerdant(m) { const v = mtVainqueur(m); if (!v || m.estExempt) return null; return v.id === m.a.id ? m.b : m.a; }
  function mtJouable(m) { return !m.estExempt && !!m.a && !!m.b; }
  function mtReinitialiser(m) { m.victoireA = null; m.scoreA = null; m.scoreB = null; }

  function ordreTetesDeSerie(taille) {
    let l = [1];
    while (l.length < taille) { const n = l.length * 2; const s = []; l.forEach(function (x) { s.push(x, n + 1 - x); }); l = s; }
    return l;
  }

  /** places : [{equipe, cle, poule}] */
  function creerTableau(nom, places) {
    exiger(places.length >= 2, "Il faut au moins 2 équipes");
    let taille = 1;
    while (taille < places.length) taille *= 2;
    const premier = paquets(ordreTetesDeSerie(taille), 2).map(function (xy) {
      const pa = places[xy[0] - 1] || null, pb = places[xy[1] - 1] || null;
      return { a: pa ? pa.equipe : null, b: pb ? pb.equipe : null, estExempt: !pa || !pb, cleA: pa ? pa.cle : null, cleB: pb ? pb.cle : null };
    });
    const tours = [premier];
    let n = taille / 2;
    while (n > 1) {
      n /= 2;
      const t = [];
      for (let i = 0; i < n; i++) t.push({ a: null, b: null, estExempt: false });
      tours.push(t);
    }
    const t = { nom: nom, tours: tours };
    propager(t);
    return t;
  }
  function propager(t) {
    for (let r = 0; r < t.tours.length - 1; r++) {
      t.tours[r].forEach(function (m, i) {
        const s = t.tours[r + 1][Math.floor(i / 2)], v = mtVainqueur(m);
        const vid = v ? v.id : null;
        if (i % 2 === 0) { if ((s.a ? s.a.id : null) !== vid) mtReinitialiser(s); s.a = v; }
        else { if ((s.b ? s.b.id : null) !== vid) mtReinitialiser(s); s.b = v; }
      });
    }
  }
  function tableauRemplacer(t, c, e) {
    const eid = e ? e.id : null;
    t.tours[0].forEach(function (m) {
      if (m.cleA === c) { if ((m.a ? m.a.id : null) !== eid) mtReinitialiser(m); m.a = e; }
      if (m.cleB === c) { if ((m.b ? m.b.id : null) !== eid) mtReinitialiser(m); m.b = e; }
    });
    propager(t);
  }
  function conflitsDePlaces(t, pouleDe) {
    return t.tours[0].filter(function (m) {
      const pa = nn(m.cleA) ? pouleDe[m.cleA] : undefined;
      return pa !== undefined && nn(m.cleB) && pa === pouleDe[m.cleB];
    }).length;
  }
  function tableauEnregistrer(t, r, i, sa, sb) {
    const m = t.tours[r][i];
    exiger(mtJouable(m), "Match non jouable");
    exiger(scoreValide(sa, sb), "Score invalide : " + sa + "-" + sb);
    m.scoreA = sa; m.scoreB = sb; m.victoireA = null;
    propager(t);
  }
  function tableauEnregistrerVictoire(t, r, i, g) {
    const m = t.tours[r][i];
    exiger(mtJouable(m), "Match non jouable");
    m.victoireA = g; m.scoreA = null; m.scoreB = null;
    propager(t);
  }
  function champion(t) { return mtVainqueur(t.tours[t.tours.length - 1][0]); }
  function tableauAppliquerForfaits(t, ids) {
    if (!ids.length) return false;
    let change = false, encore = true;
    while (encore) {
      encore = false;
      boucle:
      for (let r = 0; r < t.tours.length; r++) for (let i = 0; i < t.tours[r].length; i++) {
        const m = t.tours[r][i];
        if (m.estExempt || !m.a || !m.b || mtVainqueur(m)) continue;
        const fa = ids.indexOf(m.a.id) >= 0, fb = ids.indexOf(m.b.id) >= 0;
        if (fa || fb) { tableauEnregistrerVictoire(t, r, i, fb); encore = true; change = true; break boucle; }
      }
    }
    return change;
  }

  // ------------------------------------------------------------------ Championnat

  function creerChampionnat(equipes) {
    const ch = { poules: tirerPoules(equipes), general: null, consolante: null };
    champActualiser(ch);
    return ch;
  }
  function forfaitsDe(x) { return x.forfaitsListe || []; }
  function champDeclarerForfait(ch, id) {
    exiger(id !== ID_BLANC, "Équipe inconnue");
    exiger(ch.poules.some(function (p) { return p.equipes.some(function (e) { return e.id === id; }); }), "Équipe inconnue");
    if (!ch.forfaitsListe) ch.forfaitsListe = [];
    if (ch.forfaitsListe.indexOf(id) < 0) ch.forfaitsListe.push(id);
    champActualiser(ch);
  }
  function champActualiser(ch) {
    if (!ch.general) champCreerTableaux(ch);
    const f = forfaitsDe(ch);
    for (let k = 0; k < 40; k++) {
      champSynchroniser(ch);
      let change = false;
      ch.poules.forEach(function (p) { if (pouleAppliquerForfaits(p, f)) change = true; });
      if (change) champSynchroniser(ch);
      [ch.general, ch.consolante].filter(nn).forEach(function (t) { if (tableauAppliquerForfaits(t, f)) change = true; });
      if (!change) return;
    }
  }
  function champSynchroniser(ch) {
    ch.poules.forEach(function (p) {
      const n = p.numero;
      if (ch.general) {
        tableauRemplacer(ch.general, n * 10 + 1, qualifieDirect(p));
        tableauRemplacer(ch.general, n * 10 + 2, p.barrage ? vainqueur(p.barrage) : null);
      }
      if (ch.consolante) {
        tableauRemplacer(ch.consolante, n * 10 + 3, p.barrage ? perdant(p.barrage) : null);
        tableauRemplacer(ch.consolante, n * 10 + 4, elimineDirect(p));
      }
    });
  }
  function champCreerTableaux(ch) {
    ch.general = construire("Général",
      ch.poules.map(function (p) { return { equipe: null, cle: p.numero * 10 + 1, poule: p.numero }; }),
      ch.poules.map(function (p) { return { equipe: null, cle: p.numero * 10 + 2, poule: p.numero }; }));
    ch.consolante = construire("Consolante",
      ch.poules.map(function (p) { return { equipe: null, cle: p.numero * 10 + 3, poule: p.numero }; }),
      ch.poules.filter(function (p) { return p.equipes.length === 4; }).map(function (p) { return { equipe: null, cle: p.numero * 10 + 4, poule: p.numero }; }));
  }
  function construire(nom, tetes, autres) {
    if (tetes.length + autres.length < 2) return null;
    const pouleDe = {};
    tetes.concat(autres).forEach(function (p) { pouleDe[p.cle] = p.poule; });
    const tm = melanger(tetes);
    let meilleur = null, score = Infinity;
    for (let k = 0; k < 300; k++) {
      const t = creerTableau(nom, tm.concat(melanger(autres))), s = conflitsDePlaces(t, pouleDe);
      if (s < score) { meilleur = t; score = s; }
      if (score === 0) break;
    }
    return meilleur;
  }
  function libelleProvenance(c) {
    if (c >= 1000) return "En attente";
    return "Poule " + Math.floor(c / 10) + " " + ({ 1: "(2-0)", 2: "(barrage)", 3: "(barrage)" }[c % 10] || "(0-2)");
  }
  function champTermine(ch) { return !!ch.general && !!champion(ch.general) && (!ch.consolante || !!champion(ch.consolante)); }

  // ------------------------------------------------------------------ Repêchage A/B/C et cascade

  const MINIMUM_REPECHAGE = 8;

  function clubsDe(equipes) {
    const noms = [];
    equipes.forEach(function (e) { const c = (e.club || "").trim().toLowerCase(); if (c && noms.indexOf(c) < 0) noms.push(c); });
    const r = {};
    equipes.forEach(function (e) { const c = (e.club || "").trim().toLowerCase(); r[e.id] = c ? noms.indexOf(c) : -1000 - e.id; });
    return r;
  }
  function apparierSansRevanche(libres, joues) {
    const club = clubsDe(libres);
    let meilleur = [], score = Infinity;
    for (let k = 0; k < 100; k++) {
      const m = melanger(libres), paires = [];
      while (m.length >= 2) {
        const a = m.shift();
        let b = m.find(function (x) { return !joues.has(cle(a.id, x.id)) && club[a.id] !== club[x.id]; });
        if (!b) b = m.find(function (x) { return !joues.has(cle(a.id, x.id)); });
        if (b) { m.splice(m.indexOf(b), 1); paires.push(match(a, b)); }
      }
      const s = -1000 * paires.length + paires.filter(function (p) { return club[p.a.id] === club[p.b.id]; }).length;
      if (s < score) { meilleur = paires; score = s; }
    }
    return [meilleur, null];
  }
  function apparierPartiel(libres, joues) {
    const club = clubsDe(libres);
    let meilleur = [[], null], score = Infinity;
    for (let k = 0; k < 300; k++) {
      const m = melanger(libres);
      const paires = paquets(m, 2).filter(function (p) { return p.length === 2; }).map(function (p) { return match(p[0], p[1]); });
      const seule = m.length % 2 === 1 ? m[m.length - 1] : null;
      const s = paires.filter(function (p) { return club[p.a.id] === club[p.b.id]; }).length +
        100 * paires.filter(function (p) { return joues.has(cle(p.a.id, p.b.id)); }).length;
      if (s < score) { meilleur = [paires, seule]; score = s; }
      if (score === 0) return meilleur;
    }
    return meilleur;
  }
  function appariements(equipes, pasBlanc) {
    if (!equipes.length) return [];
    const club = clubsDe(equipes);
    let meilleur = [], score = Infinity;
    for (let k = 0; k < 300; k++) {
      let l = melanger(equipes);
      const paires = [];
      if (l.length % 2 === 1) {
        const choisie = l.find(function (e) { return !pasBlanc.has(e.id); }) || l[0];
        paires.push(match(choisie, blanc()));
        l = l.filter(function (e) { return e.id !== choisie.id; });
      }
      paquets(l, 2).forEach(function (p) { paires.push(match(p[0], p[1])); });
      const s = paires.filter(function (p) { return !estBlanc(p.b) && club[p.a.id] === club[p.b.id]; }).length;
      if (s < score) { meilleur = paires; score = s; }
      if (score === 0) return meilleur;
    }
    return meilleur;
  }

  function creerRepechage(equipes, cascade) {
    exiger(equipes.length >= MINIMUM_REPECHAGE, "Il faut au moins " + MINIMUM_REPECHAGE + " équipes");
    exiger(new Set(equipes.map(function (e) { return e.id; })).size === equipes.length, "Deux équipes ont le même numéro");
    const r = { equipes: equipes, cascade: !!cascade, tour1: appariements(equipes, new Set()), tour2: [], tour3B: [], tour3C: [], tableauA: null, tableauB: null, tableauC: null };
    repActualiser(r);
    return r;
  }

  function effectifs(r) {
    const w = r.tour1.length, l = r.equipes.length - r.tour1.length;
    const nWL = Math.floor(w / 2), nLW = Math.floor((l + 1) / 2);
    return { w: w, l: l, nA: Math.floor((w + 1) / 2), nWL: nWL, nLW: nLW, nC0: Math.floor(l / 2), nB: nWL + nLW };
  }
  function repTableaux(r) { return [r.tableauA, r.tableauB, r.tableauC].filter(nn); }
  function repTour3(r) { return r.tour3B.concat(r.tour3C); }
  function tour1Termine(r) { return r.tour1.every(termine); }
  function tour2Termine(r) {
    const e = effectifs(r);
    return tour1Termine(r) && r.tour2.length === Math.floor((e.w + 1) / 2) + Math.floor((e.l + 1) / 2) && r.tour2.every(termine);
  }
  function tour3Termine(r) {
    const e = effectifs(r);
    return r.cascade && tour2Termine(r) && r.tour3B.length === Math.floor((e.nB + 1) / 2) && r.tour3C.length === Math.floor((e.nC0 + 1) / 2) && repTour3(r).every(termine);
  }
  function repVictoires(r, eq) { return r.tour1.concat(r.tour2).filter(function (m) { const v = vainqueur(m); return v && v.id === eq.id; }).length; }
  function repGroupe(r, v) { return tour2Termine(r) ? r.equipes.filter(function (e) { return repVictoires(r, e) === v; }) : []; }
  function repTermine(r) { const t = repTableaux(r); return t.length === 3 && t.every(function (x) { return !!champion(x); }); }
  function repPhase(r) {
    if (repTermine(r)) return "Terminé";
    if (!tour1Termine(r)) return "Tour 1";
    if (!tour2Termine(r)) return "Tour 2";
    if (r.cascade && !tour3Termine(r)) return "Tour 3";
    return "Tableaux";
  }
  function gagnants1(r) { return r.tour1.filter(termine).map(vainqueur).filter(function (e) { return e && !estBlanc(e); }); }
  function perdants1(r) { return r.tour1.filter(termine).map(perdant).filter(function (e) { return e && !estBlanc(e); }); }
  function dansPool(m, ids) {
    const reels = [m.a, m.b].filter(function (e) { return !estBlanc(e); });
    return reels.length > 0 && reels.every(function (e) { return ids.has(e.id); });
  }
  function idsDe(l) { return new Set(l.map(function (e) { return e.id; })); }
  function matchsGG(r) { const ids = idsDe(gagnants1(r)); return r.tour2.filter(function (m) { return dansPool(m, ids); }); }
  function matchsPP(r) { const ids = idsDe(perdants1(r)); return r.tour2.filter(function (m) { return dansPool(m, ids); }); }
  function sansBlanc(m) { return !estBlanc(m.a) && !estBlanc(m.b); }
  function groupe11(r) {
    return matchsPP(r).filter(termine).map(vainqueur).filter(nn)
      .concat(matchsGG(r).filter(function (m) { return termine(m) && sansBlanc(m); }).map(perdant).filter(nn));
  }
  function groupe02(r) { return matchsPP(r).filter(function (m) { return termine(m) && sansBlanc(m); }).map(perdant).filter(nn); }
  function enAttenteTour2(r) {
    const prises = new Set(); r.tour2.forEach(function (m) { prises.add(m.a.id); prises.add(m.b.id); });
    return gagnants1(r).concat(perdants1(r)).filter(function (e) { return !prises.has(e.id); });
  }
  function enAttenteTour3(r) {
    if (!r.cascade) return [];
    const prises = new Set(); repTour3(r).forEach(function (m) { prises.add(m.a.id); prises.add(m.b.id); });
    return groupe11(r).concat(groupe02(r)).filter(function (e) { return !prises.has(e.id); });
  }
  function repDeclarerForfait(r, id) {
    exiger(r.equipes.some(function (e) { return e.id === id; }), "Équipe inconnue");
    if (!r.forfaitsListe) r.forfaitsListe = [];
    if (r.forfaitsListe.indexOf(id) < 0) r.forfaitsListe.push(id);
    repActualiser(r);
  }
  function repActualiser(r) {
    const f = forfaitsDe(r);
    for (let k = 0; k < 80; k++) {
      avancer(r);
      let change = false;
      const tous = r.tour1.concat(r.tour2, r.tour3B, r.tour3C);
      for (const m of tous) {
        if (termine(m)) continue;
        const fa = f.indexOf(m.a.id) >= 0, fb = f.indexOf(m.b.id) >= 0;
        if (fa || fb) { enregistrerVictoire(m, fb); change = true; break; }
      }
      if (change) continue;
      repTableaux(r).forEach(function (t) { if (tableauAppliquerForfaits(t, f)) change = true; });
      if (!change) return;
    }
  }
  function avancer(r) {
    if (!r.tableauA) repCreerTableaux(r);
    const e = effectifs(r);
    r.tour2 = mettreAJour(r, r.tour2, [gagnants1(r), perdants1(r)], tour1Termine(r));
    const wm = matchsGG(r), lm = matchsPP(r);
    if (!r.cascade) {
      remplir(r.tableauA, 1000, [[wm, true, e.nA]]);
      remplir(r.tableauB, 2000, [[wm, false, e.nWL], [lm, true, e.nLW]]);
      remplir(r.tableauC, 3000, [[lm, false, e.nC0]]);
    } else {
      r.tour3B = mettreAJour(r, r.tour3B, [groupe11(r)], tour2Termine(r));
      r.tour3C = mettreAJour(r, r.tour3C, [groupe02(r)], tour2Termine(r));
      remplir(r.tableauA, 1000, [[wm, true, e.nA]]);
      remplir(r.tableauB, 2000, [[r.tour3B, true, Math.floor((e.nB + 1) / 2)]]);
      remplir(r.tableauC, 3000, [[r.tour3B, false, Math.floor(e.nB / 2)], [r.tour3C, true, Math.floor((e.nC0 + 1) / 2)]]);
    }
  }
  function emplacements(nom, base, n) {
    const p = [];
    for (let i = 0; i < n; i++) p.push({ equipe: null, cle: base + i, poule: null });
    return creerTableau(nom, melanger(p));
  }
  function repCreerTableaux(r) {
    const e = effectifs(r);
    r.tableauA = emplacements("A", 1000, e.nA);
    if (!r.cascade) {
      r.tableauB = emplacements("B", 2000, e.nB);
      r.tableauC = emplacements("C", 3000, e.nC0);
    } else {
      r.tableauB = emplacements("B", 2000, Math.floor((e.nB + 1) / 2));
      r.tableauC = emplacements("C", 3000, Math.floor(e.nB / 2) + Math.floor((e.nC0 + 1) / 2));
    }
  }
  /** blocs : [[matchs, gagnant, taille]] */
  function remplir(t, base, blocs) {
    if (!t) return;
    let dec = 0;
    blocs.forEach(function (b) {
      const admis = b[1] ? b[0] : b[0].filter(sansBlanc);
      for (let i = 0; i < b[2]; i++) {
        const m = admis[i] && termine(admis[i]) ? admis[i] : null;
        tableauRemplacer(t, base + dec + i, m ? (b[1] ? vainqueur(m) : perdant(m)) : null);
      }
      dec += b[2];
    });
  }
  function dejaJoues(r) {
    const s = new Set();
    r.tour1.concat(r.tour2).forEach(function (m) { if (sansBlanc(m)) s.add(cle(m.a.id, m.b.id)); });
    return s;
  }
  function equipesAvecBlanc(r) {
    const s = new Set();
    r.tour1.concat(r.tour2, r.tour3B, r.tour3C).forEach(function (m) { if (!sansBlanc(m)) { const v = vainqueur(m); if (v) s.add(v.id); } });
    return s;
  }
  function mettreAJour(r, existants, groupes, complet) {
    const tous = existants.filter(function (m) {
      const reels = [m.a, m.b].filter(function (e) { return !estBlanc(e); });
      const dansUnGroupe = groupes.some(function (g) {
        const ids = idsDe(g);
        return reels.every(function (e) { return ids.has(e.id); }) && (reels.length === 2 || g.length % 2 === 1);
      });
      return dansUnGroupe && (reels.length === 2 || complet);
    });
    const pasBlanc = equipesAvecBlanc(r), joues = dejaJoues(r);
    groupes.forEach(function (g) {
      const prises = new Set(); tous.forEach(function (m) { prises.add(m.a.id); prises.add(m.b.id); });
      const libres = g.filter(function (e) { return !prises.has(e.id); });
      if (!libres.length) return;
      let res = complet ? apparierPartiel(libres, joues) : apparierSansRevanche(libres, joues);
      let paires = res[0], seule = res[1];
      if (complet && paires.some(function (p) { return joues.has(cle(p.a.id, p.b.id)); })) {
        const ids = idsDe(g);
        const aRefaire = tous.filter(function (m) { return dansPool(m, ids) && !termine(m) && sansBlanc(m); });
        aRefaire.forEach(function (m) { tous.splice(tous.indexOf(m), 1); });
        const reservoir = libres.slice();
        aRefaire.forEach(function (m) { reservoir.push(m.a, m.b); });
        res = apparierPartiel(reservoir, joues);
        paires = res[0]; seule = res[1];
      }
      paires.forEach(function (p) { tous.push(p); });
      if (seule && complet) {
        let cible = null;
        if (pasBlanc.has(seule.id)) {
          const idsG = idsDe(g);
          cible = tous.find(function (m) { return dansPool(m, idsG) && !termine(m) && sansBlanc(m) && (!pasBlanc.has(m.a.id) || !pasBlanc.has(m.b.id)); }) || null;
        }
        if (cible) {
          const x = !pasBlanc.has(cible.a.id) ? cible.a : cible.b;
          const y = x.id === cible.a.id ? cible.b : cible.a;
          tous.splice(tous.indexOf(cible), 1);
          tous.push(match(x, blanc()));
          tous.push(match(seule, y));
        } else {
          tous.push(match(seule, blanc()));
        }
      }
    });
    return tous;
  }

  // ------------------------------------------------------------------ Concours

  const TYPES = {
    TETE_A_TETE: { libelle: "Tête-à-tête", formee: 0 },
    MELEE: { libelle: "Mêlée", formee: 0 },
    CHAMPIONNAT: { libelle: "Championnat", formee: 0 },
    DOUBLETTE_FORMEE: { libelle: "Doublette formée", formee: 2 },
    TRIPLETTE_FORMEE: { libelle: "Triplette formée", formee: 3 },
    ELIMINATION_REPECHAGE: { libelle: "Repêchage A/B/C", formee: 0 },
    CASCADE_ABC: { libelle: "Cascade A/B/C", formee: 0 }
  };
  function equipesFormees(type) { return (TYPES[type] || {}).formee > 0; }
  function aEquipesNumerotees(type) { return type === "CHAMPIONNAT" || type === "ELIMINATION_REPECHAGE" || type === "CASCADE_ABC"; }

  function etat(c) {
    if (c.type === "CHAMPIONNAT") {
      const ch = c.championnat;
      if (!ch) return "";
      if (!ch.general || ch.poules.some(function (p) { return !pouleTermine(p); })) return "Phase de poules";
      if (champTermine(ch)) return "Terminé";
      return "Tableaux";
    }
    if (c.type === "ELIMINATION_REPECHAGE" || c.type === "CASCADE_ABC") return c.repechage ? repPhase(c.repechage) : "";
    return c.melee ? (meleeTermine(c.melee) ? "Terminé" : "Tour " + c.melee.tours.length + "/" + c.melee.nbTours) : "";
  }
  function estTermine(c) { return etat(c) === "Terminé"; }

  /** Recalcule ce qui découle des résultats (à appeler après un chargement ou une action). */
  function actualiser(c) {
    if (c.championnat) champActualiser(c.championnat);
    if (c.repechage) repActualiser(c.repechage);
  }

  // ------------------------------------------------------------------ Terrains

  function entreesTerrain(c) {
    const l = [];
    function simple(m, reel) { l.push({ jouable: reel, termine: termine(m), o: m }); }
    function tableaux(ts) {
      ts.forEach(function (t) { t.tours.forEach(function (tr) { tr.forEach(function (m) { const j = mtJouable(m); l.push({ jouable: j, termine: j && !!mtVainqueur(m), o: m }); }); }); });
    }
    if (c.melee) c.melee.tours.forEach(function (t) { t.parties.forEach(function (p) { l.push({ jouable: true, termine: partieTerminee(p), o: p }); }); });
    if (c.repechage) {
      const r = c.repechage;
      r.tour1.concat(r.tour2, r.tour3B, r.tour3C).forEach(function (m) { simple(m, sansBlanc(m)); });
      tableaux(repTableaux(r));
    }
    if (c.championnat) {
      const ch = c.championnat;
      function aj(m) { if (m) simple(m, sansBlanc(m)); }
      ch.poules.forEach(function (p) { p.tour1.forEach(aj); });
      ch.poules.forEach(function (p) { aj(p.matchGagnants); aj(p.matchPerdants); });
      ch.poules.forEach(function (p) { aj(p.barrage); });
      tableaux([ch.general, ch.consolante].filter(nn));
    }
    return l;
  }
  function attribuerTerrains(c) {
    const es = entreesTerrain(c), n = c.terrains;
    if (!nn(n) || n < 1) { es.forEach(function (e) { if (nn(e.o.terrain)) e.o.terrain = null; }); return; }
    const pris = new Set();
    es.forEach(function (e) {
      const t = e.o.terrain;
      if (e.termine) { if (t === 0) e.o.terrain = null; }
      else if (!e.jouable) { if (nn(t)) e.o.terrain = null; }
      else if (nn(t) && t >= 1 && t <= n && !pris.has(t)) pris.add(t);
      else e.o.terrain = 0;
    });
    es.forEach(function (e) {
      if (e.jouable && !e.termine && e.o.terrain === 0) {
        for (let k = 1; k <= n; k++) if (!pris.has(k)) { pris.add(k); e.o.terrain = k; break; }
      }
    });
  }

  // ------------------------------------------------------------------ JSON (compatible avec les applis Android et Windows)

  /** Comme Gson : les valeurs nulles ne sont pas écrites. */
  function versJson(o) { return JSON.stringify(o, function (k, v) { return v === null || v === undefined ? undefined : v; }); }

  /** Complète un concours lu (les anciennes sauvegardes n'ont pas tous les champs). */
  function normaliser(c) {
    if (c.melee) {
      const m = c.melee;
      m.tours = m.tours || []; m.aVenir = m.aVenir || []; m.gagnantContreGagnant = !!m.gagnantContreGagnant;
      m.tours.concat(m.aVenir).forEach(function (t) { t.parties = t.parties || []; t.joueurBlanc = t.joueurBlanc || null; });
    }
    if (c.repechage) {
      const r = c.repechage;
      ["tour1", "tour2", "tour3B", "tour3C"].forEach(function (k) { r[k] = r[k] || []; });
      r.cascade = !!r.cascade;
      ["tableauA", "tableauB", "tableauC"].forEach(function (k) { r[k] = r[k] || null; normTableau(r[k]); });
    }
    if (c.championnat) {
      const ch = c.championnat;
      ch.poules.forEach(function (p) {
        ["matchGagnants", "matchPerdants", "barrage"].forEach(function (k) { p[k] = p[k] || null; });
        if (!p.participants) p.participants = p.equipes.length === 3 ? p.equipes.concat([blanc()]) : p.equipes.slice();
      });
      ch.general = ch.general || null; ch.consolante = ch.consolante || null;
      normTableau(ch.general); normTableau(ch.consolante);
    }
    return c;
  }
  function normTableau(t) {
    if (!t) return;
    t.tours.forEach(function (tr) { tr.forEach(function (m) { m.estExempt = !!m.estExempt; m.a = m.a || null; m.b = m.b || null; }); });
  }
  function depuisJson(texte) { const c = normaliser(JSON.parse(texte)); actualiser(c); return c; }
  function copie(c) { return depuisJson(versJson(c)); }

  /**
   * Change numéro, nom et club d'une équipe partout dans un concours ; si le numéro est déjà pris, les deux équipes échangent.
   * Même méthode que les applis : parcours de l'arbre JSON.
   */
  function modifierEquipe(c, id, nouvelId, nom, club) {
    exiger(nouvelId >= 1, "Le numéro doit être supérieur à 0");
    const arbre = JSON.parse(versJson(c));
    function nouveau(n) { return n === id ? nouvelId : (n === nouvelId ? id : n); }
    function estEquipe(o) {
      return typeof o.id === "number" && "nom" in o && Object.keys(o).every(function (k) { return k === "id" || k === "nom" || k === "club"; });
    }
    function visiter(e) {
      if (Array.isArray(e)) { e.forEach(visiter); return; }
      if (!e || typeof e !== "object") return;
      if (estEquipe(e)) {
        if (e.id === id) { e.id = nouvelId; e.nom = nom; if (club) e.club = club; else delete e.club; }
        else if (e.id === nouvelId && nouvelId !== id) e.id = id;
      }
      if (Array.isArray(e.forfaitsListe)) e.forfaitsListe = e.forfaitsListe.map(nouveau);
      Object.keys(e).forEach(function (k) { visiter(e[k]); });
    }
    visiter(arbre);
    return depuisJson(JSON.stringify(arbre));
  }

  // ------------------------------------------------------------------ Classement d'un club

  function classementClub(club, tous) {
    function k(n) { return n.trim().toLowerCase(); }
    const membres = new Map();
    club.joueurs.forEach(function (j) { if (!membres.has(k(j))) membres.set(k(j), j.trim()); });
    const termines = tous.filter(function (c) { return c.clubId === club.id && !equipesFormees(c.type) && c.melee && meleeTermine(c.melee); })
      .sort(function (a, b) { return a.creeLe - b.creeLe; });
    const cumuls = new Map();
    termines.forEach(function (c) {
      classementMelee(c.melee).forEach(function (s) {
        const key = k(s.joueur.nom);
        if (!membres.has(key)) return;
        const cu = cumuls.get(key) || { concours: 0, parties: 0, victoires: 0, pour: 0, contre: 0 };
        cu.concours++; cu.parties += s.parties; cu.victoires += s.victoires; cu.pour += s.pointsPour; cu.contre += s.pointsContre;
        cumuls.set(key, cu);
      });
    });
    const pts = nn(club.pointsParticipation) ? club.pointsParticipation : 5;
    const stats = [];
    cumuls.forEach(function (cu, key) {
      const part = cu.concours * pts;
      stats.push({ nom: membres.get(key), concours: cu.concours, parties: cu.parties, victoires: cu.victoires, pointsPour: cu.pour, pointsContre: cu.contre, participation: part, difference: cu.pour - cu.contre + part });
    });
    stats.sort(function (a, b) { return (b.victoires - a.victoires) || (b.difference - a.difference) || (b.pointsPour - a.pointsPour); });
    let rang = 0;
    stats.forEach(function (s, i) {
      const p = stats[i - 1];
      if (!p || p.victoires !== s.victoires || p.difference !== s.difference || p.pointsPour !== s.pointsPour) rang = i + 1;
      s.rang = rang;
    });
    return { stats: stats, concours: termines };
  }

  const API = {
    ID_BLANC: ID_BLANC, TYPES: TYPES, MINIMUM_REPECHAGE: MINIMUM_REPECHAGE,
    scoreValide: scoreValide, estBlanc: estBlanc, libelle: libelle, blanc: blanc,
    match: match, termine: termine, vainqueur: vainqueur, perdant: perdant, enregistrer: enregistrer, enregistrerVictoire: enregistrerVictoire,
    creerMelee: creerMelee, meleeTermine: meleeTermine, tourSuivant: tourSuivant, enregistrerPartie: enregistrerPartie, partieTerminee: partieTerminee, classementMelee: classementMelee,
    creerPoule: creerPoule, pouleActualiser: pouleActualiser, pouleEnregistrer: pouleEnregistrer, pouleEnregistrerVictoire: pouleEnregistrerVictoire, pouleTermine: pouleTermine,
    pouleMatchs: pouleMatchs, qualifieDirect: qualifieDirect, elimineDirect: elimineDirect, taillesDePoules: taillesDePoules, tirerPoules: tirerPoules,
    creerTableau: creerTableau, mtVainqueur: mtVainqueur, mtPerdant: mtPerdant, mtJouable: mtJouable, tableauEnregistrer: tableauEnregistrer,
    tableauEnregistrerVictoire: tableauEnregistrerVictoire, champion: champion, libelleProvenance: libelleProvenance,
    creerChampionnat: creerChampionnat, champActualiser: champActualiser, champDeclarerForfait: champDeclarerForfait, champTermine: champTermine,
    creerRepechage: creerRepechage, repActualiser: repActualiser, repDeclarerForfait: repDeclarerForfait, repTableaux: repTableaux, repPhase: repPhase,
    repTermine: repTermine, repVictoires: repVictoires, repGroupe: repGroupe, tour1Termine: tour1Termine, tour2Termine: tour2Termine, tour3Termine: tour3Termine,
    enAttenteTour2: enAttenteTour2, enAttenteTour3: enAttenteTour3, forfaitsDe: forfaitsDe,
    equipesFormees: equipesFormees, aEquipesNumerotees: aEquipesNumerotees, etat: etat, estTermine: estTermine, actualiser: actualiser,
    attribuerTerrains: attribuerTerrains, versJson: versJson, depuisJson: depuisJson, normaliser: normaliser, copie: copie,
    modifierEquipe: modifierEquipe, classementClub: classementClub, melanger: melanger
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else racine.Moteur = API;
})(this);
