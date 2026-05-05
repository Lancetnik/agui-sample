from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
import logging
from typing import Annotated

from autogen.beta import Agent, config, Toolkit, middleware, Variable
from autogen.beta.ag_ui import AGUIStream

logging.basicConfig(level=logging.INFO)

TODO_DIR = Path("./todos")
TODO_DIR.mkdir(exist_ok=True)


todo_toolkit = Toolkit()


@dataclass
class TodoView:
    time: datetime
    title: str


@dataclass
class TodoItem(TodoView):
    user_id: str
    time: datetime
    title: str

    def __post_init__(self):
        # Just in case, remove the .txt suffix from the title
        self.title = self.title.removesuffix(".txt")

    @property
    def user_todo_dir(self) -> Path:
        user_dir = TODO_DIR / self.user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    @property
    def filename(self) -> Path:
        return self.user_todo_dir / f"{self.time.isoformat()}__{self.title}.txt"

    @classmethod
    def from_filename(cls, user_id: str, filename: Path) -> "TodoItem":
        time, name = filename.name.split("__")
        return cls(
            user_id=user_id,
            time=datetime.fromisoformat(time),
            title=name.removesuffix(".txt"),
        )


@dataclass
class TodoDetails(TodoView):
    description: str


@todo_toolkit.tool
async def list_todos(user_id: Annotated[str, Variable()]) -> list[TodoItem]:
    """List all TODO items"""
    user_dir = TODO_DIR / user_id
    if not user_dir.exists():
        return []
    return [
        TodoItem.from_filename(user_id, todo_file)
        for todo_file in user_dir.glob("*.txt")
    ]


@todo_toolkit.tool
def read_todo(item: TodoView, user_id: Annotated[str, Variable()]) -> str:
    """Get full details of a TODO item"""
    todo = TodoItem(time=item.time, title=item.title, user_id=user_id)
    return f"{todo.title} - {todo.filename.read_text() or 'No description'}"


@todo_toolkit.tool
def remove_todo(item: TodoView, user_id: Annotated[str, Variable()]) -> str:
    """Remove a TODO item from the list"""
    todo = TodoItem(time=item.time, title=item.title, user_id=user_id)
    todo.filename.unlink()
    return f"{todo.title} removed"


@todo_toolkit.tool
def add_todo(item: TodoDetails, user_id: Annotated[str, Variable()]) -> str:
    """Add a TODO item to the list"""
    todo = TodoItem(time=item.time, title=item.title, user_id=user_id)
    todo.filename.write_text(item.description)
    return f"{todo.title} added"


agent = Agent(
    "todo-agent",
    prompt=(
        "You are a TODO list manager agent. "
        "You should be able to add, remove, and update TODO items. "
        "You should be able to save the TODO list to a file and load it from a file."
    ),
    config=config.OpenAIResponsesConfig("gpt-5", streaming=True),
    middleware=[middleware.LoggingMiddleware()],
    tools=[todo_toolkit],
)


app = AGUIStream(agent)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app.build_asgi(),
        host="0.0.0.0",
        port=8008,
    )
