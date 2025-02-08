"use strict";
const localHostAddress = "http://localhost:9000/todo";
let isEditingTask = false;
let isComplete = false;
let editButtonTodoID = "";
const newTodoInput = document.querySelector("#new-todo input");
let submitButton = document.querySelector("#submit");
async function getTodos() {
    try {
        const response = await fetch(localHostAddress);
        const responseData = await response.json();
        return responseData.data;
    }
    catch (error) {
        console.error("Error:", error);
        return "Could not get todos: " + error;
    }
}
async function createTodo(data) {
    try {
        const response = await fetch(localHostAddress, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log("Success:", result.message);
    }
    catch (error) {
        console.error("Error:", error);
    }
}
async function deleteTodo(TodoID) {
    try {
        const response = await fetch(`${localHostAddress}/${TodoID}`, {
            method: "DELETE",
        });
        const result = await response.json();
        console.log("Success:", result.message);
    }
    catch (error) {
        console.error("Error:", error);
    }
}
async function updateTodo(id, data) {
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
    }
    catch (error) {
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
    if (isEditingTask)
        await updateTodo(editButtonTodoID, data);
    await displayTodos();
    newTodoInput.value = "";
    isEditingTask = true;
    submitButton.innerHTML = "Add";
}
async function displayTodos() {
    let todoList = await getTodos();
    if (typeof todoList == "string") {
        console.error(todoList);
        todoList = [];
    }
    let todoListContainer = document.querySelector("#todos");
    todoListContainer.innerHTML = "";
    if (todoList.length == 0) {
        todoListContainer.innerHTML += `
            <div class="todo">
                <span>You do not have any tasks</span>
            </div>
        `;
    }
    else {
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
        });
        deleteTaskButton();
        editTaskTitleButton();
        toggleTaskCompletion();
    }
}
displayTodos();
function deleteTaskButton() {
    const deleteTodoButtons = Array.from(document.querySelectorAll(".delete"));
    for (const deleteButton of deleteTodoButtons) {
        deleteButton.onclick = async function () {
            const todoID = deleteButton.getAttribute("data-id") || "";
            await deleteTodo(todoID);
            await displayTodos();
        };
    }
}
function editTaskTitleButton() {
    var _a, _b;
    const editTodoTitleButtons = Array.from(document.querySelectorAll(".edit"));
    for (const editButton of editTodoTitleButtons) {
        const todoName = (_b = (_a = editButton.parentNode) === null || _a === void 0 ? void 0 : _a.parentNode) === null || _b === void 0 ? void 0 : _b.children[0];
        editButton.onclick = async function () {
            var _a;
            newTodoInput.value = todoName.innerText;
            submitButton.innerHTML = "Edit";
            isEditingTask = true;
            editButtonTodoID = (_a = editButton.getAttribute("data-id")) !== null && _a !== void 0 ? _a : "";
            isComplete = JSON.parse(todoName.getAttribute("data-iscomplete"));
        };
    }
}
function toggleTaskCompletion() {
    const editTaskCompleted = Array.from(document.querySelectorAll("#todoname"));
    for (const task of editTaskCompleted) {
        task.onclick = async function () {
            var _a;
            const isTaskDone = JSON.parse(task.getAttribute("data-iscomplete"));
            const todoID = (_a = task.getAttribute("data-id")) !== null && _a !== void 0 ? _a : "";
            const data = { title: task.innerText, completed: !isTaskDone };
            await updateTodo(todoID, data);
            await displayTodos();
        };
    }
}
submitButton.addEventListener("click", async () => isEditingTask ? editTask() : addTask());
//# sourceMappingURL=script.js.map