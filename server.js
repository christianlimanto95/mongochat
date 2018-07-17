var app = require("express")();
var http = require("http").Server(app);
const mongo = require("mongodb").MongoClient;
const io = require("socket.io")(http);

// connect to mongo
mongo.connect("mongodb://localhost/mongochat", function(err, database) {
    if (err) throw err;

    console.log("MongoDB connected");

    // connect to Socket.IO
    io.on("connection", function(socket) {
        console.log("Socket IO connected");
        const db = database.db("chats");
        let chat = db.collection("chats");

        // create function to send status
        sendStatus = function(s) {
            socket.emit("status", s);
        };

        // get chats from mongo collection
        chat.find().limit(100).sort({_id: 1}).toArray(function(err, res) {
            if (err) throw err;

            // emit the messages
            socket.emit("output", res);
        });

        // handle input events
        socket.on("input", function(data) {
            let name = data.name;
            let message = data.message;

            // check for name and message
            if (name == "" || message == "") {
                // send error status
                sendStatus("Please enter a name and message");
            } else {
                // insert message
                chat.insert({name: name, message: message}, function() {
                    io.emit("output", [data]);

                    // send status object
                    sendStatus({
                        message: "Message sent",
                        clear: true
                    });
                });
            }
        });

        // handle clear
        socket.on("clear", function(data) {
            // remove all chats from the collection
            chat.remove({}, function() {
                // emit cleared
                socket.emit("cleared");
            });
        });
    });
});

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

http.listen(3000, function() {
    console.log("Listening on 3000");
});