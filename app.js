const mongoose = require('mongoose')
const dotenv = require('dotenv')
const uuid = require('uuid')
const app = require('./app');
const http = require('http').Server(app)
var io = require('socket.io')(http)
io.set('transports', ['websocket'])
const port = process.env.PORT || 3000

dotenv.config({ path: './config/config.env' })

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
]

const rooms = {}

const joinRoom = (socket, room) => {
    room.sockets.push(socket.id)
    socket.join(room.roomId, () => {
        socket.roomId = room.roomId
    })
    io.sockets.in(room.roomId).emit('joinRoom', room)
}

io.on('connection', socket => {

    socket.on('move', (data) => {
        const room = rooms[data.roomId]
        if (socket.id === room.sockets[room.nextMove] && room.moves[data.boxId] === '') {
            room.moves[data.boxId] = room.nextMove === 0 ? room.player1Icon : room.player2Icon

            io.sockets.in(room.roomId).emit('move', {
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
            roomId: getRoomId(),
            sockets: [],
            ready1: false,
            ready2: false,
            moves: ['', '', '', '', '', '', '', '', ''],
            nextMove: 0,
            player1Icon: '',
            player2Icon: '',
        }
        rooms[room.roomId] = room
        joinRoom(socket, room)
        io.sockets.to(socket.id).emit('createRoom', room)
        console.log(rooms[room.roomId]);
    })

    socket.on('getRooms', () => {
        io.sockets.to(socket.id).emit('roomList', rooms)
    })

    socket.on('joinRoom', (data) => {
        const room = rooms[data.roomId]
        if (room != undefined) {
            joinRoom(socket, room)
            console.log(rooms[room.roomId]);
        }
    })

    socket.on('ready', (data) => {
        const room = rooms[data.roomId]
        if (room.sockets.length === 2) {
            if (room.ready1 || room.ready2) {
                // start game
                startGame(socket, room)
            } else {
                if (room.sockets[0] == socket.id)
                    room.ready1 = true
                else
                    room.ready2 = true
                io.sockets.in(room.roomId).emit('ready', room)
            }
        }
    })

    socket.on('choose', (data) => {
        const room = rooms[data.roomId]
        room.player1Icon = room.nextMove === 0 ? data.icon1 : data.icon2
        room.player2Icon = room.nextMove === 0 ? data.icon2 : data.icon1
        io.sockets.in(room.roomId).emit('start', {
            player1: room.sockets[0],
            player2: room.sockets[1],
            icon1: room.player1Icon,
            icon2: room.player2Icon
        })
        nextMove(socket, room)
    })
})

const checkResult = (socket, room) => {
    winPatterns.forEach(p => {
        var arr = []
        p.forEach(box => {
            arr.push(room.moves[box])
        })
        if (arr.filter(a => a == 'X').length == 3 || arr.filter(a => a == 'O').length == 3) {
            // Winnner is decided
            var winner = arr[0]
            io.sockets.to(room.roomId).emit('result', {
                winner: winner
            })
            return
        }
    })
    if (room.moves.filter(m => m === '').size == 0) {
        io.sockets.to(room.roomId).emit('result', {
            winner: 'no result'
        })
        return
    }
    nextMove(socket, room)
}

const startGame = (socket, room) => {
    room.ready1 = true
    room.ready2 = true
    io.sockets.in(room.roomId).emit('ready', room)
    const rnd = Math.floor(Math.random() * 2)
    room.nextMove = rnd
    chooseIcon(room.sockets[rnd], room)
    console.log(room)
    console.log('start game')
}

const nextMove = (socket, room) => {
    io.sockets.in(room.roomId).emit('nextMove', {
        playerId: room.sockets[room.nextMove],
        icon: room.nextMove === 0 ? room.player1Icon : room.player2Icon
    })
    console.log(room);
}

const chooseIcon = (id, room) => {
    io.sockets.in(room.roomId).emit('choose', {
        playerId: room.sockets[room.nextMove]
    })
}

const getRoomId = () => {
    var result = ''
    for (var i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * 26))
    }
    return result
}

const server = http.listen(port, () => {
    console.log(`app running on port ${port}`);
})
