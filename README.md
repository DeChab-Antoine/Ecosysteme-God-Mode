# Exoplanet God Mode

**Games on Web 2026** — simulation d'agents autonomes en 3D

> Vous êtes le Dieu d'une exoplanète envahie par 50 aliens. Observez, intervenez, et éliminez-les avant qu'ils atteignent 100.

## Jouer

Ouvrir `src/index.html` dans un navigateur (ou via un serveur local).

## Mécaniques

- **Aliens** — chassent les blobs pour survivre, se dupliquent, meurent la nuit si à court d'énergie
- **Blobs** — fuient les aliens, se dupliquent, attirent et dupliquent
- **Mutants** — nés d'un alien ayant touché une plante rage ; immortels, ils chassent les aliens normaux

## Outils (God Mode)

| Outil | Coût | Effet |
|---|---|---|
| Plante poison ☠ | 5 pts | Attire et tue aliens, mutants et blobs au contact |
| Plante rage ■ | 12 pts | Transforme le premier alien qui la touche en mutant |
| Frappe orbitale ☄ | 30 pts | Détruit tout dans un rayon de 10 cases |

Gagner des points : +10 par alien empoisonné, +15 par mutant empoisonné, +5 par blob, +10/alien tué par frappe.

## Contrôles

| Touche | Action |
|---|---|
| `Espace` | Pause / Reprendre |
| `1` `2` `3` | Vitesse ×1 ×2 ×4 |
| Clic gauche | Orbiter (mode caméra) ou placer un outil |
| Clic droit | Annuler la sélection |
| `Échap` | Désélectionner l'outil |

## Objectif

Éliminer tous les aliens et mutants avant qu'ils atteignent **100**. Victoire si le total tombe à **0**.

## Stack technique

- [Babylon.js](https://www.babylonjs.com/) — rendu 3D
- [Chart.js](https://www.chartjs.org/) — graphe de population
- ES Modules, pas de build tool — HTML/JS pur

## Auteurs

Hugo Viana · Antoine de Chabannes — Master 1 Informatique, Université Côte d'Azur
