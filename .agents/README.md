# FORMA Agent — Fichiers de règles et références

## Structure

```
.agents/
├── README.md
├── rules/
│   ├── architecture.md     # Stack, conventions, structure du projet
│   ├── chat-memory.md      # Système de chat + mémoire Dreaming V3
│   └── database.md         # Schéma Supabase complet
└── references/
    └── audit-2026-05.md    # Analyse de code archive (mai 2026)
```

## Conventions

- Toute modification du système de chat/mémoire doit être répercutée dans `rules/chat-memory.md`
- Tout changement de la DB Supabase doit être répercuté dans `rules/database.md` et via une migration
- Les fichiers dans `references/` sont archivés, non modifiés
