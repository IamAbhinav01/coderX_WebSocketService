const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const cache = new Redis();

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'], 
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  
  socket.emit('foo', `Welcome user ${socket.id}`);

  socket.on('setUserId', async (userId) => {
    await cache.set(userId, socket.id);
    console.log(`UserID ${userId} mapped to socket ${socket.id}`);
  });

  socket.on('getConnectionId', async (userId) => {
    const connectionID = await cache.get(userId);
    socket.emit('connectionId', connectionID);
  });

  socket.on('foo', (msg) => {
    console.log('foo event received:', msg);

    
    io.emit('foo', msg);
  });

  socket.on('create-something', (msg, callback) => {
    console.log('create-something event received:', msg);
    
    io.emit('foo', msg);
    if (typeof callback === 'function') {
      callback();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.post('/sendPayload', async (req, res) => {
  const { userId, payload } = req.body;

  if (!userId || !payload) {
    return res.status(400).send('Invalid request');
  }

  const socketId = await cache.get(userId);

  if (socketId) {
    io.to(socketId).emit('foo', payload);
    return res.send('Payload sent successfully');
  } else {
    return res.status(404).send('User not connected');
  }
});

httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
