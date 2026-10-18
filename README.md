<p align="center"><img src=".github/banner.png" alt="messages-secrets" width="100%"></p>

# Messages secrets

Module Foundry VTT (v13 / v14) de magisterphamtom : des **messages privés entre les joueurs et le Gardien / MJ**, sans commande à taper.

## Ce que fait le module
- **Côté joueur** : un bouton (à côté du chat, dans la barre de gauche, ou **Alt + M**) ouvre « Message au Gardien ». On écrit, **Ctrl + Entrée**, c'est envoyé.
- **Côté Gardien** : les joueurs à cocher (un, plusieurs, ou tous), même fenêtre.
- **À la réception** : une carte apparaît en haut de l'écran avec un son, le nom du personnage et son portrait, et deux boutons : **Répondre** et **Lu**.
- **Historique** : chaque message est aussi un vrai chuchotement du chat Foundry (rien n'est perdu).
- Option : autoriser les messages entre joueurs (le Gardien les voit, comme tout chuchotement Foundry).

## Six habillages
| Habillage | Style |
|---|---|
| Générique | Verre sombre et doré, pour toutes les tables |
| Outreterre (drow) | Violet et noir, lueur de faerzress, toile d'araignée |
| New York 1933 | Télégramme en capitales à la machine à écrire, avec « STOP » |
| Antarctique 1933 | Message radio de l'expédition, papier givré, « FIN DE MESSAGE » |
| New York 2026 | Notification et bulle de SMS |
| Antarctique 2026 | Liaison satellite chiffrée, tablette de station orange sécurité |

**Automatique (Montagnes Hallucinées)** : suit le module *Bascule d'époque* (1933 ou 2026) et le **lieu** choisi (New York ou Antarctique). Le Gardien change l'habillage et le lieu directement depuis sa fenêtre.

## Réglages
Habillage, lieu, messages entre joueurs, son à la réception, et (pour chacun) garder les cartes affichées ou les faire disparaître après 20 s.

## Macro dans la barre (automatique)
À la première connexion du Gardien, le module crée la macro **« Message secret »** (enveloppe au cachet de cire), utilisable par tous. Elle est placée **toute seule** dans le premier emplacement libre de la barre de macros de chaque joueur et du Gardien (une seule fois : chacun peut ensuite la déplacer ou l'enlever).

- Désactivable : Paramètres > Messages secrets > « Macro dans la barre des joueurs ».
- Pour la remettre dans sa barre : faire glisser la macro depuis l'onglet Macros, ou taper dans la console (F12) :
```js
game.modules.get("messages-secrets")?.api.addToHotbar();
```

## Crédits
Polices sous SIL Open Font License : Inter, Rajdhani, Special Elite, IM Fell English, Limelight, Cinzel, EB Garamond. Code sous licence MIT.

> 🤖 Idées, conception et tests : magisterphamtom · code écrit avec l'assistance de l'IA Claude (Anthropic).
