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

> Toutes les versions sont dans l'onglet [**Releases**](https://github.com/Rilleycorps/petanque-manager/releases).

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
- Classement par équipe, comme en mêlée.

### Championnat de France
- Poules de **3 ou 4 équipes**, avec match de barrage.
- Deux tableaux à élimination directe : **Général** et **Consolante**.
- Les équipes sont placées dans les tableaux **dès qu'elles sortent de leur poule**, sans attendre la fin de toutes les poules.
- Les places dans les tableaux sont tirées au hasard en évitant, autant que possible, que des équipes d'une même poule se rencontrent dès le premier tour.
- Aucune limite fixe d'équipes : testé pour plus de 100 équipes (au minimum 3 équipes).

---

## ✨ Fonctionnalités

**Organisation**
- 🎲 **Tirage équitable** : les poules sont tirées au hasard en évitant de réunir des équipes du même club.
- 📺 **Affichage pour les joueurs** : un tableau des poules en plein écran qui montre qui joue contre qui, prêt pour un téléphone, une tablette ou un écran.
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

Vos données (équipes, joueurs, clubs, résultats) restent sur votre appareil et ne sont jamais envoyées ailleurs. Détails : [politique de confidentialité](https://rilleycorps.github.io/petanque-manager/confidentialite.html).

---

## ❓ Questions fréquentes

**Les données Android et Windows sont-elles liées ?**
Non, elles sont indépendantes. Utilisez *Exporter* puis *Importer* pour passer de l'une à l'autre.

**Où sont enregistrées mes données ?**
- Android : dans l'espace privé de l'application.
- Windows : dans `%APPDATA%\Petanque` (un fichier par concours et par club).

**Comment mettre à jour la version Windows ?**
Téléchargez le nouveau zip et remplacez le dossier du programme. Vos concours, enregistrés ailleurs, sont conservés.

---

## 🛠️ Technologies

- **Android** : Kotlin, Jetpack Compose (Material 3).
- **Windows** : Kotlin, Compose Multiplatform Desktop.
- Moteur de concours commun aux deux versions (poules, tableaux, mêlée), sauvegarde en JSON, PDF.

---

## 📬 Contact

Une question, une idée, un problème ? Ouvrez une [issue](https://github.com/Rilleycorps/petanque-manager/issues) ou écrivez à **VOTRE-EMAIL@exemple.fr**.

---

*Pétanque Manager n'est affilié à aucune fédération. Fait avec ❤️ pour les organisateurs de concours de pétanque.*
