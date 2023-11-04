const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
    joinUser,
    getCurrentUser,
    userLeave,
    getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);

const io = socketio(server);

// Setting static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatBot";

// Run when client connects
io.on("connection", (socket) => {
    socket.on("joinRoom", ({ username, room }) => {
        const user = joinUser(socket.id, username, room);
        socket.join(user.room);

        socket.emit("message", formatMessage(botName, "Welcome to the chat."));

        socket.broadcast
            .to(user.room)
            .emit(
                "message",
                formatMessage(botName, `${user.username} has joined the chat`)
            );

        // Send all users in a room
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
        });
    });

    // Listen for chats
    socket.on("chat", (msg) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("message", formatMessage(user.username, msg));
    });

    // When client disconnects
    socket.on("disconnect", () => {
        const user = userLeave(socket.id);
        if (user) {
            io.to(user.room).emit(
                "message",
                formatMessage(botName, `${user.username} has left the Chat`)
            );

            // Send all users in a room
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room),
            });
        }
    });
});

const PORT = 3000 | process.env.PORT;
const start = () =>
    server.listen(PORT, () => `Server running on port ${PORT}...`);

start();
