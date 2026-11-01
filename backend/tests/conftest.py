import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import Base
from backend.app.models.tipo_leitor import TipoLeitor
from backend.app.models.usuario_admin import UsuarioAdmin
from backend.app.core.security import get_password_hash

@pytest.fixture
def db_session():
    """Cria banco SQLite em memória isolado para os testes."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Inserir dados essenciais
    tipos = [
        TipoLeitor(id="tipo-aluno", codigo="aluno", nome="Aluno", prazo_dias=7, limite_emprestimos=3, max_renovacoes=2),
        TipoLeitor(id="tipo-professor", codigo="professor", nome="Professor", prazo_dias=15, limite_emprestimos=5, max_renovacoes=3),
        TipoLeitor(id="tipo-publico", codigo="publico", nome="Público", prazo_dias=7, limite_emprestimos=2, max_renovacoes=1),
    ]
    session.add_all(tipos)

    admin = UsuarioAdmin(id="admin-1", usuario="admin", senha_hash=get_password_hash("admin123"))
    session.add(admin)
    session.commit()

    try:
        yield session
    finally:
        session.close()
