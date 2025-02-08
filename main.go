package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/thedevsaddam/renderer"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"
)

var rnd *renderer.Render
var client *mongo.Client
var db *mongo.Database

const (
	dbName         string = "golang-todo"
	collectionName string = "todo"
)

type (
	TodoModel struct {
		ID        primitive.ObjectID `bson:"_id,omitempty"`
		Title     string             `bson:"title"`
		Completed bool               `bson:"completed"`
		CreatedAt time.Time          `bson:"created_at"`
	}

	Todo struct {
		ID        string    `json:"id"`
		Title     string    `json:"title"`
		Completed bool      `json:"completed"`
		CreatedAt time.Time `json:"created_at"`
	}

	GetTodoResponse struct {
		Message string `json:"message"`
		Data    []Todo `json:"data"`
	}

	CreateTodo struct {
		Title string `json:"title"`
	}

	UpdateTodo struct {
		Title     string `json:"title"`
		Completed bool   `json:"completed"`
	}
)

func init() {
	fmt.Println("init function running")

	rnd = renderer.New()

	var err error

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err = mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	checkError(err)

	err = client.Ping(ctx, readpref.Primary())
	checkError(err)

	db = client.Database(dbName)
}

func homeHandler(rw http.ResponseWriter, r *http.Request) {
	filePath := "./README.md"
	err := rnd.FileView(rw, http.StatusOK, filePath, "readme.md")

	checkError(err)
}

func getTodos(rw http.ResponseWriter, r *http.Request) {
	var todoListFromDB = []TodoModel{}
	filter := bson.D{}

	cursor, err := db.Collection(collectionName).Find(context.Background(), filter)

	if err != nil {
		log.Printf("Failed to fetch todo records from the db: %v\n", err.Error())
		rnd.JSON(rw, http.StatusBadRequest, renderer.M{
			"message": "Could not fetch the todo collection",
			"error":   err.Error(),
		})

		return
	}

	todoList := []Todo{}

	if err = cursor.All(context.Background(), &todoListFromDB); err != nil {
		checkError(err)
	}

	// Iterate through database list, convert TodoModel to JSON and append to list
	for _, td := range todoListFromDB {
		todoList = append(todoList, Todo{
			ID:        td.ID.Hex(),
			Title:     td.Title,
			Completed: td.Completed,
			CreatedAt: td.CreatedAt,
		})

		rnd.JSON(rw, http.StatusOK, GetTodoResponse{
			Message: "All todos retrieved",
			Data:    todoList,
		})
	}
}

func createTodo(rw http.ResponseWriter, r *http.Request) {
	var todoReq CreateTodo

	if err := json.NewDecoder(r.Body).Decode(&todoReq); err != nil {
		log.Printf("Failed to decode JSON data: %v\n", err.Error())
		rnd.JSON(rw, http.StatusBadRequest, renderer.M{
			"message": "Failed to decode JSON data",
		})
		return
	}

	if todoReq.Title == "" {
		log.Println("No title added to response body")
		rnd.JSON(rw, http.StatusBadRequest, renderer.M{
			"message": "Title is required",
		})
		return
	}

	// Create a TodoModel for adding to the database
	todoModel := TodoModel{
		ID:        primitive.NewObjectID(),
		Title:     todoReq.Title,
		Completed: false,
		CreatedAt: time.Now(),
	}

	// Add to the database
	data, err := db.Collection(collectionName).InsertOne(r.Context(), todoModel)

	if err != nil {
		log.Printf("Failed to insert data: %v\n", err.Error())
		rnd.JSON(rw, http.StatusInternalServerError, renderer.M{
			"message": "Failed to insert data",
			"error":   err.Error(),
		})
		return
	}

	rnd.JSON(rw, http.StatusCreated, renderer.M{
		"message": "Todo created successfully",
		"ID":      data.InsertedID,
	})
}

func updateTodo(rw http.ResponseWriter, r *http.Request) {
	// Get the ID from the URL
	id := strings.TrimSpace(chi.URLParam(r, "id"))

	res, err := primitive.ObjectIDFromHex(id)

	if err != nil {
		log.Printf("Failed to parse id: %v\n", err.Error())
		rnd.JSON(rw, http.StatusBadRequest, renderer.M{
			"message": "Failed to parse id",
			"error":   err.Error(),
		})
		return
	}

	var updateTodoReq UpdateTodo

	if err := json.NewDecoder(r.Body).Decode(&updateTodoReq); err != nil {
		log.Printf("Failed to decode JSON data: %v\n", err.Error())
		rnd.JSON(rw, http.StatusBadRequest, err.Error())
	}

	if updateTodoReq.Title == "" {
		rnd.JSON(rw, http.StatusBadRequest, renderer.M{
			"message": "Title is required",
		})
		return
	}

	// Update in the database
	filter := bson.M{"_id": res}
	update := bson.M{"$set": bson.M{"title": updateTodoReq.Title, "completed": updateTodoReq.Completed}}
	data, err := db.Collection(collectionName).UpdateOne(r.Context(), filter, update)

	if err != nil {
		log.Printf("Failed to update database: %v\n", err.Error())
		rnd.JSON(rw, http.StatusInternalServerError, renderer.M{
			"message": "Failed to update database",
			"error":   err.Error(),
		})
		return
	}

	rnd.JSON(rw, http.StatusOK, renderer.M{
		"message": "Updated successfully",
		"data":    data.ModifiedCount,
	})
}

func deleteTodo(rw http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	res, err := primitive.ObjectIDFromHex(id)

	if err != nil {
		log.Printf("Failed to parse id: %v\n", err.Error())
		rnd.JSON(rw, http.StatusBadRequest, err.Error())
		return
	}

	filter := bson.M{"id": res}

	if data, err := db.Collection(collectionName).DeleteOne(r.Context(), filter); err != nil {
		log.Printf("Failed to delete from database: %v\n", err.Error())
		rnd.JSON(rw, http.StatusInternalServerError, renderer.M{
			"message": "Failed to delete data",
			"error":   err.Error(),
		})
	} else {
		rnd.JSON(rw, http.StatusOK, renderer.M{
			"message": "Deleted successfully",
			"data":    data,
		})
	}
}

func main() {
	router := chi.NewRouter()
	router.Use(middleware.Logger)

	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	router.Handle("/static/*", http.StripPrefix("/static/", fs))

	router.Get("/", homeHandler)
	router.Mount("/todo", todoHandlers())

	server := &http.Server{
		Addr:         ":9000",
		Handler:      router,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
	}

	// Create a channel to receive signal
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt)

	// Start server in a separate go routine
	go func() {
		fmt.Println("Server started on port", 9000)

		if err := server.ListenAndServe(); err != nil {
			log.Printf("listen: %s\n", err)
		}
	}()

	sig := <-stopChan
	log.Printf("Signal received: %v\n", sig)

	if err := client.Disconnect(context.Background()); err != nil {
		panic(err)
	}

	// Create a context with a timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown failed: %v\n", err)
	}

	log.Println("Server shutdown gracefully")
}

func todoHandlers() http.Handler {
	router := chi.NewRouter()
	router.Group(func(r chi.Router) {
		r.Get("/", getTodos)
		r.Post("/", createTodo)
		r.Post("/{id}", updateTodo)
		r.Post("/{id}", deleteTodo)
	})

	return router
}

func checkError(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
