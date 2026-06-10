# Supabase — Schéma de la Base de Données

## Migrations

Les migrations sont dans `supabase/migrations/` et doivent être appliquées dans l'ordre chronologique.

## Tables

### profiles
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK FK auth.users | |
| email | text nullable | |
| agency_name | text nullable | |
| avatar_url | text nullable | |
| studio_id | uuid FK studios nullable | |
| onboarding_completed | boolean default false | |
| onboarding_level | text nullable | `full` / `quick` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Trigger `on_auth_user_created` : INSERT automatique à la création d'un auth.users.

### onboarding_data
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK unique | |
| level | text | `full` / `quick` |
| data | jsonb | Données du questionnaire (prénom, nom, agence, spécialités, logiciels, style de comm, etc.) |
| completed_at | timestamptz | |
| updated_at | timestamptz | |

### conversations
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| title | text default 'Nouvelle conversation' | |
| project_id | uuid FK projects nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS : FOR ALL USING (auth.uid() = user_id)

### messages
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| conversation_id | uuid FK conversations ON DELETE CASCADE | |
| user_id | uuid FK auth.users | |
| role | text CHECK IN ('user','assistant') | |
| content | text | |
| created_at | timestamptz | |

RLS : FOR ALL USING (auth.uid() = user_id)
Index : conversation_id, user_id, created_at

### memories
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| studio_id | uuid FK studios nullable | |
| project_id | uuid FK projects nullable | |
| level | text CHECK IN ('project','personal','studio') | |
| category | text nullable | `preferences` / `projects` / `work_style` / `constraints` / `general` |
| content | text | |
| freshness_score | float default 1.0 | 0.0 (périmé) à 1.0 (très frais) |
| last_accessed | timestamptz nullable | |
| is_active | boolean default true | |
| source_conversation_id | uuid FK conversations nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS : SELECT si auth.uid() = user_id OU (level='studio' AND is_studio_member)
Index : user_id+level, studio_id, project_id, user_id+is_active, user_id+freshness_score

### memory_summaries
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| category | text CHECK IN ('preferences','projects','work_style','constraints','general') | |
| summary | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE(user_id, category) | | |

### studios
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| name | text | |
| created_by | uuid FK auth.users | |
| created_at | timestamptz | |

### studio_members
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| studio_id | uuid FK studios ON DELETE CASCADE | |
| user_id | uuid FK auth.users ON DELETE CASCADE | |
| role | text CHECK IN ('admin','member') | |
| joined_at | timestamptz | |
| UNIQUE(studio_id, user_id) | | |

### projects
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| title | text | |
| description | text nullable | |
| tag | text default 'Résidentiel' | |
| status | text CHECK IN ('todo','in_progress','review','done') default 'todo' | |
| position | int default 0 | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### renders
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| project_id | uuid FK projects nullable | |
| prompt | text nullable | |
| ambiance | text nullable CHECK IN ('jour','nuit') | |
| weather | text nullable | |
| style | text nullable | |
| reference_url | text nullable | |
| image_url | text nullable | |
| status | text CHECK IN ('pending','done','error') default 'pending' | |
| created_at | timestamptz | |

### plans
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| surface | int | |
| bedrooms | int | |
| levels | int | |
| budget | text CHECK IN ('Économique','Moyen de gamme','Haut de gamme') | |
| variants | jsonb | |
| input_data | jsonb nullable | Données questionnaire Mini Archi |
| created_at | timestamptz | |

## Helper Functions

- `set_updated_at()` — trigger function pour updated_at
- `handle_new_user()` — auto-crée profile on auth.users insert
- `is_studio_member(studio_id, user_id)` — security definer
- `is_studio_admin(studio_id, user_id)` — security definer

## Storage Buckets

- `renders` — privé, organisé par `{userId}/{uuid}.png`, RLS ownership
- `uploads` — privé
