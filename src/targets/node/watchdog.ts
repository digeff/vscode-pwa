// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as net from 'net';
import { WebSocketTransport, PipeTransport } from '../../cdp/transport';

const info = JSON.parse(process.env.NODE_INSPECTOR_INFO!);


function debugLog(text: string) {
  // require('fs').appendFileSync(require('path').join(require('os').homedir(), 'watchdog.txt'), `WATCHDOG [${info.pid}] ${text} (${info.scriptName})\n`);
}

process.on('exit', () => {
  debugLog('KILL');
  process.kill(+info.pid);
});

(async() => {
  debugLog('CONNECTED TO TARGET');
  let server: PipeTransport;
  let pipe: any;
  await new Promise(f => pipe = net.createConnection(process.env.NODE_INSPECTOR_IPC!, f));
  server = new PipeTransport(pipe);

  const targetInfo = {
    targetId: info.pid,
    type: info.waitForDebugger ? 'waitingForDebugger' : '',
    title: info.scriptName,
    url: 'file://' + info.scriptName,
    openerId: info.ppid
  };

  server.send(JSON.stringify({ method: 'Target.targetCreated', params: { targetInfo } }));
  debugLog('CONNECTED TO SERVER');

  let target: WebSocketTransport | undefined;

  server.onmessage = async data => {
    if (!data.includes('Target.attachToTarget') && !data.includes('Target.detachFromTarget')) {
      target!.send(data);
      return;
    }

    let result = {};
    const object = JSON.parse(data);

    if (object.method === 'Target.attachToTarget') {
      debugLog('ATTACH TO TARGET');
      if (target) {
        target.close();
        target = undefined;
      }
      target = await WebSocketTransport.create(info.inspectorURL);
      target.onmessage = data => server.send(data);
      target.onclose = () => {
        if (target)  // Could be due us closing.
          server.send(JSON.stringify({ method: 'Target.targetDestroyed', params: { targetId: info.pid, sessionId: info.pid } }));
      };
      result = { sessionId: info.pid };
    } else if (object.method === 'Target.detachFromTarget') {
      debugLog('DETACH FROM TARGET');
      if (target) {
        const t = target;
        target = undefined;
        t.close();
      } else {
        debugLog('DETACH WITHOUT ATTACH');
      }
      result = {};
    } else {
      target!.send(data);
      return;
    }

    server.send(JSON.stringify({ id: object.id, result }));
  };

  server.onclose = () => {
    debugLog('SERVER CLOSED');
    if (target)
      target.close();
  }
})();
