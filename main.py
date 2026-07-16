from contextlib import asynccontextmanager
import os
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

# API CONTRACT
# GET /api/todos
#   response: [{"id": number, "title": string, "completed": boolean}]
# POST /api/todos
#   request:  {"title": string}
#   response: 201 {"id": number, "title": string, "completed": boolean}
# PATCH /api/todos/{id}
#   request:  {"title"?: string, "completed"?: boolean}
#   response: {"id": number, "title": string, "completed": boolean}
# DELETE /api/todos/{id}
#   response: 204 no body

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class TodoCreate(BaseModel):
    title: str = Field(min_length=1)


class TodoPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    completed: bool | None = None


class TodoOut(BaseModel):
    id: int
    title: str
    completed: bool

    model_config = {"from_attributes": True}


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/todos", response_model=list[TodoOut])
async def list_todos(db: Session = Depends(get_db)) -> list[Todo]:
    return db.query(Todo).order_by(Todo.id.asc()).all()


@app.post("/api/todos", response_model=TodoOut, status_code=201)
async def create_todo(body: TodoCreate, db: Session = Depends(get_db)) -> Todo:
    todo = Todo(title=body.title.strip(), completed=False)
    db.add(todo)
    db.flush()
    return todo


@app.patch("/api/todos/{todo_id}", response_model=TodoOut)
async def update_todo(todo_id: int, body: TodoPatch, db: Session = Depends(get_db)) -> Todo:
    todo = db.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    if body.title is not None:
        todo.title = body.title.strip()
    if body.completed is not None:
        todo.completed = body.completed
    return todo


@app.delete("/api/todos/{todo_id}", status_code=204)
async def delete_todo(todo_id: int, db: Session = Depends(get_db)) -> None:
    todo = db.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    return None
