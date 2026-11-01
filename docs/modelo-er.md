# Modelo Entidade-Relacionamento (ER)

```mermaid
erDiagram
    USUARIO_ADMIN {
        string id PK
        string usuario
        string senha_hash
        datetime criado_em
    }

    TIPO_LEITOR {
        string id PK
        string codigo
        string nome
        int prazo_dias
        int limite_emprestimos
        int max_renovacoes
    }

    LEITOR {
        string id PK
        string nome
        string matricula
        string tipo_leitor_id FK
        string ano
        string sala
        string contato
        boolean ativo
    }

    OBRA {
        string id PK
        string titulo
        string autor
        string editora
        int ano_publicacao
        string isbn
        string categoria
        string tipo_material
        boolean ativo
    }

    EXEMPLAR {
        string id PK
        string obra_id FK
        string codigo_barras UK
        string status
    }

    EMPRESTIMO {
        string id PK
        string exemplar_id FK
        string leitor_id FK
        string data_emprestimo
        string data_prevista
        string data_devolucao
        int renovacoes
        string ano_leitor
        string sala_leitor
    }

    LOG_BACKUP {
        string id PK
        string data
        string destino
        string status
        string mensagem
    }

    LOG_IMPORTACAO {
        string id PK
        string data
        string arquivo
        int linhas_ok
        int linhas_erro
        text detalhes
    }

    TIPO_LEITOR ||--o{ LEITOR : "classifica"
    OBRA ||--|{ EXEMPLAR : "possui"
    LEITOR ||--o{ EMPRESTIMO : "realiza"
    EXEMPLAR ||--o{ EMPRESTIMO : "e_emprestado"
```

## Regras de Integridade e Snapshots
- **Snapshot de Ano e Sala**: No momento do empréstimo, os valores de `ano` e `sala` do leitor são copiados para as colunas `ano_leitor` e `sala_leitor` do registro de `EMPRESTIMO`. Isso garante que relatórios históricos e estatísticas por turma permaneçam precisos mesmo após o aluno mudar de série ou sala.
