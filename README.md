# 🎯 Pétanque Manager

**L'application pour organiser vos concours de pétanque : tirage au sort, poules, tableaux, mêlée, classements et PDF, en quelques touches.**

Disponible gratuitement sur **Android** et **Windows**. Sans compte, sans inscription : vos données restent sur votre appareil.

🌐 Site : https://rilleycorps.github.io/petanque-manager/

---

## 📥 Télécharger

| Plateforme | Fichier | Installation |
|---|---|---|
| 📱 **Android** | [`PetanqueManager.apk`](https://github.com/Rilleycorps/petanque-manager/releases/latest/download/PetanqueManager.apk) | Ouvrir le fichier, autoriser l'installation depuis cette source si Android le demande. |
| 💻 **Windows** | [`PetanqueManager-windows.zip`](https://github.com/Rilleycorps/petanque-manager/releases/latest/download/PetanqueManager-windows.zip) | Décompresser le zip n'importe où (Bureau, Documents, clé USB), puis double-cliquer sur `PetanqueManager.exe`. Aucune installation, Java est inclus. |
| 🍏 **iPhone / iPad** | [Version web](https://rilleycorps.github.io/Petanque-Manager/app/) | Ouvrir dans Safari, toucher **Partager** puis **« Sur l'écran d'accueil »**. Fonctionne aussi sans réseau, et dans n'importe quel navigateur (Android, ordinateur). |

> Toutes les versions sont dans l'onglet [**Releases**](https://github.com/Rilleycorps/petanque-manager/releases).

---

## 🆕 Nouveautés de la version 1.5

- **Windows : tout le concours sur un seul écran.** Sur un écran assez large, l'appli s'affiche en 3 colonnes : l'accueil et la création des concours à gauche, les poules et les matchs à jouer au milieu, les tableaux (Général, Consolante, A, B, C) ou le classement à droite. Une fenêtre plus étroite garde l'affichage habituel en une colonne.
- **Liste « Matchs à jouer »** : tous les matchs en attente (poules, tours et tableaux mélangés) dans une seule liste triée par terrain ; un clic pour indiquer le gagnant, et les matchs suivants apparaissent aussitôt.
- **Version web pour iPhone et iPad** ([ouvrir](https://rilleycorps.github.io/Petanque-Manager/app/)) : mêmes formats et mêmes règles, installable depuis Safari, fonctionne sans réseau ; les sauvegardes passent d'une appli à l'autre.
- L'appli Android reste en version 1.4 (aucun changement).

## Nouveautés de la version 1.4

- **Deux nouveaux formats à trois tableaux** : le **Repêchage A/B/C** et la **Cascade A/B/C**. Le match suivant apparaît dès que deux équipes sont connues, sans attendre la fin du tour, et les tableaux se remplissent au fur et à mesure.
- **Suivi en direct pour les joueurs** : un QR code à afficher ; les joueurs le scannent et voient sur leur téléphone leur prochain match, leur terrain et les scores (recherche par numéro ou nom d'équipe). Fonctionne en Wi-Fi local, sans internet ni compte.
- **Interface plus claire** : accueil allégé (un seul bouton « Nouveau concours », clubs repliés, concours « en cours » puis « terminés »), écran de concours avec une seule ligne d'outils (terrains, suivi en direct) et un menu ⋮ pour renommer ou supprimer, options de création repliées.
- **Doublette formée et triplette formée** : des équipes déjà formées, comme en mêlée, avec l'option **gagnant contre gagnant** (après le 1er tour, chaque équipe rencontre une équipe qui a le même nombre de victoires, sans refaire le même adversaire si possible).
- **Terrains numérotés** (option) : chaque match reçoit automatiquement le premier terrain libre. Les numéros apparaissent aussi dans le PDF des poules.
- **Choix du format en menu déroulant** à la création d'un concours.
- **Recherche d'équipe** aussi dans le Repêchage et la Cascade : ses matchs, son terrain et son tableau.
- **Android** : le clavier ne cache plus la case où l'on écrit.
- **Sauvegarde plus sûre** : les fichiers sont écrits de façon atomique (aucune perte en cas de coupure).
- **Windows** : la mise à jour automatique ne laisse plus de fenêtre noire, et écrit un journal dans `%TEMP%\petanque-maj.log`.

---

## 🏆 Les formats de concours

### Tête-à-tête
Un joueur contre un joueur. Tirage au sort automatique, saisie rapide des scores, classement en direct.

### Mêlée (doublettes et triplettes)
- Les équipes sont formées au hasard à chaque tour.
- Deux joueurs ne se retrouvent jamais plus d'une fois dans la même équipe.
- Classement individuel des joueurs.

### Doublette formée et triplette formée
- Les équipes sont déjà formées : chaque équipe garde ses joueurs pendant tout le concours.
- À chaque partie, une équipe adverse est tirée au sort, sans refaire les mêmes adversaires.
- Option **gagnant contre gagnant** : après le 1er tour, chaque équipe rencontre une équipe qui a le même nombre de victoires.
- Classement par équipe, comme en mêlée.

### Championnat de France
- Poules de **3 ou 4 équipes**, avec match de barrage.
- Deux tableaux à élimination directe : **Général** et **Consolante**.
- Les équipes sont placées dans les tableaux **dès qu'elles sortent de leur poule**, sans attendre la fin de toutes les poules.
- Les places dans les tableaux sont tirées au hasard en évitant, autant que possible, que des équipes d'une même poule se rencontrent dès le premier tour.
- Aucune limite fixe d'équipes : testé pour plus de 100 équipes (au minimum 3 équipes).

### Repêchage A/B/C
- **2 parties pour tout le monde** : tour 1 tiré au sort, puis les gagnants jouent entre eux et les perdants entre eux.
- Selon les victoires : **2 victoires = tableau A**, **1 victoire = tableau B**, **aucune victoire = tableau C**.
- Chaque tableau se joue ensuite en **élimination directe** et désigne son propre vainqueur.
- 8 équipes minimum. Si un groupe est impair, une équipe joue contre un « blanc » (13-7 d'office).

### Cascade A/B/C
Inspirée du règlement du concours en cascade A B C de la Fédération suisse de pétanque.
- Tours 1 et 2 comme ci-dessus ; **2-0 : tableau A**, en élimination directe.
- **Les 1-1** jouent un tour 3 entre eux : les gagnants vont au **tableau B**, les perdants descendent au **C**.
- **Les 0-2** jouent un tour 3 entre eux : les perdants sont éliminés, les gagnants vont au **C**.
- 8 équipes minimum.

> Dans ces deux formats, rien n'attend la fin d'un tour : dès que deux équipes sont connues pour le tour suivant, leur match est créé. Les tableaux A, B et C sont visibles dès le départ et se remplissent au fur et à mesure.

---

## ✨ Fonctionnalités

**Organisation**
- 🎲 **Tirage équitable** : les poules sont tirées au hasard en évitant de réunir des équipes du même club.
- 📺 **Affichage pour les joueurs** : un tableau des poules en plein écran qui montre qui joue contre qui, prêt pour un téléphone, une tablette ou un écran.
- 🏟️ **Terrains numérotés** (option) : chaque match reçoit automatiquement le premier terrain libre, et attend si tous sont occupés. Activable à la création ou en cours de concours. Les numéros figurent aussi dans le PDF des poules.
- 🔎 **Recherche d'équipe** toujours visible pour retrouver rapidement une équipe.
- ➕ **Ajout d'équipes ou de joueurs en cours de saisie**, directement au bon endroit.

**Résultats et corrections**
- Un appui sur le gagnant d'un match : la suite se génère automatiquement, jusqu'à la finale.
- ✎ **Modifier** n'importe quel résultat : les matchs qui en dépendent sont remis à jour proprement.
- ↶ **Annuler** la dernière action.
- 🔢 **Modifier le numéro, le nom et le club** d'une équipe (échange automatique de numéros si besoin).
- 🚫 **Forfait** : les matchs à venir de l'équipe sont perdus d'office et ses adversaires avancent.
- ✏️ **Renommer** un concours, un club ou un joueur.

**Clubs et joueurs**
- 🏛️ Enregistrez vos **clubs** et leurs **joueurs** (ajout de plusieurs noms d'un coup, séparés par des lignes ou des virgules).
- Concours de club avec **classement du club** et points de participation.
- Les concours sont rangés par catégories : concours de club, tête-à-tête, mêlée, équipes formées, championnat.

**Export et impression**
- 📄 **PDF** des poules, des tableaux et des classements.
- Grands tableaux : **1 page A4**, **1 page A3**, ou **plusieurs pages A4** (une page par groupe de 8 matchs, puis les phases finales).
- 💶 **Calculateur de récompenses** : mises, pourcentage du club, gains par tour atteint, répartition Général et Consolante (la Consolante rapporte 50 % du Général). Les montants sont divisibles par 2 ou 3 selon le format.

**Données**
- 💾 **Sauvegarde / import** : exportez tous vos concours et clubs dans un fichier, puis importez-le sur un autre appareil (téléphone → PC, par exemple).
- 🔒 **Aucune donnée envoyée** sur un serveur : tout est stocké localement.
- 🌙 Thème sombre par défaut.

---

## 🚀 Un concours en 3 étapes

1. **Ajoutez les équipes** au fur et à mesure des inscriptions.
2. **Tirez au sort** : un seul bouton crée les poules et prépare les tableaux.
3. **Saisissez les scores** : la suite du concours se construit toute seule.

---

## 💰 Gratuité

L'application est **gratuite** et **sans aucune publicité**, sur Android comme sur Windows.

---

## 🔐 Confidentialité

Vos données (équipes, joueurs, clubs, résultats) restent sur votre appareil et ne sont jamais envoyées sur internet. Le suivi en direct (facultatif) les diffuse uniquement sur votre réseau Wi-Fi local, tant que vous le laissez activé. Détails : [politique de confidentialité](https://rilleycorps.github.io/petanque-manager/confidentialite.html).

---

## ❓ Questions fréquentes

**Les données Android et Windows sont-elles liées ?**
Non, elles sont indépendantes. Utilisez *Exporter* puis *Importer* pour passer de l'une à l'autre.

**Où sont enregistrées mes données ?**
- Android : dans l'espace privé de l'application.
- Windows : dans `%APPDATA%\Petanque` (un fichier par concours et par club).

**Comment mettre à jour l'application ?**
Elle propose elle-même la nouvelle version au démarrage (Android et Windows). Sous Windows, vous pouvez aussi télécharger le nouveau zip et remplacer le dossier du programme : vos concours, enregistrés ailleurs, sont conservés.

---

## 🛠️ Technologies

- **Android** : Kotlin, Jetpack Compose (Material 3).
- **Windows** : Kotlin, Compose Multiplatform Desktop.
- Moteur de concours commun aux deux versions (poules, tableaux, mêlée), sauvegarde en JSON, PDF.

---

## 📬 Contact

Une question, une idée, un problème ? Ouvrez une [issue](https://github.com/Rilleycorps/petanque-manager/issues) ou écrivez à **petanquemanager@hotmail.com**.

---

*Pétanque Manager n'est affilié à aucune fédération. Fait avec ❤️ pour les organisateurs de concours de pétanque.*
