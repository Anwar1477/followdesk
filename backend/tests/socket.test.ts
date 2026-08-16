import http from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';
import { initSocket } from '../src/sockets';

let httpServer: http.Server;
let baseUrl: string;

beforeAll((done) => {
  httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(0, () => {
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  httpServer.close(() => done());
});

function connect(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

describe('Socket.IO', () => {
  it('rejects a connection with no token', (done) => {
    const socket = ioClient(baseUrl, { transports: ['websocket'], forceNew: true });
    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication required/);
      socket.close();
      done();
    });
    socket.on('connect', () => {
      socket.close();
      done(new Error('should not have connected without a token'));
    });
  });

  it('rejects joining a workspace the user is not a member of', async () => {
    const owner = await registerUser('SocketOwner');
    const outsider = await registerUser('SocketOutsider');
    const workspace = await createWorkspaceFor(owner);

    const socket = await connect(outsider.accessToken);
    const ack: { ok: boolean; error?: string } = await new Promise((resolve) => {
      socket.emit('workspace:join', workspace._id, resolve);
    });

    expect(ack.ok).toBe(false);
    socket.close();
  });

  it('joins a workspace room and receives a task.created event in real time', async () => {
    const admin = await registerUser('SocketAdmin');
    const workspace = await createWorkspaceFor(admin);

    const socket = await connect(admin.accessToken);
    const ack: { ok: boolean } = await new Promise((resolve) => {
      socket.emit('workspace:join', workspace._id, resolve);
    });
    expect(ack.ok).toBe(true);

    const eventPromise = new Promise((resolve) => socket.once('task.created', resolve));

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Socket Project', key: 'SOC' })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: projectRes.body.data._id, title: 'Realtime task' })
      .expect(201);

    const event = (await eventPromise) as { title: string };
    expect(event.title).toBe('Realtime task');

    socket.close();
  });
});
