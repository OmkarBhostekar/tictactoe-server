const mongoose = require('mongoose')
const dotenv = require('dotenv')
const uuid = require('uuid')
const app = require('./app');
const http = require('http').Server(app)
var io = require('socket.io')(http);
const port = process.env.PORT || 3000

dotenv.config({ path: './config/config.env' })

const rooms = {}

const joinRoom = (socket, room) => {
    room.sockets.push(socket.id)
    socket.join(room.id, () => {
        socket.roomId = room.id
    })
    io.sockets.in(room.id).emit('status', `${socket.id} joined ${room.id}`)
}

io.on('connection', socket => {

    socket.on('move', (data) => {
        const room = rooms[data.roomId]
        if (socket.id === room.sockets[room.nextMove] && room.moves[data.boxId] === '') {
            room.moves[data.boxId] = room.nextMove === 0 ? room.player1Icon : room.player2Icon

            io.sockets.in(room.id).emit('move', {
                boxId: data.boxId,
                player: socket.id
            })

            if (room.nextMove === 0) {
                room.nextMove = 1
            } else {
                room.nextMove = 0
            }
            checkResult(socket, room)
            console.log(room.moves);
        }
    })

    socket.on('createRoom', (data) => {
        const room = {
            id: uuid.v1(),
            name: data.roomName,
            sockets: [],
            ready1: false,
            ready2: false,
            moves: ['', '', '', '', '', '', '', '', ''],
            nextMove: 0,
            player1Icon: '',
            player2Icon: '',
        }
        rooms[room.id] = room
        joinRoom(socket, room)
        console.log(rooms[room.id]);
    })

    socket.on('getRooms', () => {
        io.sockets.to(socket.id).emit('roomList', rooms)
    })

    socket.on('joinRoom', (data) => {
        const room = rooms[data.roomId]
        joinRoom(socket, room)
        console.log(rooms[room.id]);
    })

    socket.on('ready', (data) => {
        const room = rooms[data.roomId]
        if (room.sockets.length === 2) {
            if (room.ready1) {
                // start game
                startGame(socket, room)
            } else {
                room.ready1 = true
                io.sockets.in(room.id).emit('status', 'player 1 is ready')
            }
        }
    })

    socket.on('choose', (data) => {
        const room = rooms[data.roomId]
        room.player1Icon = room.nextMove === 0 ? data.icon1 : data.icon2
        room.player2Icon = room.nextMove === 0 ? data.icon2 : data.icon1
        nextMove(socket, room)
    })
})

const checkResult = (socket, room) => {
    // TODO implement result check logic
    nextMove(socket, room)
}

const startGame = (socket, room) => {
    io.sockets.in(room.id).emit('status', 'start game')
    const rnd = Math.floor(Math.random() * 2)
    room.nextMove = rnd
    chooseIcon(room.sockets[rnd], room)
    console.log(room)
    console.log('start game')
}

const nextMove = (socket, room) => {
    io.sockets.in(room.id).emit('nextMove', {
        playerId: room.sockets[room.nextMove]
    })
    console.log(room);
}

const chooseIcon = (id, room) => {
    io.sockets.to(id).emit('choose', {
        playerId: room.sockets[room.nextMove]
    })
}

const server = http.listen(port, () => {
    console.log(`app running on port ${port}`);
})