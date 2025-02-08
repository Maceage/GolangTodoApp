const localHostAddress = "http://localhost:9000/todo";

let isEditingTask = false;
let isComplete = false;
let editButtonTodoID = "";

const newTodoInput = document.querySelector("#new-todo input") as HTMLInputElement;
let submitButton = document.querySelector("#submit") as HTMLButtonElement;

interface Todo {
    id: string;
    title: string;
    completed: boolean;
    createdAt: number;
}

interface ResponseData {
    message: string;
    data: Todo[];
}

interface CreateTodoResponse {
    message: string;
    dataID: string;
}

async function getTodos() {
    try {
        const response = await fetch(localHostAddress);
        const responseData: ResponseData = await response.json();
        return responseData.data;
    } catch (error) {
        console.error("Error:", error);
        return "Could not get todos: " + error;
    }
}

async function createTodo(data: { title: string }) {
    try {
        const response = await fetch(localHostAddress, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result: CreateTodoResponse = await response.json();
        console.log("Success:", result.message);
    } catch(error) {
        console.error("Error:", error);
    }
}

async function deleteTodo(TodoID: string) {
    try {
        const response = await fetch(`${localHostAddress}/${TodoID}`, {
            method: "DELETE",
        });

        const result = await response.json();
        console.log("Success:", result.message);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function updateTodo(id: string, data: {title: string, completed: boolean}) {
    try {
        const response = await fetch(`${localHostAddress}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        console.log("Success:", result);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function addTask() {
    const data = { title: newTodoInput.value };
    await createTodo(data);
    await displayTodos();

    newTodoInput.value = "";
}

async function editTask() {
    const data = { title: newTodoInput.value, completed: isComplete };
    if (isEditingTask) await updateTodo(editButtonTodoID, data);
    await displayTodos();

    newTodoInput.value = "";
    isEditingTask = true;
    submitButton.innerHTML = "Add";
}

async function displayTodos() {
    let todoList = await getTodos();

    if(typeof todoList == "string") {
        console.error(todoList);
        todoList = [];
    }

    let todoListContainer = document.querySelector("#todos") as HTMLDivElement;
    todoListContainer.innerHTML = "";

    if (todoList.length == 0) {
        todoListContainer.innerHTML += `
            <div class="todo">
                <span>You do not have any tasks</span>
            </div>
        `;
    } else {
        todoList.forEach((todo) => {
            todoListContainer.innerHTML += `
                <div class="todo">
                    <span
                        id="todoname"
                        style="text-decoration: ${todo.completed ? 'line-through' : ''}"
                        data-iscomplete="${todo.completed}"
                        data-id="${todo.id}">
                        ${todo.title}
                    </span>
                    
                    <div class="actions">
                        <button class="edit" data-id="${todo.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete" data-id="${todo.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        })

        deleteTaskButton();
        editTaskTitleButton();
        toggleTaskCompletion();
    }
}

displayTodos();

function deleteTaskButton() {
    const deleteTodoButtons: HTMLButtonElement[] = Array.from(
        document.querySelectorAll(".delete")
    );

    for(const deleteButton of deleteTodoButtons) {
        deleteButton.onclick = async function () {
            const todoID = deleteButton.getAttribute("data-id") || "";
            await deleteTodo(todoID);
            await displayTodos();
        };
    }
}

function editTaskTitleButton() {
    const editTodoTitleButtons: HTMLButtonElement[] = Array.from(
        document.querySelectorAll(".edit")
    );

    for (const editButton of editTodoTitleButtons) {
        const todoName = editButton.parentNode?.parentNode?.children[0] as HTMLSpanElement;

        editButton.onclick = async function () {
            newTodoInput.value = todoName.innerText;
            submitButton.innerHTML = "Edit";
            isEditingTask = true;

            editButtonTodoID = editButton.getAttribute("data-id") ?? "";

            isComplete = JSON.parse(todoName.getAttribute("data-iscomplete") as string);
        }
    }
}

function toggleTaskCompletion() {
    const editTaskCompleted: HTMLSpanElement[] = Array.from(
        document.querySelectorAll("#todoname")
    );

    for (const task of editTaskCompleted) {
        task.onclick = async function () {
            const isTaskDone = JSON.parse(task.getAttribute("data-iscomplete") as string);
            const todoID = task.getAttribute("data-id") ?? "";

            const data = { title: task.innerText, completed: !isTaskDone };
            await updateTodo(todoID, data);

            await displayTodos();
        }
    }
}

submitButton.addEventListener("click", async () => isEditingTask ? editTask() : addTask())