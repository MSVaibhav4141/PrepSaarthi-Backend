const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require("express");
const allowedOrigin = [process.env.ALLOWEDORIGIN1,process.env.ALLOWEDORIGIN2];
const app = express();
const server = createServer(app);
const cors = require("cors");
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const mentorRoute = require("./routes/metorRoute");
const studentRoute = require("./routes/studentRoute");
const rateLimit = require("express-rate-limit");
const counter = require("./routes/counter.js");
const paymentRoute = require("./routes/paymentRoute");
const bodyParser = require("body-parser"); 
const fileUpload = require("express-fileupload");
const errorCatcher = require("./utils/errorCatcher");
const cookieParser = require("cookie-parser");
const { chatService } = require("./chatService/chatController.js");
const connectedUsers = new Map();
const onlineUsers = new Map();
const openedChat = new Map();
app.use(
  cors({
    credentials: true,
    origin:  allowedOrigin
  })
);
app.get('/v1/health', (req, res) => {
  res.status(200).json({ message: 'Backend is connected!' });
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again after 15 minutes'
// });

// app.use(limiter);

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(fileUpload({
//   limits: { fileSize: 10 * 1024 * 1024 },
// }));
// Route Import

app.use("/v1", counter);
app.use("/v1", mentorRoute);
app.use("/v1", studentRoute);
app.use("/v1", paymentRoute);
io.on("connection", (socket) => {
  chatService({io, socket,openedChat, connectedUsers, onlineUsers});
});

// io.on("connection", (socket) => {
//   console.log("User Connected", socket.id);

//   socket.on('message', ({m,room}) => {
//     console.log(m)
//     socket.to(room).emit('recive', m)
//   })
//   socket.on('room', ({room, prev}) => {
//     socket.join(room)
//     socket.leave(prev)
//   })
//   socket.on("disconnect", () => {
//     console.log("User Disconnected", socket.id);
//   });
// });
app.use(errorCatcher);

module.exports = server;
