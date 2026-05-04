from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
import logging

from autogen.beta import Agent, config, Toolkit, middleware

logging.basicConfig(level=logging.INFO)

TODO_DIR = Path("./todos")
TODO_DIR.mkdir(exist_ok=True)


todo_toolkit = Toolkit()

@dataclass
class TodoItem:
    time: datetime
    title: str

    @property
    def filename(self) -> Path:
        return TODO_DIR / f"{self.time.isoformat()}__{self.title}.txt"

    @classmethod
    def from_filename(cls, filename: Path) -> "TodoItem":
        time, name = filename.name.split("__")
        return cls(time=datetime.fromisoformat(time), title=name)


@dataclass
class TodoDetails(TodoItem):
    description: str


@todo_toolkit.tool
def list_todos() -> list[TodoItem]:
    """List all TODO items"""
    return [TodoItem.from_filename(todo_file) for todo_file in TODO_DIR.glob("*.txt")]


@todo_toolkit.tool
def read_todo(item: TodoItem) -> str:
    """Get full details of a TODO item"""
    return item.filename.read_text()


@todo_toolkit.tool
def remove_todo(item: TodoItem) -> str:
    """Remove a TODO item from the list"""
    item.filename.unlink()
    return f"TODO: {item.title} removed"


@todo_toolkit.tool
def add_todo(item: TodoDetails) -> str:
    """Add a TODO item to the list"""
    item.filename.write_text(item.description)
    return f"TODO: {item.title} added"


agent = Agent(
    "todo-agent",
    prompt=(
        "You are a TODO list manager agent. "
        "You should be able to add, remove, and update TODO items. "
        "You should be able to save the TODO list to a file and load it from a file."
    ),
    config=config.OpenAIResponsesConfig("gpt-5-mini"),
    middleware=[middleware.LoggingMiddleware()],
    tools=[todo_toolkit],
)


async def main():
    result = await agent.ask(
        "I need to buy groceries tomorrow at 10:00 AM. 10 apples, 5 oranges, and 3 bananas."
    )
    print(await result.content())

    result = await agent.ask(
        "Check my TODO list and tell me what should I do tomorrow?"
    )
    print(await result.content())


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
